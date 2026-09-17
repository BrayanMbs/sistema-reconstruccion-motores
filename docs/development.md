# Estado de desarrollo — `develop`

Última actualización: 17 de septiembre de 2026.

La rama `develop` contiene la implementación administrativa integrada en los commits `bfbbc07` y `c371dff`. El árbol de trabajo debe permanecer limpio antes de iniciar una tarea nueva.

## Módulos disponibles

| Módulo | Qué permite hacer |
| --- | --- |
| Autenticación | Iniciar sesión con Supabase y validar que el perfil esté activo y tenga rol `ADMIN`. |
| Dashboard | Consultar métricas de usuarios, clientes, órdenes y actividad reciente. |
| Usuarios y roles | Crear, editar, activar/inactivar usuarios y asignar los roles Administrador, Administrativo, Cajero, Inventario u Operativo. |
| Clientes | Registrar, buscar y consultar clientes. |
| Órdenes de trabajo | Crear órdenes, consultar su detalle y filtrar por estado. |
| Personal operativo | Ver técnicos activos, su carga de órdenes abiertas y las órdenes que tienen asignadas. |
| Inventario | Crear artículos, consultar existencias y detectar stock bajo. |
| Asignación operativa | Desde el detalle de una orden, asignar un trabajador operativo y agregar o retirar insumos. Al asignar un insumo se descuenta el stock; al retirarlo se devuelve. |
| Finanzas | Registrar y listar pagos asociados a una orden y su cliente. |
| Reportes | Ver el resumen de órdenes, inventario, pagos y cobertura de asignaciones. |
| Configuración | Guardar nombre, teléfono y dirección del taller, moneda e impuesto. |
| Auditoría | Consultar los eventos administrativos registrados por el backend. |
| Portal operativo | El técnico consulta únicamente sus órdenes, inicia y actualiza reparaciones, registra observaciones, finaliza trabajos, consulta actividad y lee notificaciones. |

## Relación entre módulos

```text
Usuario con rol OPERATOR ──┐
                            ├─> Orden de trabajo <─> Cliente
Inventario ────────────────┘           │
                                      ├─> Insumos asignados (descuentan existencias)
                                      └─> Pagos / Finanzas

Todos los cambios relevantes ──> Auditoría
Reportes ──> consolida órdenes, inventario, asignaciones y pagos
```

## Cambios de datos y API

- Se agregó `assigned_worker_id` a `work_orders`.
- Se incorporaron las tablas `inventory_items`, `work_order_inventory`, `payments` y `app_settings` mediante `backend/database/migrations/002_admin_operations.sql`.
- La migración `003_operational_workflow.sql` agrega prioridad, fechas de inicio/finalización, historial operativo y notificaciones persistentes.
- Las asignaciones de inventario se ejecutan en transacción y rechazan cantidades mayores a la existencia disponible.
- Las nuevas rutas administrativas son:
  - `GET /api/admin/operators`
  - `GET|POST /api/admin/inventory`
  - `GET|POST|DELETE /api/admin/work-orders/:id/inventory`
  - `PATCH /api/admin/work-orders/:id/assignee`
  - `GET|POST /api/admin/payments`
  - `GET /api/admin/reports/summary`
  - `GET|PUT /api/admin/settings`
  - Rutas seguras bajo `/api/operativo` para dashboard, órdenes propias, historial, avances, finalización, actividad y notificaciones.

La especificación completa de rutas está en [api.md](api.md).

## Estructura relevante

- `backend/database/migrations/`: estructura y cambios de PostgreSQL.
- `backend/src/controllers`, `services` y `repositories`: API y persistencia por módulo.
- `frontend/src/app/(admin)/admin/`: rutas de las pantallas administrativas.
- `frontend/src/modules/`: componentes funcionales por módulo.
- `docs/primeros-pasos.md`: instalación y uso inicial.

## Validación realizada

- Backend: `npm run lint`, `npm run build`, `npm run test` — 4 pruebas aprobadas.
- Frontend: `npm run lint`, `npm run build`, `npm run test` — 1 prueba aprobada.
- La migración administrativa fue aplicada y verificada en PostgreSQL local.

## Consideraciones pendientes

- Se requiere un proyecto Supabase accesible por red para autenticarse y aprovisionar usuarios desde la interfaz.
- Antes de producir facturas o cálculos contables definitivos, deben definirse reglas de impuestos, precios y estados operativos adicionales.
- Los archivos `.env` y las claves de Supabase no se versionan ni deben compartirse en documentación o commits.
