# API

La API se sirve bajo `/api` y responde JSON.

## Health

### `GET /api/health`

Request: sin parámetros.

Respuesta `200 OK`:

```json
{
  "status": "UP",
  "service": "sistema-reconstruccion-motores"
}
```

## Próximos módulos

Las rutas futuras se documentarán aquí, incluyendo contrato, autorización y errores:

- Auth
- Users
- Clients
- Workers
- Work Orders
- Inventory
- Finance
- Reports
- Audit
- Tracking
