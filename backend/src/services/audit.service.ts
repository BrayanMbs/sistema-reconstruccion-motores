import type { PoolClient } from "pg";
import { AuditRepository } from "../repositories/audit.repository";

export class AuditService {
  private readonly repository = new AuditRepository();
  record(actorId: string | undefined, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>, client?: PoolClient) {
    return this.repository.record({ actorId, action, entityType, entityId, details }, client);
  }
  list(filters: { userId?: string; action?: string; from?: string; to?: string; page: number; limit: number }) { return this.repository.list(filters); }
  recent(limit = 5) { return this.repository.recent(limit); }
}
