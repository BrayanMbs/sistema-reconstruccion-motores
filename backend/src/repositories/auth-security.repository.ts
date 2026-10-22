import { databasePool } from "../config/database";

export type AttemptType = "ACCOUNT" | "IP";

export interface LockStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingSeconds: number;
  failedAttempts: number;
}

interface InMemoryRecord {
  failedAttempts: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
}

export class AuthSecurityRepository {
  private static inMemoryFallback = new Map<string, InMemoryRecord>();

  private shouldFallbackImmediately(): boolean {
    return process.env.VITEST === "true" && process.env.TEST_WITH_REAL_DB !== "true";
  }

  private getMemoryKey(identifier: string, attemptType: AttemptType): string {
    return `${attemptType}:${identifier.toLowerCase().trim()}`;
  }

  private getStatusFromMemory(
    identifier: string,
    attemptType: AttemptType,
    maxAttempts: number,
    windowMinutes: number
  ): LockStatus {
    const key = this.getMemoryKey(identifier, attemptType);
    const now = new Date();
    const record = AuthSecurityRepository.inMemoryFallback.get(key);

    if (!record) {
      return { isLocked: false, lockedUntil: null, remainingSeconds: 0, failedAttempts: 0 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000);
      return { isLocked: true, lockedUntil: record.lockedUntil, remainingSeconds, failedAttempts: record.failedAttempts };
    }

    const windowMs = windowMinutes * 60 * 1000;
    if (now.getTime() - record.lastAttemptAt.getTime() > windowMs) {
      AuthSecurityRepository.inMemoryFallback.delete(key);
      return { isLocked: false, lockedUntil: null, remainingSeconds: 0, failedAttempts: 0 };
    }

    const isLocked = record.failedAttempts >= maxAttempts;
    return { isLocked, lockedUntil: null, remainingSeconds: 0, failedAttempts: record.failedAttempts };
  }

  private recordFailedAttemptInMemory(
    identifier: string,
    attemptType: AttemptType,
    maxAttempts: number,
    windowMinutes: number,
    lockoutDurationMinutes: number
  ): LockStatus {
    const key = this.getMemoryKey(identifier, attemptType);
    const now = new Date();
    const record = AuthSecurityRepository.inMemoryFallback.get(key);
    const windowMs = windowMinutes * 60 * 1000;
    let newAttempts = 1;
    let lockedUntil: Date | null = null;

    if (record) {
      if ((record.lockedUntil && record.lockedUntil <= now) || (now.getTime() - record.lastAttemptAt.getTime() > windowMs)) {
        newAttempts = 1;
      } else {
        newAttempts = record.failedAttempts + 1;
      }
    }

    if (newAttempts >= maxAttempts) {
      lockedUntil = new Date(now.getTime() + lockoutDurationMinutes * 60 * 1000);
    }

    AuthSecurityRepository.inMemoryFallback.set(key, {
      failedAttempts: newAttempts,
      lockedUntil,
      lastAttemptAt: now
    });

    const remainingSeconds = lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0;
    return {
      isLocked: newAttempts >= maxAttempts,
      lockedUntil,
      remainingSeconds,
      failedAttempts: newAttempts
    };
  }

  async getLockStatus(
    identifier: string,
    attemptType: AttemptType,
    maxAttempts: number,
    windowMinutes: number
  ): Promise<LockStatus> {
    const cleanId = identifier.toLowerCase().trim();

    if (this.shouldFallbackImmediately()) {
      return this.getStatusFromMemory(cleanId, attemptType, maxAttempts, windowMinutes);
    }

    const now = new Date();

    try {
      const result = await databasePool.query(
        `SELECT failed_attempts, locked_until, last_attempt_at
         FROM public.auth_login_attempts
         WHERE identifier = $1 AND attempt_type = $2`,
        [cleanId, attemptType]
      );

      if (result.rows.length === 0) {
        return { isLocked: false, lockedUntil: null, remainingSeconds: 0, failedAttempts: 0 };
      }

      const row = result.rows[0];
      const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
      const lastAttemptAt = new Date(row.last_attempt_at);
      const failedAttempts = Number(row.failed_attempts);

      if (lockedUntil && lockedUntil > now) {
        const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
        return { isLocked: true, lockedUntil, remainingSeconds, failedAttempts };
      }

      const windowMs = windowMinutes * 60 * 1000;
      if (now.getTime() - lastAttemptAt.getTime() > windowMs) {
        return { isLocked: false, lockedUntil: null, remainingSeconds: 0, failedAttempts: 0 };
      }

      const isLocked = failedAttempts >= maxAttempts;
      return { isLocked, lockedUntil: null, remainingSeconds: 0, failedAttempts };
    } catch {
      return this.getStatusFromMemory(cleanId, attemptType, maxAttempts, windowMinutes);
    }
  }

  async recordFailedAttempt(
    identifier: string,
    attemptType: AttemptType,
    maxAttempts: number,
    windowMinutes: number,
    lockoutDurationMinutes: number
  ): Promise<LockStatus> {
    const cleanId = identifier.toLowerCase().trim();

    if (this.shouldFallbackImmediately()) {
      return this.recordFailedAttemptInMemory(
        cleanId,
        attemptType,
        maxAttempts,
        windowMinutes,
        lockoutDurationMinutes
      );
    }

    const now = new Date();

    try {
      const existing = await databasePool.query(
        `SELECT failed_attempts, locked_until, last_attempt_at
         FROM public.auth_login_attempts
         WHERE identifier = $1 AND attempt_type = $2`,
        [cleanId, attemptType]
      );

      const windowMs = windowMinutes * 60 * 1000;
      let newAttempts = 1;
      let lockedUntil: Date | null = null;

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const lastAttempt = new Date(row.last_attempt_at);
        const prevLockedUntil = row.locked_until ? new Date(row.locked_until) : null;

        if ((prevLockedUntil && prevLockedUntil <= now) || (now.getTime() - lastAttempt.getTime() > windowMs)) {
          newAttempts = 1;
        } else {
          newAttempts = Number(row.failed_attempts) + 1;
        }
      }

      if (newAttempts >= maxAttempts) {
        lockedUntil = new Date(now.getTime() + lockoutDurationMinutes * 60 * 1000);
      }

      await databasePool.query(
        `INSERT INTO public.auth_login_attempts (identifier, attempt_type, failed_attempts, locked_until, last_attempt_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (identifier, attempt_type)
         DO UPDATE SET
           failed_attempts = $3,
           locked_until = $4,
           last_attempt_at = $5`,
        [cleanId, attemptType, newAttempts, lockedUntil, now]
      );

      const remainingSeconds = lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0;
      return {
        isLocked: newAttempts >= maxAttempts,
        lockedUntil,
        remainingSeconds,
        failedAttempts: newAttempts
      };
    } catch {
      return this.recordFailedAttemptInMemory(
        cleanId,
        attemptType,
        maxAttempts,
        windowMinutes,
        lockoutDurationMinutes
      );
    }
  }

  async recordSuccessfulLogin(identifier: string, attemptType: AttemptType): Promise<void> {
    const cleanId = identifier.toLowerCase().trim();

    if (this.shouldFallbackImmediately()) {
      const key = this.getMemoryKey(cleanId, attemptType);
      AuthSecurityRepository.inMemoryFallback.delete(key);
      return;
    }

    try {
      await databasePool.query(
        `DELETE FROM public.auth_login_attempts WHERE identifier = $1 AND attempt_type = $2`,
        [cleanId, attemptType]
      );
    } catch {
      const key = this.getMemoryKey(cleanId, attemptType);
      AuthSecurityRepository.inMemoryFallback.delete(key);
    }
  }

  async unlockIdentifier(identifier: string, attemptType: AttemptType = "ACCOUNT"): Promise<void> {
    await this.recordSuccessfulLogin(identifier, attemptType);
  }

  static resetInMemory(): void {
    AuthSecurityRepository.inMemoryFallback.clear();
  }
}
