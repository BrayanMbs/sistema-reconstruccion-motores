import { ClientRepository } from "../repositories/client.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";

export class AdministrativeDashboardService {
  private readonly clients = new ClientRepository();
  private readonly orders = new WorkOrderRepository();

  async summary() {
    const [clients, orders, upcoming] = await Promise.all([
      this.clients.count(),
      this.orders.dashboardCounts(),
      this.orders.upcoming()
    ]);
    return { clients, orders, upcoming };
  }
}
