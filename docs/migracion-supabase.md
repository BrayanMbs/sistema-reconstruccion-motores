# Migracion a base de datos compartida en Supabase

Esta guia convierte PostgreSQL de Supabase en la unica fuente compartida de usuarios de negocio, clientes, ordenes, inventario, pagos y avances. Supabase Auth ya conserva las credenciales; esta migracion vincula cada identidad con su perfil y rol en `app_users`.

## Reglas de seguridad

- No suba `.env`, `backend/.env`, URI de PostgreSQL, `SUPABASE_SERVICE_ROLE_KEY` ni contrasenas a Git.
- Use el URI de **Connect > Session pooler** en Supabase. Es el apropiado para un backend Node.js persistente y funciona desde redes IPv4.
- El URI debe llevar `sslmode=require`. Si la contrasena contiene `#`, `@`, espacios u otro caracter reservado, codifiquelo para una URL antes de pegarlo.
- Una sola persona debe ejecutar la importacion inicial. Los demas equipos solo configuraran el mismo `.env` despues de terminarla.

## 1. Guardar una copia local

No ejecute `docker compose down -v`: eliminaria el volumen con los datos que se migraran. Si Docker esta funcionando, deje el contenedor de PostgreSQL encendido hasta completar la importacion.

## 2. Configurar la conexion compartida

En Supabase abra **Connect**, copie el URI de **Session pooler** y guardelo en el `.env` de la raiz y en `backend/.env`:

```dotenv
DATABASE_URL=postgresql://postgres.<project-ref>:<database-password>@<pooler-host>:5432/postgres?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_POOL_MAX=10

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-solo-backend>
```

En `frontend/.env.local` use unicamente los valores publicos:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## 3. Aplicar el esquema e importar datos existentes

Desde `backend`, ejecute el importador. Este toma el origen local de las variables `POSTGRES_*` guardadas en el `.env` de la raiz.

```powershell
cd backend
npm run db:cloud -- --import-local-data
```

El comando aplica `001`, `002`, `003` y `005` una sola vez, registra las migraciones en `app_schema_migrations` e importa clientes, ordenes, inventario, pagos, configuracion, auditoria y avances. La migracion `004_seed_admin.sql` se omite intencionalmente: contiene un UUID local fijo y no debe crear identidades ficticias en la nube.

Si no existen datos locales que preservar, ejecute solo:

```powershell
cd backend
npm run db:cloud
```

## 4. Vincular los usuarios ya creados en Supabase Auth

Cada usuario que iniciara sesion necesita un perfil con rol. Primero sincronice los perfiles locales existentes con el UUID real de Supabase Auth; conserva roles y relaciones historicas.

```powershell
cd backend
npm run db:cloud:sync-auth
```

Si algun usuario de Auth aun no tiene perfil, cree o complete su rol con el siguiente comando:

```powershell
cd backend
npm run db:cloud:user -- --email 'admin@ejemplo.com' --name 'Nombre completo' --role ADMIN
npm run db:cloud:user -- --email 'tecnico@ejemplo.com' --name 'Nombre completo' --role OPERATOR
```

Roles permitidos: `ADMIN`, `ADMINISTRATIVE`, `CASHIER`, `INVENTORY` y `OPERATOR`. No asigne un rol por defecto a un correo si no sabe cual corresponde.

## 5. Usar el sistema desde todos los equipos

En cada clon:

1. Copie `.env.example` a `.env` y agregue exactamente el mismo `DATABASE_URL` y credenciales de Supabase.
2. Copie `backend/.env.example` a `backend/.env` y complete los mismos valores del backend.
3. Cree `frontend/.env.local` con el URL y anon key publicos.
4. Ejecute `docker compose up --build`.

No se inicia PostgreSQL local con ese comando: frontend y backend consumen la base compartida. Todos veran los mismos datos.

Para una base aislada de desarrollo, que no comparte datos con el equipo, use:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

## Verificacion final

1. Inicie sesion con un usuario `ADMIN` desde dos equipos.
2. Cree un cliente u orden en uno y actualice la pagina en el otro.
3. Asigne un `OPERATOR`, registre un avance y confirme que aparece en ambos equipos y en el portal publico de seguimiento.
4. Revise que inventario, pagos y reportes muestren la misma informacion.
