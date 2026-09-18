import { createSupabaseAdminClient } from "../config/supabase";
import type { CreateUserDto, UpdateUserDto } from "../dtos/admin.dtos";
import type { Role } from "../models/domain";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { AuditService } from "./audit.service";

export class UserService {
  private readonly users = new UserRepository(); private readonly audit = new AuditService();
  list(search: string | undefined, role: string | undefined, active: string | undefined, page: number, limit: number) { return this.users.list(search, role, active, page, limit); }
  async get(id: string) { const user = await this.users.findById(id); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); return user; }
  async create(input: CreateUserDto, actorId: string) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new AppError("Ya existe un usuario con este correo en el sistema", 409, "USER_ALREADY_EXISTS");
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new AppError("La administración de Supabase no está configurada", 503, "AUTH_ADMIN_NOT_CONFIGURED");
    const created = await supabase.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
    let authUser = created.data.user;
    let createdAuthUser = Boolean(authUser);

    if (created.error && /already (been )?registered/i.test(created.error.message)) {
      const existingAuth = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (existingAuth.error) throw new AppError(existingAuth.error.message, 500, "AUTH_LIST_FAILED");
      authUser = existingAuth.data.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase()) ?? null;
      createdAuthUser = false;
      if (authUser) {
        const updated = await supabase.auth.admin.updateUserById(authUser.id, { password: input.password, email_confirm: true });
        if (updated.error) throw new AppError(updated.error.message, 409, "AUTH_USER_UPDATE_FAILED");
      }
    }

    if (created.error && !authUser) throw new AppError(created.error.message, 409, "AUTH_USER_CREATE_FAILED");
    if (!authUser) throw new AppError("No se pudo crear la cuenta de acceso", 409, "AUTH_USER_CREATE_FAILED");

    try { const user = await this.users.create({ id: authUser.id, fullName: input.fullName, email: input.email, role: input.role, isActive: true }); await this.audit.record(actorId, "USER_CREATED", "USER", user.id, { role: user.role }); return user; }
    catch (error) { if (createdAuthUser) await supabase.auth.admin.deleteUser(authUser.id); throw error; }
  }
  async update(id: string, updates: UpdateUserDto, actorId: string) { const user = await this.users.update(id, updates); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, "USER_UPDATED", "USER", id, updates); return user; }
  async updateRole(id: string, role: Role, actorId: string) { const user = await this.users.update(id, { role }); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, "USER_ROLE_CHANGED", "USER", id, { role }); return user; }
  async updateStatus(id: string, isActive: boolean, actorId: string) { if (id === actorId && !isActive) throw new AppError("No puedes inactivar tu propia cuenta", 409, "SELF_DEACTIVATION"); const user = await this.users.update(id, { isActive }); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", "USER", id); return user; }
}
