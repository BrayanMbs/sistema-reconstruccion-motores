import { createSupabaseClient } from "../config/supabase";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";

export class AuthService {
  private readonly users = new UserRepository();

  async signIn(email: string, password: string) {
    const client = createSupabaseClient();
    if (!client) throw new AppError("Supabase Auth no está configurado", 503, "AUTH_NOT_CONFIGURED");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    const user = await this.assertActiveProfile(data.user.id);
    return { user, session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at } };
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
