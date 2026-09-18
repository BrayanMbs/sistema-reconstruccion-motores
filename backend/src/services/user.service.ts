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

    let userId: string;
    let isNewAuthUser = false;

    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true
    });

    if (error) {
      if (error.message.toLowerCase().includes("already been registered") || error.message.toLowerCase().includes("already registered")) {
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw new AppError(listError.message, 500, "AUTH_LIST_FAILED");
        const found = listData.users.find((u) => u.email?.toLowerCase() === input.email.toLowerCase());
        if (!found) {
          throw new AppError(error.message, 409, "AUTH_USER_CONFLICT");
        }
        await supabase.auth.admin.updateUserById(found.id, { password: input.password });
        userId = found.id;
      } else {
        throw new AppError(error.message, 409, "AUTH_USER_CREATE_FAILED");
      }
    } else if (data.user) {
      userId = data.user.id;
      isNewAuthUser = true;
    } else {
      throw new AppError("No se pudo crear la cuenta de acceso", 409, "AUTH_USER_CREATE_FAILED");
    }

    try {
      const user = await this.users.create({
        id: userId,
        fullName: input.fullName,
        email: input.email,
        role: input.role,
        isActive: true
      });
      await this.audit.record(actorId, "USER_CREATED", "USER", user.id, { role: user.role });
      return user;
    } catch (createError) {
      if (isNewAuthUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      throw createError;
    }
  }
  async update(id: string, updates: UpdateUserDto, actorId: string) { const user = await this.users.update(id, updates); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, "USER_UPDATED", "USER", id, updates); return user; }
  async updateRole(id: string, role: Role, actorId: string) { const user = await this.users.update(id, { role }); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, "USER_ROLE_CHANGED", "USER", id, { role }); return user; }
  async updateStatus(id: string, isActive: boolean, actorId: string) { if (id === actorId && !isActive) throw new AppError("No puedes inactivar tu propia cuenta", 409, "SELF_DEACTIVATION"); const user = await this.users.update(id, { isActive }); if (!user) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND"); await this.audit.record(actorId, isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", "USER", id); return user; }
}
