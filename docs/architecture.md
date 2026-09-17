# Arquitectura

## Visión general

La aplicación usa arquitectura cliente-servidor: **Usuario → Frontend → Backend → PostgreSQL**. El frontend usa REST/JSON para comunicarse con Express y nunca se conecta directamente a la base de datos. La lógica de negocio permanece en el backend.

## Frontend

`frontend/src/app` contiene las rutas, layouts y composición de pantallas de Next.js App Router. Los grupos de rutas separan las áreas auth, public, admin, administrativo, cajero, inventario y operativo.

`frontend/src/modules` organiza funcionalidad por dominio: auth, users, clients, workers, work-orders, inventory, finance, reports, audit y tracking. Cada módulo implementado seguirá esta convención:

```
modules/<modulo>/
├── components/
├── dtos/
├── models/
├── mappers/
├── services/
└── hooks/
```

`frontend/src/shared` alberga componentes reutilizables, hooks transversales, clientes de servicios, tipos y utilidades; no debe recibir lógica propia de un dominio.

Las interfaces deben implementar los diseños aprobados existentes en Stitch. No se debe rediseñar la UI sin acuerdo previo del equipo.

## Backend por capas

El backend separa presentación, aplicación, dominio e infraestructura:

- `controllers`: reciben solicitudes HTTP y devuelven respuestas; no contienen lógica compleja.
- `services`: casos de uso y lógica de negocio.
- `repositories`: acceso a PostgreSQL.
- `dtos`: contratos de entrada y salida.
- `mappers`: conversiones entre persistencia, modelos y DTOs.
- `middlewares`: autenticación, autorización, validación, errores y futuro logging.
- `models`: modelos del dominio.
- `validators`: validaciones reutilizables.
- `config`: variables de entorno, PostgreSQL, CORS y Supabase.
- `routes`: definición de endpoints y conexión con controllers.

Supabase Auth será el proveedor de autenticación. La base incluye el punto de extensión para verificar sus tokens, pero no implementa login, roles ni JWT personalizado. PostgreSQL se configura exclusivamente mediante variables de entorno.

## Implementación administrativa del Issue #1

El backend autentica tokens con Supabase Auth y luego consulta `app_users` en PostgreSQL. El middleware común exige sesión, usuario activo y rol `ADMIN` antes de registrar las rutas administrativas. Las operaciones que cambian usuarios u órdenes crean un evento en `audit_events`; la auditoría solo expone lectura.

La migración `backend/database/migrations/001_issue_1_admin.sql` define `app_users`, `clients`, `work_orders` y `audit_events`. Docker la ejecuta al inicializar un volumen nuevo de PostgreSQL.

## Docker Compose

Docker Compose es una herramienta opcional de desarrollo local. Levanta frontend, backend y PostgreSQL en `motores-network`, con un volumen `postgres_data` y una comprobación de salud de PostgreSQL.

## Trabajo entre tres desarrolladores

Partan del flujo `main → develop → feature/*`. Dividan tickets por módulos y mantengan los contratos DTO/API documentados. Coordinen los cambios en archivos compartidos (rutas raíz, configuración y contratos), y eviten mezclar implementación de dominio con infraestructura o interfaz.
