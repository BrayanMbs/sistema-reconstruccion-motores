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

La estructura técnica y las convenciones de colaboración se encuentran en [docs/architecture.md](docs/architecture.md). La API inicial está documentada en [docs/api.md](docs/api.md).
