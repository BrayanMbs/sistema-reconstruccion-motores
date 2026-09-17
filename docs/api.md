# API

La API se sirve bajo `/api` y responde JSON. Las rutas `/api/admin/*` requieren un token Bearer válido de Supabase, perfil activo en `app_users` y rol `ADMIN`.

## Health

### `GET /api/health`

No requiere parámetros ni sesión. Responde `200`:

```json
{ "status": "UP", "service": "sistema-reconstruccion-motores" }
```

## Auth

- `POST /api/auth/login`: valida email y contraseña mediante Supabase Auth; rechaza perfiles inactivos o roles no administrativos.
- `GET /api/auth/me`: devuelve el perfil de aplicación del token actual.

## Administración

- `GET /api/admin/dashboard`: métricas reales de usuarios, clientes, órdenes y actividad reciente.
- `GET|POST /api/admin/users`: lista filtrable y alta de cuentas mediante Supabase Auth.
- `GET|PATCH /api/admin/users/:id`: detalle y actualización de nombre/rol.
- `PATCH /api/admin/users/:id/role`: cambio explícito de rol.
- `PATCH /api/admin/users/:id/status`: activa o inactiva un perfil; no permite auto-inactivación.
- `GET /api/admin/clients` y `GET /api/admin/clients/:id`: consulta y búsqueda de clientes.
- `GET|POST /api/admin/work-orders` y `GET /api/admin/work-orders/:id`: supervisión, detalle y alta de órdenes.
- `GET /api/admin/audit`: historial de solo lectura, filtrable por usuario, operación y fechas.

Las respuestas de error no incluyen secretos ni trazas. Se utilizan `400/401/403/404/409/422/500` según corresponda.
