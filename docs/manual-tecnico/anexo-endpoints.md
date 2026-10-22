# Catálogo de endpoints

Inventario estático de las declaraciones de rutas del commit auditado. Los permisos particulares y contratos se explican en [API](10-api-rest.md). `ADMIN` no hereda acceso a las áreas administrativa y operativa.

| Método | Ruta | Acceso del router | Evidencia |
| --- | --- | --- | --- |
| GET | /health | Público | backend/src/app.ts |
| GET | /api/admin/dashboard | ADMIN | backend/src/routes/admin.routes.ts:33 |
| GET | /api/admin/search | ADMIN | backend/src/routes/admin.routes.ts:34 |
| GET | /api/admin/users | ADMIN | backend/src/routes/admin.routes.ts:35 |
| POST | /api/admin/users | ADMIN | backend/src/routes/admin.routes.ts:35 |
| GET | /api/admin/users/:id | ADMIN | backend/src/routes/admin.routes.ts:36 |
| PATCH | /api/admin/users/:id | ADMIN | backend/src/routes/admin.routes.ts:36 |
| PATCH | /api/admin/users/:id/role | ADMIN | backend/src/routes/admin.routes.ts:37 |
| PATCH | /api/admin/users/:id/status | ADMIN | backend/src/routes/admin.routes.ts:37 |
| POST | /api/admin/users/:id/reset-password | ADMIN | backend/src/routes/admin.routes.ts:38 |
| GET | /api/admin/clients | ADMIN | backend/src/routes/admin.routes.ts:39 |
| POST | /api/admin/clients | ADMIN | backend/src/routes/admin.routes.ts:39 |
| GET | /api/admin/clients/:id | ADMIN | backend/src/routes/admin.routes.ts:39 |
| PUT | /api/admin/clients/:id | ADMIN | backend/src/routes/admin.routes.ts:39 |
| GET | /api/admin/clients/:id/work-orders | ADMIN | backend/src/routes/admin.routes.ts:39 |
| GET | /api/admin/work-orders | ADMIN | backend/src/routes/admin.routes.ts:40 |
| POST | /api/admin/work-orders | ADMIN | backend/src/routes/admin.routes.ts:40 |
| GET | /api/admin/work-orders/:id | ADMIN | backend/src/routes/admin.routes.ts:40 |
| PUT | /api/admin/work-orders/:id | ADMIN | backend/src/routes/admin.routes.ts:40 |
| GET | /api/admin/work-orders/:id/history | ADMIN | backend/src/routes/admin.routes.ts:40 |
| GET | /api/admin/work-orders/:id/timeline | ADMIN | backend/src/routes/admin.routes.ts:40 |
| PATCH | /api/admin/work-orders/:id/assignee | ADMIN | backend/src/routes/admin.routes.ts:40 |
| GET | /api/admin/work-orders/:id/finance | ADMIN | backend/src/routes/admin.routes.ts:41 |
| PATCH | /api/admin/work-orders/:id/finance | ADMIN | backend/src/routes/admin.routes.ts:41 |
| GET | /api/admin/work-orders/:id/payments | ADMIN | backend/src/routes/admin.routes.ts:42 |
| GET | /api/admin/operators | ADMIN | backend/src/routes/admin.routes.ts:43 |
| GET | /api/admin/inventory | ADMIN | backend/src/routes/admin.routes.ts:44 |
| POST | /api/admin/inventory | ADMIN | backend/src/routes/admin.routes.ts:44 |
| GET | /api/admin/work-orders/:id/inventory | ADMIN | backend/src/routes/admin.routes.ts:45 |
| POST | /api/admin/work-orders/:id/inventory | ADMIN | backend/src/routes/admin.routes.ts:45 |
| DELETE | /api/admin/work-orders/:id/inventory/:itemId | ADMIN | backend/src/routes/admin.routes.ts:45 |
| GET | /api/admin/finance/orders | ADMIN | backend/src/routes/admin.routes.ts:46 |
| GET | /api/admin/payments | ADMIN | backend/src/routes/admin.routes.ts:47 |
| POST | /api/admin/payments | ADMIN | backend/src/routes/admin.routes.ts:47 |
| GET | /api/admin/reports/summary | ADMIN | backend/src/routes/admin.routes.ts:48 |
| GET | /api/admin/reports/export | ADMIN | backend/src/routes/admin.routes.ts:49 |
| GET | /api/admin/reports/orders | ADMIN | backend/src/routes/admin.routes.ts:50 |
| GET | /api/admin/reports/clients | ADMIN | backend/src/routes/admin.routes.ts:51 |
| GET | /api/admin/reports/inventory | ADMIN | backend/src/routes/admin.routes.ts:52 |
| GET | /api/admin/reports/inventory/movements | ADMIN | backend/src/routes/admin.routes.ts:53 |
| GET | /api/admin/reports/finance | ADMIN | backend/src/routes/admin.routes.ts:54 |
| GET | /api/admin/settings | ADMIN | backend/src/routes/admin.routes.ts:55 |
| PUT | /api/admin/settings | ADMIN | backend/src/routes/admin.routes.ts:55 |
| GET | /api/admin/audit | ADMIN | backend/src/routes/admin.routes.ts:56 |
| GET | /api/administrativo/dashboard | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:12 |
| GET | /api/administrativo/clients | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:13 |
| POST | /api/administrativo/clients | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:13 |
| GET | /api/administrativo/clients/:id | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:14 |
| PUT | /api/administrativo/clients/:id | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:14 |
| GET | /api/administrativo/clients/:id/work-orders | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:15 |
| GET | /api/administrativo/work-orders | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:16 |
| POST | /api/administrativo/work-orders | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:16 |
| GET | /api/administrativo/work-orders/:id | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:17 |
| PUT | /api/administrativo/work-orders/:id | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:17 |
| GET | /api/administrativo/work-orders/:id/history | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:18 |
| GET | /api/administrativo/work-orders/:id/timeline | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:19 |
| PATCH | /api/administrativo/work-orders/:id/assignee | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:20 |
| GET | /api/administrativo/operators | ADMINISTRATIVE | backend/src/routes/administrative.routes.ts:21 |
| GET | /api/operativo/dashboard | OPERATOR | backend/src/routes/operational.routes.ts:8 |
| GET | /api/operativo/orders | OPERATOR | backend/src/routes/operational.routes.ts:9 |
| GET | /api/operativo/orders/:id | OPERATOR | backend/src/routes/operational.routes.ts:10 |
| GET | /api/operativo/orders/:id/history | OPERATOR | backend/src/routes/operational.routes.ts:11 |
| GET | /api/operativo/orders/:id/timeline | OPERATOR | backend/src/routes/operational.routes.ts:12 |
| POST | /api/operativo/orders/:id/start | OPERATOR | backend/src/routes/operational.routes.ts:13 |
| PATCH | /api/operativo/orders/:id/progress | OPERATOR | backend/src/routes/operational.routes.ts:14 |
| POST | /api/operativo/orders/:id/complete | OPERATOR | backend/src/routes/operational.routes.ts:15 |
| GET | /api/operativo/activity | OPERATOR | backend/src/routes/operational.routes.ts:16 |
| GET | /api/operativo/notifications | OPERATOR | backend/src/routes/operational.routes.ts:17 |
| PATCH | /api/operativo/notifications/:id/read | OPERATOR | backend/src/routes/operational.routes.ts:18 |
| POST | /api/auth/login | Mixto: login público; me/cambio autenticados | backend/src/routes/auth.routes.ts:17 |
| GET | /api/auth/me | Mixto: login público; me/cambio autenticados | backend/src/routes/auth.routes.ts:18 |
| POST | /api/auth/change-temporary-password | Mixto: login público; me/cambio autenticados | backend/src/routes/auth.routes.ts:19 |
| GET | /api/cashier/dashboard | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| GET | /api/cashier/orders | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| GET | /api/cashier/payments | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| GET | /api/cashier/payments/:id | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| POST | /api/cashier/payments | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| GET | /api/cashier/daily-summary | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:10 |
| GET | /api/cashier/orders/:id/summary | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:12 |
| GET | /api/cashier/sessions | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:25 |
| POST | /api/cashier/sessions/open | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:26 |
| POST | /api/cashier/sessions/close | ADMIN, CASHIER | backend/src/routes/cashier.routes.ts:30 |
| GET | /api/inventory/dashboard | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:8 |
| GET | /api/inventory/work-orders | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:9 |
| GET | /api/inventory/items | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:10 |
| POST | /api/inventory/items | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:11 |
| GET | /api/inventory/items/:id | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:12 |
| PATCH | /api/inventory/items/:id | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:13 |
| PATCH | /api/inventory/items/:id/status | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:14 |
| POST | /api/inventory/items/:id/entries | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:15 |
| POST | /api/inventory/items/:id/exits | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:16 |
| GET | /api/inventory/movements | ADMIN, INVENTORY | backend/src/routes/inventory.routes.ts:17 |
| GET | /api/part-requests/catalog | OPERATOR, ADMIN, INVENTORY; restricciones por acción | backend/src/routes/part-request.routes.ts:23 |
| GET | /api/part-requests/ | OPERATOR, ADMIN, INVENTORY; restricciones por acción | backend/src/routes/part-request.routes.ts:26 |
| POST | /api/part-requests/ | OPERATOR, ADMIN, INVENTORY; restricciones por acción | backend/src/routes/part-request.routes.ts:32 |
| POST | /api/part-requests/:id/review | OPERATOR, ADMIN, INVENTORY; restricciones por acción | backend/src/routes/part-request.routes.ts:36 |
| POST | /api/public/orders/tracking | Público | backend/src/routes/public.routes.ts:7 |
| GET | /api/health | Público | backend/src/routes/health.routes.ts:6 |
