# API

La API se sirve bajo `/api` y responde JSON. Las rutas `/api/admin/*` requieren un token Bearer válido de Supabase, perfil activo en `app_users` y rol `ADMIN`.

## Health

### `GET /api/health`

No requiere parámetros ni sesión. Responde `200`:

```json
{ "status": "UP", "service": "sistema-reconstruccion-motores" }
```

## Portal publico de seguimiento

- `POST /api/public/orders/tracking`: no requiere sesion. Recibe `orderNumber` y `trackingCode`; devuelve solo estado, avance, servicio, resumen del motor, fechas y nota publica autorizada.
- Se utiliza `POST` para que el codigo de seguimiento no quede expuesto en la URL, historial del navegador o registros de proxies.
- Una orden inexistente y un codigo incorrecto devuelven el mismo `404` generico. El endpoint admite un maximo de 10 consultas por IP cada 15 minutos.

## Auth

- `POST /api/auth/login`: valida email y contraseña mediante Supabase Auth; rechaza perfiles inactivos o roles no administrativos.
- `GET /api/auth/me`: devuelve el perfil de aplicación del token actual.

## Administración

- `GET /api/admin/dashboard`: métricas reales de usuarios, clientes, órdenes y actividad reciente.
- `GET|POST /api/admin/users`: lista filtrable y alta de cuentas mediante Supabase Auth.
- `GET|PATCH /api/admin/users/:id`: detalle y actualización de nombre/rol.
- `PATCH /api/admin/users/:id/role`: cambio explícito de rol.
- `PATCH /api/admin/users/:id/status`: activa o inactiva un perfil; no permite auto-inactivación.
- `GET|POST /api/admin/clients` y `GET /api/admin/clients/:id`: consulta, búsqueda y alta de clientes. El alta requiere nombre completo, tipo y número de identificación; teléfono, correo y dirección son opcionales.
- `GET|POST /api/admin/work-orders` y `GET /api/admin/work-orders/:id`: supervisión, detalle y alta de órdenes.
- `GET /api/admin/audit`: historial de solo lectura, filtrable por usuario, operación y fechas.
- `GET /api/admin/operators`: personal operativo activo y órdenes asignadas.
- `GET|POST /api/admin/inventory`: catálogo y existencias; `GET|POST|DELETE /api/admin/work-orders/:id/inventory`: insumos asignados a una orden.
- `PATCH /api/admin/work-orders/:id/assignee`: asigna una orden a un usuario operativo activo.
- `GET|POST /api/admin/payments`: ingresos vinculados a órdenes de trabajo.
- `GET /api/admin/reports/summary` y `GET|PUT /api/admin/settings`: indicadores administrativos y configuración de negocio.

Las respuestas de error no incluyen secretos ni trazas. Se utilizan `400/401/403/404/409/422/500` según corresponda.

## Personal operativo

Las rutas `/api/operativo/*` requieren un token válido de un perfil activo con rol `OPERATOR`. El backend filtra las órdenes por `assigned_worker_id`; un trabajador no puede acceder a una orden ajena modificando la URL.

- `GET /api/operativo/dashboard`: métricas y próximas órdenes del trabajador autenticado.
- `GET /api/operativo/orders`: lista paginada con filtros de búsqueda, estado, prioridad y fecha.
- `GET /api/operativo/orders/:id`: detalle operativo de una orden propia.
- `GET /api/operativo/orders/:id/history`: historial acumulado de eventos de esa orden propia.
- `POST /api/operativo/orders/:id/start`: cambia una orden pendiente propia a en proceso.
- `PATCH /api/operativo/orders/:id/progress`: registra avance creciente entre 0 y 100, más observación.
- `POST /api/operativo/orders/:id/complete`: finaliza una orden propia, fija el avance en 100 y registra la observación final.
- `GET /api/operativo/activity`: actividad relacionada exclusivamente con el trabajador autenticado.
- `GET /api/operativo/notifications` y `PATCH /api/operativo/notifications/:id/read`: notificaciones propias y marcado de lectura.
