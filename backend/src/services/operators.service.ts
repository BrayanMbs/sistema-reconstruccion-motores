import { UserRepository } from "../repositories/user.repository";
import { WorkOrderRepository } from "../repositories/work-order.repository";
export class OperatorsService { private readonly users = new UserRepository(); private readonly orders = new WorkOrderRepository(); async list() { const operators = await this.users.list(undefined, "OPERATOR", "true", 1, 100); return Promise.all(operators.items.map(async (operator) => ({ ...operator, activeOrders: await this.orders.workerWorkload(operator.id) }))); } }
