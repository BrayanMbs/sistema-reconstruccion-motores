import { env } from "../config/env";
import { createSupabaseClient } from "../config/supabase";
import { AuthSecurityRepository } from "../repositories/auth-security.repository";
import { UserRepository } from "../repositories/user.repository";
import { AuditService } from "./audit.service";
import { AppError } from "../utils/app-error";

export class AuthService {
  private readonly users = new UserRepository();
  private readonly security = new AuthSecurityRepository();
  private readonly audit = new AuditService();

  async signIn(email: string, password: string, clientIp?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Account lockout check
    const accountLock = await this.security.getLockStatus(
      normalizedEmail,
      "ACCOUNT",
      env.auth.maxFailedAttempts,
      env.auth.lockoutWindowMinutes
    );

    if (accountLock.isLocked) {
      const waitMinutes = Math.max(1, Math.ceil(accountLock.remainingSeconds / 60));
      await this.audit.record(
        undefined,
        "AUTH_LOGIN_BLOCKED",
        "AUTH",
        undefined,
        { email: normalizedEmail, reason: "account_locked", remainingSeconds: accountLock.remainingSeconds }
      ).catch(() => {});
      throw new AppError(
        `Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por seguridad. Intenta nuevamente en ${waitMinutes} minuto(s).`,
        429,
        "ACCOUNT_LOCKED",
        { remainingSeconds: accountLock.remainingSeconds, retryAfter: accountLock.remainingSeconds }
      );
    }

    // 2. IP rate limit check (distributed protection)
    if (clientIp && clientIp !== "unknown") {
      const ipLock = await this.security.getLockStatus(
        clientIp,
        "IP",
        env.auth.ipRateLimitMax,
        env.auth.lockoutWindowMinutes
      );

      if (ipLock.isLocked) {
        const waitMinutes = Math.max(1, Math.ceil(ipLock.remainingSeconds / 60));
        await this.audit.record(
          undefined,
          "AUTH_IP_BLOCKED",
          "AUTH",
          undefined,
          { ip: clientIp, remainingSeconds: ipLock.remainingSeconds }
        ).catch(() => {});
        throw new AppError(
          `Demasiados intentos de inicio de sesión desde esta dirección IP. Intenta nuevamente en ${waitMinutes} minuto(s).`,
          429,
          "IP_RATE_LIMITED",
          { remainingSeconds: ipLock.remainingSeconds, retryAfter: ipLock.remainingSeconds }
        );
      }
    }

    // 3. Supabase Auth authentication
    const client = createSupabaseClient();
    if (!client) throw new AppError("Supabase Auth no está configurado", 503, "AUTH_NOT_CONFIGURED");

    let authData;
    let authError;
    try {
      const res = await client.auth.signInWithPassword({ email: normalizedEmail, password });
      authData = res.data;
      authError = res.error;
    } catch {
      authError = new Error("Auth service exception");
    }

    if (authError || !authData?.user || !authData?.session) {
      const failedAccount = await this.security.recordFailedAttempt(
        normalizedEmail,
        "ACCOUNT",
        env.auth.maxFailedAttempts,
        env.auth.lockoutWindowMinutes,
        env.auth.lockoutDurationMinutes
      );

      if (clientIp && clientIp !== "unknown") {
        await this.security.recordFailedAttempt(
          clientIp,
          "IP",
          env.auth.ipRateLimitMax,
          env.auth.lockoutWindowMinutes,
          env.auth.lockoutDurationMinutes
        );
      }

      await this.audit.record(
        undefined,
        failedAccount.isLocked ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILED",
        "AUTH",
        undefined,
        {
          email: normalizedEmail,
          attempts: failedAccount.failedAttempts,
          isLocked: failedAccount.isLocked
        }
      ).catch(() => {});

      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    // 4. Assert active profile (prevents enumeration if user is inactive or missing)
    const user = await this.users.findById(authData.user.id);
    if (!user || !user.isActive) {
      await this.security.recordFailedAttempt(
        normalizedEmail,
        "ACCOUNT",
        env.auth.maxFailedAttempts,
        env.auth.lockoutWindowMinutes,
        env.auth.lockoutDurationMinutes
      );
      if (clientIp && clientIp !== "unknown") {
        await this.security.recordFailedAttempt(
          clientIp,
          "IP",
          env.auth.ipRateLimitMax,
          env.auth.lockoutWindowMinutes,
          env.auth.lockoutDurationMinutes
        );
      }
      await this.audit.record(
        undefined,
        "AUTH_LOGIN_FAILED",
        "AUTH",
        authData.user.id,
        { email: normalizedEmail, reason: !user ? "profile_missing" : "user_inactive" }
      ).catch(() => {});
      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    // 5. Successful login resets counters
    await this.security.recordSuccessfulLogin(normalizedEmail, "ACCOUNT");
    if (clientIp && clientIp !== "unknown") {
      await this.security.recordSuccessfulLogin(clientIp, "IP");
    }

    await this.audit.record(
      user.id,
      "AUTH_LOGIN_SUCCESS",
      "AUTH",
      user.id,
      { email: user.email }
    ).catch(() => {});

    return {
      user,
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at
      }
    };
  }

  async authenticateToken(token: string) {
    const client = createSupabaseClient();
    if (!client) throw new AppError("Supabase Auth no está configurado", 503, "AUTH_NOT_CONFIGURED");
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new AppError("Sesión no válida o expirada", 401, "INVALID_SESSION");
    return this.assertActiveProfile(data.user.id);
  }

  private async assertActiveProfile(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new AppError("El usuario no está registrado en el sistema", 403, "PROFILE_NOT_FOUND");
    if (!user.isActive) throw new AppError("El usuario está inactivo", 403, "USER_INACTIVE");
    return user;
  }
}
