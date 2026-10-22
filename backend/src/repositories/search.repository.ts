import { databasePool } from "../config/database";

export interface GlobalSearchResults {
  orders: Array<{
    id: string;
    code: string;
    engineBrand: string;
    engineModel: string;
    clientName: string;
    status: string;
  }>;
  clients: Array<{
    id: string;
    fullName: string;
    identificationType: string;
    identification: string;
    phone: string | null;
    email: string | null;
  }>;
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  inventory: Array<{
    id: string;
    code: string;
    name: string;
    brand: string | null;
    category: string;
    stock: number;
  }>;
}

export class SearchRepository {
  async search(term: string): Promise<GlobalSearchResults> {
    const pattern = `%${term}%`;

    const [ordersResult, clientsResult, usersResult, inventoryResult] = await Promise.all([
      databasePool.query(
        `SELECT o.id, o.code, o.engine_brand, o.engine_model, o.status, c.full_name AS client_name
         FROM work_orders o
         JOIN clients c ON c.id = o.client_id
         WHERE o.code ILIKE $1 OR o.engine_brand ILIKE $1 OR o.engine_model ILIKE $1 OR o.engine_serial ILIKE $1 OR c.full_name ILIKE $1
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [pattern]
      ),
      databasePool.query(
        `SELECT id, full_name, identification_type, identification, phone, email
         FROM clients
         WHERE full_name ILIKE $1 OR identification ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [pattern]
      ),
      databasePool.query(
        `SELECT id, full_name, email, role, is_active
         FROM app_users
         WHERE full_name ILIKE $1 OR email ILIKE $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [pattern]
      ),
      databasePool.query(
        `SELECT id, sku AS code, name, category, brand, stock_quantity AS stock
         FROM inventory_items
         WHERE sku ILIKE $1 OR name ILIKE $1 OR brand ILIKE $1
         ORDER BY name ASC
         LIMIT 5`,
        [pattern]
      )
    ]);

    return {
      orders: ordersResult.rows.map((row) => ({
        id: row.id,
        code: row.code,
        engineBrand: row.engine_brand,
        engineModel: row.engine_model,
        clientName: row.client_name,
        status: row.status
      })),
      clients: clientsResult.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        identificationType: row.identification_type,
        identification: row.identification,
        phone: row.phone,
        email: row.email
      })),
      users: usersResult.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        isActive: row.is_active
      })),
      inventory: inventoryResult.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        brand: row.brand,
        category: row.category,
        stock: Number(row.stock)
      }))
    };
  }
}

