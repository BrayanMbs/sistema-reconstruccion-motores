# Sistema de Reconstrucción de Motores

Sistema web para centralizar y administrar clientes, órdenes de trabajo, trabajadores operativos, inventario, pagos, información financiera, reportes, auditoría y seguimiento de reparaciones.

## Tecnologías

- **Frontend:** React, Next.js, TypeScript y Tailwind CSS.
- **Backend:** Node.js, Express y TypeScript.
- **Base de datos:** PostgreSQL compartido en Supabase.
- **Configuración compartida:** [docs/migracion-supabase.md](docs/migracion-supabase.md).
- **Autenticación prevista:** Supabase Auth.
- **Pruebas:** Vitest, React Testing Library y Supertest.
- **Infraestructura local:** Docker y Docker Compose.

## Inicio rápido

Desde la raíz del repositorio:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health: http://localhost:8080/api/health

Para detener los servicios:

```bash
docker compose down
```

Para detenerlos y eliminar la base de datos local:

```bash
docker compose down -v
```

Las migraciones `001`, `002`, `003`, `004`, `005` y `006` se ejecutan automáticamente, en ese orden, únicamente cuando PostgreSQL inicializa una base nueva. Para recrear completamente el entorno local y aplicar todas las migraciones:

```bash
docker compose down -v
docker compose up --build
```

Los scripts de `/docker-entrypoint-initdb.d` no vuelven a ejecutarse sobre un volumen PostgreSQL existente. Para aplicar de forma segura la migración `004` sin eliminar el volumen, desde la raíz del proyecto puede usarse PowerShell:

```powershell
Get-Content .\backend\database\migrations\006_administrative_workflow.sql | docker compose exec -T postgres psql -U motores_user -d motores_db -v ON_ERROR_STOP=1
```

Si se configuraron `POSTGRES_USER` o `POSTGRES_DB`, sustituya esos valores en el comando. La migración `006` es idempotente y utiliza `IF NOT EXISTS`.

La estructura técnica y las convenciones de colaboración se encuentran en [docs/architecture.md](docs/architecture.md). La API inicial está documentada en [docs/api.md](docs/api.md).
