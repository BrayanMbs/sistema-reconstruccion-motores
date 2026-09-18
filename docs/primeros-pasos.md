# Primeros pasos — Sistema de Reconstrucción de Motores

Esta guía deja listo el sistema en una máquina nueva y explica el flujo inicial de uso.

> **Importante:** el modo normal usa PostgreSQL compartido en Supabase. Siga primero [migracion-supabase.md](migracion-supabase.md) para configurar `DATABASE_URL`, importar los datos y vincular los perfiles de los usuarios. Los valores `POSTGRES_*` de esta guia solo aplican al modo local aislado.

## 1. Requisitos

- Docker Desktop con Docker Compose.
- Una cuenta y proyecto de Supabase para la autenticación.
- Git y, de forma opcional, Node.js 22+ para ejecutar frontend y backend sin Docker.

## 2. Obtener el proyecto

```bash
git clone https://github.com/BrayanMbs/sistema-reconstruccion-motores.git
cd sistema-reconstruccion-motores
git switch develop
```

## 3. Configurar las variables de entorno

Copie el archivo de ejemplo de la raíz:

```powershell
Copy-Item .env.example .env
```

Edite `.env` y complete las credenciales de su proyecto de Supabase. No suba este archivo a Git.

```dotenv
POSTGRES_DB=motores_db
POSTGRES_USER=motores_user
POSTGRES_PASSWORD=una-clave-local-segura
POSTGRES_PORT=5432
BACKEND_PORT=8080
FRONTEND_PORT=3000

SUPABASE_URL=https://<id-del-proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-solo-backend>
```

La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el backend para crear cuentas. Nunca la coloque en código cliente ni la comparta.

## 4. Preparar Supabase y el primer administrador

1. En Supabase, abra **Authentication > Users** y cree el usuario administrador con correo y contraseña.
2. Copie el UUID de ese usuario.
3. Cuando PostgreSQL esté iniciado, registre su perfil de negocio. Sustituya los valores entre `< >`:

```sql
INSERT INTO app_users (id, full_name, email, role, is_active)
VALUES ('<uuid-de-supabase>', '<nombre-completo>', '<correo>', 'ADMIN', true);
```

El usuario debe existir tanto en Supabase Auth como en `app_users`; de lo contrario no tendrá acceso al panel.

## 5. Iniciar el sistema por primera vez

Desde la raíz del repositorio ejecute:

```bash
docker compose up --build
```

En el primer arranque, PostgreSQL ejecuta automáticamente:

- `001_issue_1_admin.sql`
- `002_admin_operations.sql`

Abra estas direcciones:

- Aplicación: <http://localhost:3000>
- API: <http://localhost:8080>
- Health check: <http://localhost:8080/api/health>

Inicie sesión en <http://localhost:3000/login> con el usuario administrador creado antes.

Para detener los servicios use `docker compose down`. No use `docker compose down -v` si desea conservar clientes, órdenes, pagos e inventario: ese comando elimina la base local.

## 6. Si ya tenía una base de datos local

Los scripts montados en `docker-entrypoint-initdb.d` solo se ejecutan cuando PostgreSQL crea un volumen nuevo. Si el proyecto ya tenía una base antes de incorporar los módulos administrativos, aplique la migración una vez:

```powershell
Get-Content -Raw .\backend\database\migrations\002_admin_operations.sql |
  docker exec -i sistema-reconstruccion-motores-postgres-1 sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

El script es idempotente: puede ejecutarse otra vez sin duplicar tablas o índices.

## 7. Flujo recomendado de uso

1. Entre como administrador.
2. En **Usuarios y roles**, cree el personal necesario. Use **Trabajador Operativo** para los técnicos.
3. En **Clientes**, registre al propietario del motor.
4. En **Inventario**, registre repuestos, insumos, existencias y stock mínimo.
5. En **Órdenes de trabajo**, cree una orden para un cliente.
6. Abra el detalle de la orden, asigne el técnico y agregue los insumos consumidos.
7. En **Finanzas**, registre los pagos recibidos para esa orden.
8. Consulte **Reportes** para revisar órdenes, stock bajo, pagos y asignaciones.
9. Ajuste los datos del taller, moneda e impuesto en **Configuración**.
10. El técnico inicia sesión con su usuario `OPERATOR`, abre **Mis órdenes asignadas**, inicia la reparación, registra avances con observaciones y la finaliza al llegar a 100%.

## 8. Solución rápida de problemas

| Problema | Qué revisar |
| --- | --- |
| No permite iniciar sesión | Verifique `SUPABASE_URL`, claves y que el usuario tenga perfil activo con rol `ADMIN` en `app_users`. |
| El backend no puede crear usuarios | Confirme que `SUPABASE_SERVICE_ROLE_KEY` esté configurada solo para el backend. |
| No aparecen inventario, pagos o configuración | Aplique la migración `002_admin_operations.sql` indicada arriba. |
| No puede asignar técnico | Cree o active un usuario con rol `OPERATOR`. |
| No permite añadir un insumo | Revise que haya existencia suficiente en Inventario. |
| Docker no inicia | Confirme que Docker Desktop esté abierto y que los puertos 3000, 5432 y 8080 estén disponibles. |
