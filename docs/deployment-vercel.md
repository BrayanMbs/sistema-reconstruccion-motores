# Guía de Despliegue en Vercel y Supabase Cloud

Este documento detalla la arquitectura, preparación y pasos necesarios para desplegar el **Sistema de Reconstrucción de Motores** en **Vercel** (plan gratuito/Hobby para demostración académica) utilizando **Supabase Cloud (PostgreSQL)** como base de datos de producción exclusiva.

---

## 1. Arquitectura de Despliegue

El proyecto se despliega bajo una arquitectura desacoplada de **dos proyectos independientes en Vercel** vinculados al mismo repositorio:

```
                              ┌─────────────────────────────────────────┐
                              │                 USUARIO                 │
                              └────────────────────┬────────────────────┘
                                                   │ HTTPS
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │        PROYECTO 1: VERCEL FRONTEND      │
                              │        - Next.js (App Router)           │
                              │        - Root Directory: frontend/      │
                              │        - Dominio: frontend.vercel.app   │
                              └────────────────────┬────────────────────┘
                                                   │ HTTPS / JSON API
                                                   │ Authorization: Bearer <JWT>
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │        PROYECTO 2: VERCEL BACKEND       │
                              │        - Node.js Express (Serverless)   │
                              │        - Root Directory: backend/       │
                              │        - Dominio: backend.vercel.app    │
                              └────────────────────┬────────────────────┘
                                                   │ TCP / SSL (Pooler 6543 / 5432)
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │          SUPABASE CLOUD POSTGRESQL      │
                              │          - Supavisor Connection Pooler  │
                              │          - Supabase Auth Service        │
                              └─────────────────────────────────────────┘
```

### ¿Por qué dos proyectos en Vercel? (Opción B)
1. **Alineación con el Monorepo:** El repositorio separa limpiamente `frontend/` y `backend/` con sus propios `package.json`, dependencias, scripts de build y suites de pruebas independientes.
2. **Aislamiento Estricto de Secretos:** Los secretos críticos (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) residen únicamente en el proyecto backend de Vercel y jamás se exponen en las variables de compilación o runtime del frontend.
3. **Cero Dependencia de Hacks:** No se requieren rewrites complejos ni reescritura de los controladores/servicios de Express a Next.js API Routes.
4. **Despliegues y Registros Independientes:** Se pueden consultar logs de ejecución, diagnósticos de errores y estados de build de cada capa por separado.
5. **Costo Cero:** Ambos proyectos se ejecutan dentro del plan gratuito de Vercel.

### Determinismo del Entorno Node.js (Node 24.x)
Tanto `backend/` como `frontend/` estandarizan la versión del entorno en **Node 24.x**:
- `backend/package.json` y `frontend/package.json`: `"engines": { "node": "24.x" }`.
- `backend/Dockerfile` y `frontend/Dockerfile`: imagen base `node:24-alpine`.
- En Vercel: La configuración del proyecto utilizará Node.js 24.x automáticamente respetando la directiva `engines`.

---

## 2. Base de Datos: Supabase Cloud & Connection Pooling

### Estrategia de Conexión
* **Producción:** Se conecta exclusivamente a Supabase PostgreSQL mediante el URI de **Supavisor Pooler**.
  * **Puerto 6543 (Transaction Mode):** Recomendado para funciones serverless con alto volumen de llamadas concurrentes.
  * **Puerto 5432 (Session Mode):** Compatible si se requiere soporte completo de estados de sesión.
* **Fail-Fast en Producción:** Si el backend inicia con `NODE_ENV=production` y `DATABASE_URL` no está definida, el servidor lanza inmediatamente un error explícito y **no realiza fallback a localhost ni a Docker**.
* **Configuración del Pool (`pg.Pool`):**
  * Reutilización global a nivel de módulo en contenedores calientes (`warm containers`).
  * `max`: **1 conexión máxima por instancia serverless en producción** (default: `1`, configurable mediante `DB_POOL_MAX`; en desarrollo local el default es `10`). En entornos serverless pueden existir múltiples instancias calientes y cada instancia puede atender concurrencia. Mantener inicialmente un pool pequeño, con un máximo de 1 conexión por instancia, reduce el riesgo de agotar las conexiones disponibles en Supabase/Supavisor. El valor puede incrementarse posteriormente mediante `DB_POOL_MAX` si las métricas muestran contención.
  * `connectionTimeoutMillis`: 10,000 ms (10s) para evitar bloqueos por latencia de red.
  * `idleTimeoutMillis`: 30,000 ms (30s) para liberar rápidamente conexiones ociosas hacia Supavisor.
  * `allowExitOnIdle: true` para que los procesos serverless inactivos finalicen de forma limpia.
* **Desarrollo Local:** Se conserva intacto el uso de PostgreSQL local con Docker Compose (`docker-compose.local.yml`) con un pool por defecto de 10 conexiones o conexión a Supabase según las variables locales.

---

## 3. Manejo de Migraciones

> [!IMPORTANT]
> **Las migraciones NO se ejecutan al iniciar el servidor ni por cada invocación serverless.**
> El ciclo de vida de la aplicación está desacoplado del ciclo de vida de las migraciones.

* La tabla de control `public.app_schema_migrations` almacena las migraciones aplicadas.
* La migración `009_mandatory_password_change.sql` **ya está aplicada en Supabase Cloud**.
* Cuando en el futuro se requiera aplicar una nueva migración (ej. `010_xxx.sql`):
  1. Se crea el archivo en `backend/database/migrations/010_xxx.sql`.
  2. Se ejecuta localmente el script autorizado apuntando a Supabase:
     ```bash
     npm --prefix backend run db:cloud
     ```
  3. Se verifica que `010_xxx.sql` figure en `app_schema_migrations`.
  4. Se procede al despliegue del código en Vercel.

---

## 4. Autenticación y Control de Acceso (RBAC)

* **Flujo de Sesión:**
  1. El usuario envía credenciales a `/api/auth/login`.
  2. El backend autentica contra Supabase Auth y obtiene el par `accessToken` / `refreshToken`.
  3. El frontend almacena la sesión en el cliente de Supabase (almacenamiento seguro del navegador) y envía el token mediante el encabezado `Authorization: Bearer <token>` en cada solicitud.
  4. Los middlewares de backend (`requireAuthentication` y `requireRole`) validan el token contra Supabase y verifican el perfil activo en PostgreSQL.
* **Sin Cookies Cross-Origin:** Al utilizar encabezados `Authorization: Bearer <token>`, no existen bloqueos por restricciones de cookies de terceros (`SameSite`, políticas de partición de cookies) entre `frontend.vercel.app` y `backend.vercel.app`.
* **Issue #18 (Cambio Obligatorio de Contraseña):**
  * Cuando un Administrador restablece una contraseña, `must_change_password` se marca en `true`.
  * Los middlewares bloquean las rutas protegidas con código `PASSWORD_CHANGE_REQUIRED` (HTTP 403).
  * El frontend redirige automáticamente al usuario a `/cambiar-contrasena`.
  * Tras actualizar la contraseña con éxito, el usuario es redirigido a la vista correspondiente a su rol.

---

## 5. Portal Público de Seguimiento

* El endpoint público `/api/public/orders/tracking` permanece accesible sin requerir autenticación.
* Incorpora el middleware `createPublicTrackingRateLimiter` para protección contra fuerza bruta.
* El backend incluye `app.set("trust proxy", 1)` para que la IP del cliente se obtenga correctamente a través de los encabezados `X-Forwarded-For` de Vercel.
* **Nota sobre Serverless:** El limitador de tasa actual utiliza un `Map` en memoria por instancia. En entornos serverless, los contenedores nuevos (cold starts) inician un contador limpio, manteniendo una protección razonable por instancia sin costos adicionales.

---

## 6. Inventario de Variables de Entorno

### Frontend (`frontend/`)

| Variable | Descripción | ¿Es Secreto? | Ejemplo Conceptual |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | URL base pública del Backend desplegado en Vercel | NO | `https://sistema-motores-backend.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase Cloud | NO | `https://abcdefghijkl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase | NO | `eyJhbGciOi...` |

### Backend (`backend/`)

| Variable | Descripción | ¿Es Secreto? | Ejemplo Conceptual |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | Connection string de PostgreSQL en Supabase (Pooler) | **SÍ** | `postgresql://postgres.xxx:PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres` |
| `DB_SSL` | Habilitar conexión SSL con PostgreSQL | NO | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | Validación de certificados SSL en Supabase | NO | `false` (o `true` con CA) |
| `DB_POOL_MAX` | Conexiones máximas por instancia serverless (default producción: `1`, local: `10`) | NO | `1` |
| `DB_CONNECTION_TIMEOUT_MS` | Timeout de conexión a la base de datos | NO | `10000` |
| `DB_IDLE_TIMEOUT_MS` | Timeout de liberación de conexiones ociosas | NO | `30000` |
| `SUPABASE_URL` | URL del proyecto Supabase Cloud | NO | `https://abcdefghijkl.supabase.co` |
| `SUPABASE_ANON_KEY` | Llave anónima de Supabase | NO | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave administrativa de servicio de Supabase | **SÍ** | `eyJhbGciOi...` |
| `FRONTEND_URL` | URL del frontend permitida en CORS | NO | `https://sistema-motores-frontend.vercel.app` |
| `CORS_ORIGINS` | Lista opcional de orígenes permitidos separados por coma | NO | `https://frontend.vercel.app,http://localhost:3000` |
| `ALLOW_VERCEL_PREVIEWS` | Habilitar preview deployments de Vercel (Recomendado `false` en producción) | NO | `false` o `true` |
| `VERCEL_PREVIEW_PROJECT_NAME` | Nombre del proyecto Vercel obligatorio si `ALLOW_VERCEL_PREVIEWS=true` para acotar previews | NO | `sistema-reconstruccion-motores` |
| `NODE_ENV` | Entorno de ejecución (gestionado automáticamente por Vercel) | NO | `production` |

> [!IMPORTANT]
> **Política de Seguridad CORS para Producción y Preview Deployments:**
> - **Recomendación para Producción:** Mantener `ALLOW_VERCEL_PREVIEWS=false`. La seguridad y el control de orígenes tienen prioridad sobre la comodidad.
> - **Frontend Oficial:** `FRONTEND_URL` debe contener la URL oficial de producción del frontend (ej. `https://sistema-motores-frontend.vercel.app`).
> - **Orígenes Adicionales:** `CORS_ORIGINS` permite especificar una lista separada por comas de dominios de confianza adicionales. Ambos (`FRONTEND_URL` y `CORS_ORIGINS`) se admiten simultáneamente sin que uno anule al otro.
> - **Previews Restringidos:** Si se habilitan previews (`ALLOW_VERCEL_PREVIEWS=true`), es indispensable definir `VERCEL_PREVIEW_PROJECT_NAME`. La validación solo autorizará URLs que comiencen estrictamente con el nombre del proyecto (`https://<proyecto>(-[a-zA-Z0-9-]+)?\.vercel\.app`) y **rechazará cualquier dominio `*.vercel.app` ajeno o malicioso**.
> - **Localhost en Producción:** `http://localhost:*` está denegado por defecto en producción salvo que el administrador lo incluya explícitamente en `CORS_ORIGINS`.

> [!CAUTION]
> **REGLA DE SEGURIDAD ESTRICTA:**
> Jamás exponga `DATABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY` en variables con prefijo `NEXT_PUBLIC_`, en el frontend o en repositorios públicos.

---

## 7. Paso a Paso: Configuración Manual en Supabase

1. Iniciar sesión en [Supabase Dashboard](https://supabase.com/dashboard).
2. Seleccionar el proyecto de la base de datos.
3. Ir a **Project Settings** > **Database**:
   * En la sección **Connection Pooling** (Supavisor):
   * Copiar el URI de conexión (**Transaction pooler**, puerto `6543`, o **Session pooler**, puerto `5432`).
   * Sustituir el placeholder del password por la contraseña de la base de datos (con caracteres especiales debidamente codificados con `%`, ej. `#` como `%23`).
   * Este valor será la variable `DATABASE_URL` del backend.
4. Ir a **Authentication** > **URL Configuration**:
   * **Site URL:** Colocar la URL de producción del Frontend en Vercel (ej. `https://sistema-motores-frontend.vercel.app`).
   * **Redirect URLs:** Agregar:
     * `http://localhost:3000/**`
     * `https://sistema-motores-frontend.vercel.app/**`
     * `https://*-<tu-usuario-o-equipo>.vercel.app/**` (si se desean probar Preview Deployments en PRs).
   * Guardar cambios.

---

## 8. Paso a Paso: Despliegue en Vercel

### Paso 1: Desplegar el Backend (`backend/`)
1. En [Vercel Dashboard](https://vercel.com/dashboard), pulsar **Add New...** > **Project**.
2. Importar el repositorio `BrayanMbs/sistema-reconstruccion-motores`.
3. En **Project Name**, asignar un nombre descriptivo (ej. `sistema-motores-backend`).
4. En **Root Directory**, pulsar **Edit** y seleccionar:
   ```
   backend
   ```
5. En **Framework Preset**, dejar que Vercel detecte **Other** / **Express**.
6. En **Build and Output Settings**:
   * Build Command: `npm run build` (o dejar por defecto).
   * Output Directory: dejar por defecto.
7. En **Environment Variables**, agregar las variables del Backend:
   * `DATABASE_URL`: (Connection string de Supabase Pooler)
   * `DB_SSL`: `true`
   * `DB_SSL_REJECT_UNAUTHORIZED`: `false`
   * `DB_POOL_MAX`: `1` (recomendado en producción; default interno es 1)
   * `SUPABASE_URL`: (URL del proyecto Supabase)
   * `SUPABASE_ANON_KEY`: (Anon key)
   * `SUPABASE_SERVICE_ROLE_KEY`: (Service role key)
   * `FRONTEND_URL`: `https://<temporal-o-esperado-frontend>.vercel.app` (se puede actualizar tras el paso 2)
   * `ALLOW_VERCEL_PREVIEWS`: `false` (o `true` si se define `VERCEL_PREVIEW_PROJECT_NAME`)
   * `VERCEL_PREVIEW_PROJECT_NAME`: `sistema-reconstruccion-motores`
8. En **Production Branch**, seleccionar:
   ```
   main
   ```
9. Pulsar **Deploy**.
10. Una vez completado, copiar el dominio asignado (ej. `https://sistema-motores-backend.vercel.app`).
11. Probar los endpoints de salud desde el navegador o mediante `curl`:
    * **Liveness Probe (Verificación de vida del proceso Express, sin tocar PostgreSQL):**
      ```
      GET https://sistema-motores-backend.vercel.app/health
      ```
      Respuesta esperada (HTTP 200):
      ```json
      {
        "status": "UP",
        "service": "sistema-reconstruccion-motores"
      }
      ```
    * **Readiness Probe (Verificación de conectividad con la base de datos PostgreSQL):**
      ```
      GET https://sistema-motores-backend.vercel.app/api/health
      ```
      Respuesta esperada con base conectada (HTTP 200):
      ```json
      {
        "status": "UP",
        "service": "sistema-reconstruccion-motores",
        "database": "connected"
      }
      ```
      Respuesta en caso de desconexión de la base (HTTP 503):
      ```json
      {
        "status": "DEGRADED",
        "service": "sistema-reconstruccion-motores",
        "database": "disconnected"
      }
      ```

---

### Paso 2: Desplegar el Frontend (`frontend/`)
1. En Vercel Dashboard, pulsar **Add New...** > **Project**.
2. Importar nuevamente el repositorio `BrayanMbs/sistema-reconstruccion-motores`.
3. En **Project Name**, asignar un nombre descriptivo (ej. `sistema-motores-frontend`).
4. En **Root Directory**, pulsar **Edit** y seleccionar:
   ```
   frontend
   ```
5. En **Framework Preset**, Vercel detectará automáticamente **Next.js**.
6. En **Environment Variables**, agregar las variables públicas:
   * `NEXT_PUBLIC_API_URL`: `https://sistema-motores-backend.vercel.app` (la URL obtenida en el Paso 1, sin barra final).
   * `NEXT_PUBLIC_SUPABASE_URL`: (URL del proyecto Supabase).
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Anon key).
7. En **Production Branch**, seleccionar:
   ```
   main
   ```
8. Pulsar **Deploy**.
9. Al finalizar, copiar el dominio final del Frontend (ej. `https://sistema-motores-frontend.vercel.app`).
10. **Ajuste final de CORS:** Si la URL final del Frontend difiere de lo que se configuró en el Backend en el Paso 1, ir al proyecto del Backend en Vercel > **Settings** > **Environment Variables**, actualizar `FRONTEND_URL` con el dominio real del Frontend y ejecutar **Redeploy**.

---

## 9. Modelo Formal de Ramas y Estrategia de Releases

El repositorio establece de forma estricta el siguiente flujo de trabajo Git y despliegue:

```
  feature/*, fix/*, chore/*
             │
             ▼  (Pull Request revisado + CI)
          develop (Integración continua del equipo)
             │
             ▼  (Pruebas completas + Pull Request de Release)
           main  (Versión estable de producción)
             │
             ▼  (Deploy automático en Vercel)
     VERCEL PRODUCCIÓN
```

### Roles de las Ramas
* **`main` (PRODUCCIÓN):** Representa exclusivamente la versión estable y auditada desplegada en producción en Vercel.
  * **Vercel Production Branch:** Los proyectos de frontend y backend en Vercel escuchan **únicamente a `main`**.
  * **Cero trabajo directo:** Queda estrictamente prohibido hacer commits directos, pushes directos o rebases destructivos sobre `main`.
  * **Actualización exclusiva:** `main` solo se actualiza mediante un **Pull Request de release desde `develop`** (o un PR de `hotfix/*` en emergencias críticas).
* **`develop` (INTEGRACIÓN / SIGUIENTE VERSIÓN):** Rama de integración continua y base de trabajo del equipo.
  * Todo trabajo individual se integra aquí mediante Pull Request.
  * **Aislamiento de Producción:** Los cambios integrados a `develop` **NO modifican automáticamente producción**.
* **`feature/*`, `fix/*`, `chore/*` (TRABAJO INDIVIDUAL):** Ramas de desarrollo creadas a partir de `develop`.

### Reglas Estrictas del Flujo
1. **Nunca:** `feature/*` ➔ `main` (sin pasar por `develop`).
2. **Nunca:** Push directo a `main`.
3. **Nunca:** `develop` auto-deploy a producción.
4. **Distinción fundamental:** La rama por defecto de GitHub (ej. `develop` para el trabajo diario) es **independiente** de la Production Branch en Vercel (`main`).

---

## 10. Procedimiento de Migraciones Futuras

> [!CAUTION]
> **REGLA DE ORO DE BASE DE DATOS:**
> Las migraciones **JAMÁS se ejecutan automáticamente desde Vercel** ni durante el startup del servidor Express.
> Supabase Cloud es la base de datos de producción y su esquema debe ser inmutable durante el despliegue de código.

Cuando el trabajo en `develop` requiera una nueva migración (ej. `010_nueva_tabla.sql`):

1. **Creación:** Desarrollar y versionar el script SQL en `backend/database/migrations/010_nueva_tabla.sql`.
2. **Pruebas en desarrollo:** Validar en base de datos local y/o entorno de desarrollo.
3. **Integración a develop:** Fusionar la rama en `develop` tras pasar revisión y suite de pruebas.
4. **Aplicación controlada en Supabase:** Antes de liberar la release a producción, ejecutar el script autorizado con credenciales administrativas:
   ```bash
   npm --prefix backend run db:cloud
   ```
5. **Verificación de auditoría:** Comprobar en Supabase SQL Editor que el registro `010_nueva_tabla.sql` figure en la tabla `public.app_schema_migrations`.
6. **Release a producción:** Abrir el Pull Request de release `develop` ➔ `main`.
7. **Despliegue en Vercel:** Al aprobar y fusionar en `main`, el código desplegado asumirá un esquema que ya fue validado y migrado.

---

## 11. Separación de Entornos: Desarrollo vs Producción

| Dimensión | Entorno de Desarrollo | Entorno de Producción |
| :--- | :--- | :--- |
| **Rama Git** | `feature/*`, `fix/*`, `develop` | `main` |
| **Hosting Frontend** | Local (`localhost:3000`) o Docker | Vercel (`frontend` project) |
| **Hosting Backend** | Local (`localhost:8080`) o Docker | Vercel (`backend` project, Serverless) |
| **Base de Datos** | PostgreSQL local (Docker Compose) o Supabase dev | Supabase Cloud (PostgreSQL + Supavisor Pooler) |
| **Pool Conexiones** | Default: `10` conexiones | Default: `1` conexión por instancia (`DB_POOL_MAX=1`) |
| **CORS** | Flexible (`localhost:*`, `127.0.0.1:*`) | Estricto (`FRONTEND_URL` oficial, `ALLOW_VERCEL_PREVIEWS=false`) |
| **Liveness / Readiness** | `/health` (200), `/api/health` (200/503) | `/health` (200), `/api/health` (200/503 con DB check) |

---

## 12. Orden Cronológico del Despliegue en Producción

Una vez aprobado el Pull Request de release `develop` ➔ `main`:

1. **Fusionar el PR de release:** `develop` se fusiona limpiamente en `main`.
2. **Crear/Configurar Proyecto Backend en Vercel:**
   * Root Directory: `backend`
   * Framework Preset: `Other`
   * Production Branch: `main`
3. **Cargar Variables de Entorno del Backend:**
   * `DATABASE_URL` (URI de Supavisor Pooler en Supabase).
   * `DB_SSL=true`
   * `DB_SSL_REJECT_UNAUTHORIZED=false`
   * `DB_POOL_MAX=1`
   * `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   * `ALLOW_VERCEL_PREVIEWS=false`
   * `NODE_ENV=production`
   * `FRONTEND_URL` (URL temporal o esperada del frontend).
4. **Desplegar Backend:** Pulsar **Deploy** y obtener la URL asignada (ej. `https://sistema-motores-backend.vercel.app`).
5. **Verificar Liveness Probe:**
   ```bash
   curl -i https://sistema-motores-backend.vercel.app/health
   ```
   Debe responder HTTP 200 `{ "status": "UP", "service": "sistema-reconstruccion-motores" }`.
6. **Verificar Readiness Probe:**
   ```bash
   curl -i https://sistema-motores-backend.vercel.app/api/health
   ```
   Debe responder HTTP 200 `{ "status": "UP", "database": "connected" }`.
7. **Crear/Configurar Proyecto Frontend en Vercel:**
   * Root Directory: `frontend`
   * Framework Preset: `Next.js`
   * Production Branch: `main`
8. **Cargar Variables de Entorno del Frontend:**
   * `NEXT_PUBLIC_API_URL` (URL real del backend obtenida en el paso 4, sin pleca final).
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
9. **Desplegar Frontend:** Pulsar **Deploy** y obtener la URL final asignada (ej. `https://sistema-motores-frontend.vercel.app`).
10. **Alinear CORS en Backend:** Si el dominio final del frontend difiere de lo configurado en el paso 3, actualizar `FRONTEND_URL` en el backend y ejecutar **Redeploy**.
11. **Configurar Supabase Auth:**
    * Ir a **Authentication** > **URL Configuration**.
    * Establecer **Site URL** con el dominio final del frontend (`https://sistema-motores-frontend.vercel.app`).
    * En **Redirect URLs**, agregar `https://sistema-motores-frontend.vercel.app/**`.
12. **Ejecutar Smoke Tests:** Realizar el checklist de verificación post-despliegue.

---

## 13. Checklist de Smoke Tests Post-Despliegue

Tras completar el despliegue en Vercel, ejecutar las siguientes comprobaciones sin alterar datos críticos:

* [ ] **PÚBLICO:**
  * Carga correcta de la página principal (`/`).
  * Acceso al portal de seguimiento público (`/seguimiento`).
  * Consulta de prueba con orden válida y código de seguimiento (debe mostrar estado sin datos sensibles).
  * Consulta con código inválido (debe mostrar mensaje de error amigable).
  * Rate limiting en seguimiento público (bloqueo ante exceso de peticiones repetitivas).
* [ ] **AUTENTICACIÓN:**
  * Inicio de sesión con credenciales válidas.
  * Rechazo ante contraseña incorrecta o usuario inactivo.
  * Cierre de sesión y revocación del token de cliente.
* [ ] **ADMINISTRADOR:**
  * Carga del panel principal (`/admin/dashboard`) con conteo de métricas.
  * Vista de usuarios (`/admin/users`), clientes (`/admin/clients`) y órdenes (`/admin/work-orders`).
  * Consulta de eventos en auditoría (`/admin/audit`).
* [ ] **SEGURIDAD Y RESET DE CREDENCIALES:**
  * Restablecimiento administrativo de credenciales para un usuario de prueba.
  * Generación de contraseña temporal con bandera `must_change_password=true`.
  * Inicio de sesión del usuario con contraseña temporal ➔ Redirección obligatoria a `/cambiar-contrasena`.
  * Bloqueo de rutas protegidas hasta cambiar la contraseña.
  * Cambio exitoso de contraseña y acceso posterior normal.
* [ ] **ADMINISTRATIVO:**
  * Gestión y consulta de clientes (`/administrativo/clientes`).
  * Creación y consulta de órdenes de trabajo (`/administrativo/ordenes`).
  * Asignación de técnico u operario a orden.
* [ ] **OPERATIVO:**
  * Ingreso con usuario técnico (`/operativo/inicio`).
  * Consulta exclusiva de órdenes asignadas al operario.
  * Registro de avance y observaciones técnicas.
* [ ] **INVENTARIO:**
  * Listado de productos e insumos (`/inventario`).
  * Indicadores de existencias y alertas de stock bajo.
  * Registro de movimientos de inventario.
* [ ] **CAJA Y FINANZAS:**
  * Consulta de balance y cobros registrados (`/caja`).
  * Registro de pagos y liquidaciones vinculadas a órdenes.
* [ ] **LÍNEA DE TIEMPO (TIMELINE):**
  * Visualización cronológica correcta de eventos en el detalle de una orden de trabajo.

---

## 14. Ciclo de Vida y Futuras Actualizaciones

Una vez estabilizada la producción en `main`:

1. **Nuevo requerimiento o corrección:**
   ```bash
   git switch develop
   git pull origin develop
   git switch -c feature/nueva-mejora
   ```
2. **Ciclo de calidad local:**
   ```bash
   npm --prefix backend test && npm --prefix backend run build
   npm --prefix frontend test && npm --prefix frontend run build
   ```
3. **Pull Request hacia `develop`:**
   * GitHub Actions ejecuta automáticamente las pruebas y builds.
   * Revisión por pares e integración a `develop`.
   * **`main` y producción permanecen intactos.**
4. **Liberación de nueva versión:**
   * Cuando se acumulen mejoras listas para producción, se abre un **Pull Request de release `develop` ➔ `main`**.
   * Al aprobarse y fusionarse, Vercel detecta el cambio en `main` y despliega la nueva versión en producción sin intervención manual.

---

## 15. Flujo de Hotfix de Emergencia en Producción

Si se detecta un fallo crítico en el entorno de producción que requiere resolución inmediata:

```
  main (Fallo detectado)
    │
    ▼ (git switch -c hotfix/urgente)
  hotfix/urgente
    │
    ├─────────────────────────────┐
    ▼ (PR hacia main)             ▼ (PR / Merge hacia develop)
  main                          develop
    │                             │
    ▼ (Vercel Production)         ▼ (Siguiente release protegida)
  Producción corregida          Cero divergencia
```

1. **Crear rama de hotfix desde `main`:**
   ```bash
   git switch main
   git pull origin main
   git switch -c hotfix/descripcion-del-fallo
   ```
2. **Aplicar la corrección mínima necesaria:** Escribir la prueba que reproduce el fallo y resolverlo.
3. **PR hacia `main`:** Revisión ágil, fusión y despliegue inmediato en Vercel.
4. **SINCRONIZACIÓN OBLIGATORIA A `develop`:**
   Inmediatamente después del merge a `main`, fusionar o abrir PR del hotfix hacia `develop`:
   ```bash
   git switch develop
   git pull origin develop
   git merge origin/main
   git push origin develop
   ```
   Esto garantiza que **el error no vuelva a introducirse** en la siguiente release planificada (principio de no divergencia).

---

## 16. Recomendaciones de Protección de Ramas en GitHub

Para garantizar la integridad del ciclo de release, se recomienda configurar las siguientes reglas en GitHub (**Settings** > **Branches**):

* **Rama `main` (Producción):**
  * `Require a pull request before merging` (impide commits directos).
  * `Require approvals` (mínimo 1 aprobación).
  * `Dismiss stale pull request approvals when new commits are pushed`.
  * `Require status checks to pass before merging` (seleccionar los checks de GitHub Actions: `Backend (Lint, Test, Build)` y `Frontend (Lint, Test, Build)`).
  * `Require branches to be up to date before merging`.
  * `Do not allow force pushes`.
  * `Do not allow deletions`.
* **Rama `develop` (Integración):**
  * `Require a pull request before merging`.
  * `Require status checks to pass before merging`.
  * `Do not allow force pushes`.

---

## 17. Resolución de Problemas Frecuentes (Troubleshooting)

### Error 403: `CORS_FORBIDDEN` o error de origen en el navegador
* **Causa:** El origen desde el cual carga el frontend no coincide con el valor configurado en `FRONTEND_URL` ni en `CORS_ORIGINS`.
* **Solución:** En el proyecto Backend de Vercel > Settings > Environment Variables, verificar que `FRONTEND_URL` tenga exactamente el protocolo y dominio del frontend (ej. `https://mi-frontend.vercel.app` sin barra final `/`). Si se usan preview deployments, verificar que `ALLOW_VERCEL_PREVIEWS=true`. Realizar Redeploy del backend.

### Backend falla al iniciar con `DATABASE_URL es obligatoria en producción`
* **Causa:** No se configuró la variable `DATABASE_URL` en el proyecto Backend de Vercel.
* **Solución:** Cargar la variable `DATABASE_URL` en las Environment Variables del proyecto Backend de Vercel y desplegar nuevamente.

### Error de conexión `ETIMEDOUT` o `Connection terminated unexpectedly`
* **Causa:** Supabase direct connection agotó las conexiones disponibles o el host directo no es alcanzable desde serverless.
* **Solución:** Utilizar el endpoint del Connection Pooler (puerto 6543 o 5432) en lugar de la conexión directa de PostgreSQL.

### El usuario ve error `Debes cambiar tu contraseña temporal para continuar`
* **Causa:** Comportamiento esperado de seguridad del Issue #18 tras un reset administrativo de credenciales.
* **Solución:** El frontend lo redirige a `/cambiar-contrasena` para que defina su nueva contraseña segura.
