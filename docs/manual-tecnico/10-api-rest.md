# 10 API REST

La base de URL es el origen del backend; la mayoría de recursos comienza por `/api`. El [catálogo completo](anexo-endpoints.md) enumera métodos, rutas, acceso del router y archivo/línea del commit. Para un contrato de campos, consulte los DTO y validadores enlazados; no existe un esquema OpenAPI versionado comprobado.

## Convenciones y errores

Las entradas son JSON salvo filtros query. Los recursos privados requieren `Authorization: Bearer <TOKEN_DE_DESARROLLO>`. Cada controller define la envoltura de salida; no existe un envelope universal. Listados suelen usar `items` y `total`; autenticación usa `user/session`, settings `settings` y resumen reportes `report`. Verifique el controller antes de consumir un recurso.

| HTTP | Situación representativa |
| --- | --- |
| 200 | Consulta o modificación exitosa según controller |
| 201 | Creación en rutas que lo declaran, por ejemplo solicitudes |
| 400 | JSON inválido |
| 401 | Falta Bearer, sesión inválida o credenciales inválidas |
| 403 | Rol, contraseña temporal, perfil o propiedad no autorizados |
| 404 | Ruta o recurso inexistente |
| 409 | Conflicto de estado o duplicidad |
| 413 | Cuerpo excesivo |
| 422 | Validación o regla de negocio |
| 429 | Límite/bloqueo; Retry-After cuando se informa |
| 500/502/503/504 | Fallo interno, proveedor, configuración/dependencia o timeout según caso |

Ejemplo exacto de liveness, sin base de datos:

```http
GET /health
```

```json
{"status":"UP","service":"sistema-reconstruccion-motores"}
```

Ejemplo exacto de error común sin sesión:

```http
GET /api/admin/dashboard
```

```json
{"message":"Se requiere una sesión válida","code":"AUTH_REQUIRED"}
```

## Contratos de referencia

Login acepta `email` y `password`. La respuesta incluye `user` y `session` con `accessToken`, `refreshToken`, `expiresAt`; esos valores se omiten de ejemplos persistentes. `/api/auth/me` devuelve `{ user: ... }`; cambio temporal recibe `{ newPassword: ... }`.

Alta de orden, ejemplo ficticio derivado de `CreateWorkOrderDto`; el UUID debe pertenecer a un cliente de pruebas existente:

```http
POST /api/admin/work-orders
Content-Type: application/json
Authorization: Bearer <TOKEN_DE_DESARROLLO>
```

```json
{
  "clientId":"00000000-0000-4000-8000-000000000001",
  "engineBrand":"Marca de ejemplo",
  "engineModel":"Modelo de ejemplo",
  "serviceType":"Reconstrucción",
  "description":"Orden ficticia para documentación",
  "priority":"NORMAL"
}
```

La creación fuerza PENDING desde el servicio; no use el campo status para alterar el ciclo operativo. Actualización general no es un endpoint arbitrario para cambiar estado. Operación usa `/orders/:id/start`, `/progress` con `progress/observation` y `/complete` con observación.

Tracking acepta este ejemplo ficticio de formato, que no asegura encontrar una orden:

```json
{"orderNumber":"OT-2026-00001","trackingCode":"MTR-000000000000000000000000"}
```

En caja, abrir recibe `openingAmount`; cerrar recibe `countedCash`, `sessionId` y `notes` si hay diferencia. Solicitar repuesto recibe `orderId`, `itemId`, `quantity`, `reason`; revisar recibe `decision` APPROVED/REJECTED, `unitPrice` para aprobar y `note` obligatorio para rechazar. Respuesta de revisión: `{ id, status, chargeAmount }`.

Reportes ADMIN ofrece `summary`, `orders`, `clients`, `inventory`, `inventory/movements`, `finance` y `export`. Fechas se envían como `startDate/endDate`, paginación `page/limit` y otros filtros dependen del tipo. Exportación recibe `reportType` orders, clients, inventory, inventory-movements o finance; devuelve CSV UTF-8 y cabeceras `X-Export-Total`, `X-Export-Count`, `X-Export-Truncated`. El límite de exportación es 5000 filas. No se encontró exportación PDF implementada.

Referencias: [DTO general](../../backend/src/dtos/admin.dtos.ts), [DTO inventario](../../backend/src/dtos/inventory.dtos.ts), [DTO finanzas](../../backend/src/dtos/finance.dtos.ts), [validación reportes](../../backend/src/validators/reports.validators.ts), [controllers](../../backend/src/controllers/reports.controller.ts), [API histórica](../api.md).
