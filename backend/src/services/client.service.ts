import { ClientRepository } from "../repositories/client.repository";
import { AppError } from "../utils/app-error";
export class ClientService { private readonly clients = new ClientRepository(); list(search: string | undefined, identificationType: string | undefined, page: number, limit: number) { return this.clients.list(search, identificationType, page, limit); } async get(id: string) { const client = await this.clients.findById(id); if (!client) throw new AppError("Cliente no encontrado", 404, "CLIENT_NOT_FOUND"); return client; } }
