# Continuidad — Issue #1 Administrador

## Estado actual

La rama de trabajo es `feature/issue-1-admin-end-to-end`. No se ha hecho merge ni PR. La implementación cubre login, protección administrativa, dashboard, usuarios, clientes, órdenes de trabajo y auditoría en modo lectura.

## Rutas de interfaz

- `/login`
- `/admin/dashboard`
- `/admin/users`
- `/admin/clients`
- `/admin/work-orders`
- `/admin/audit`

Las pantallas siguen los tokens visuales de Stitch: sidebar azul oscuro de 260 px, cabecera de 64 px, Inter, tarjetas blancas, bordes `#CBD5E1` y acción primaria `#2563EB`.

## Configuración imprescindible

Copiar los tres `.env.example` a sus respectivos `.env` si se desarrollará fuera de Docker. En la raíz se deben configurar, sin subir secretos:

```dotenv
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-solo-backend>
```

`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se configuran en `frontend/.env`; Docker Compose los deriva desde las variables raíz. La service role key nunca debe usarse en el frontend.

## Primer administrador

1. En Supabase Auth, crear un usuario por email y contraseña desde el panel seguro de Supabase.
2. Copiar su UUID de Auth.
3. Ejecutar en la base `motores_db`:

```sql
INSERT INTO app_users (id, full_name, email, role, is_active)
VALUES ('<uuid-supabase>', 'Nombre Administrador', 'admin@ejemplo.com', 'ADMIN', true);
```

4. Iniciar sesión en `/login` con esa cuenta.

Esto es necesario porque Supabase Auth y el perfil de negocio de PostgreSQL son entidades distintas. Después, el administrador puede crear nuevos usuarios desde la interfaz; esa operación necesita `SUPABASE_SERVICE_ROLE_KEY` en el backend.

## Base de datos

La migración inicial está en `backend/database/migrations/001_issue_1_admin.sql` y Docker la monta en `docker-entrypoint-initdb.d`. Solo se ejecuta automáticamente con un volumen nuevo. Para volver a inicializar desarrollo local, usar `docker compose down -v` antes de `docker compose up --build`; no usar ese comando en un entorno con datos que deban conservarse.

Tablas: `app_users`, `clients`, `work_orders`, `audit_events`. La auditoría no tiene rutas de modificación.

## Endpoints relevantes

Todos los endpoints completos están en [api.md](api.md). Los administrativos usan el prefijo `/api/admin` y exigen Bearer token de Supabase con rol `ADMIN` activo.

## Validaciones realizadas

- Frontend: `npm run lint`, `npm run build` y `npm test`.
- Backend: `npm run lint`, `npm run build` y `npm test`.
- Las pruebas cubren health, acceso administrativo sin sesión, usuario inactivo y rol no administrador.

## Pendientes conscientes

- Probar end-to-end con un proyecto Supabase y datos reales: no hay credenciales en el repositorio.
- Cargar clientes reales antes de usar el asistente de creación de órdenes.
- Asignación de trabajador y cambio operativo de estado se mantienen fuera de este Issue para respetar la supervisión del administrador; los diseños de Stitch de esas operaciones quedan como referencia para sus tickets.
- Docker Desktop no estaba activo en la máquina durante la validación; debe probarse `docker compose up --build` al tener el daemon disponible.
- Crear el PR desde esta rama con `Closes #1` cuando la integración de Supabase haya sido comprobada. No se debe hacer merge automático.
