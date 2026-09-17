import { ClientRepository } from "../repositories/client.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
import { AuditService } from "./audit.service";
export class DashboardService { private readonly users = new UserRepository(); private readonly clients = new ClientRepository(); private readonly orders = new WorkOrderRepository(); private readonly audit = new AuditService(); async summary() { const [users, clients, orders, recentActivity] = await Promise.all([this.users.dashboardCounts(), this.clients.count(), this.orders.dashboardCounts(), this.audit.recent()]); return { users, clients, orders, recentActivity }; } }
