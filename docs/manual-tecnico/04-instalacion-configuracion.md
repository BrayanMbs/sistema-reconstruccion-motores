# 4 Instalación y configuración

## Preparación

Instale Git, Node.js 24 y npm; Docker Compose es opcional. Clone el repositorio y seleccione `develop`. Antes de cambiar de rama, revise `git status --short` para preservar trabajo local. Las instrucciones siguientes describen tareas para un entorno de desarrollo controlado; no se ejecutaron migraciones durante esta auditoría.

```powershell
git clone https://github.com/BrayanMbs/sistema-reconstruccion-motores.git
cd sistema-reconstruccion-motores
git switch develop
npm ci --prefix backend
npm ci --prefix frontend
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Complete los archivos privados en su equipo sin versionarlos. `dotenv/config` carga el `.env` del directorio de ejecución; arranque el backend desde `backend`. Next.js carga su configuración desde `frontend`. Para Compose, use también el ejemplo de `.env` raíz. Nunca publique claves de servicio en variables `NEXT_PUBLIC_*`.

| Variable | Uso | Observación |
| --- | --- | --- |
| DATABASE_URL | Conexión backend a PostgreSQL | Obligatoria con NODE_ENV=production o CLOUD_DATABASE_REQUIRED=true |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | Alternativa local sin URL | Host predeterminado postgres corresponde a Docker, no al host Windows |
| DB_SSL | Activa TLS para URL | true/false; revisar validación de certificado |
| DB_SSL_REJECT_UNAUTHORIZED | Validación del certificado | Runtime exige valor true para habilitarla; no asumir validación por defecto |
| DB_POOL_MAX | Conexiones por instancia | 1 en producción y 10 fuera de ella por defecto |
| DB_CONNECTION_TIMEOUT_MS, DB_IDLE_TIMEOUT_MS | Límites del pool | Defaults distintos para URL y configuración local |
| PORT | Listener Express | 8080 por defecto |
| SUPABASE_URL, SUPABASE_ANON_KEY | Auth backend | Valores propios del proyecto |
| SUPABASE_SERVICE_ROLE_KEY | Administración de identidades | Exclusiva del servidor |
| NEXT_PUBLIC_API_URL | Origen HTTP de la API | Sin /api al final; apiRequest recibe /api/... |
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | Cliente Auth navegador | Se incorporan al build frontend |
| FRONTEND_URL, CORS_ORIGINS | Orígenes admitidos | Lista de orígenes exactos, separada por comas |
| ALLOW_VERCEL_PREVIEWS, VERCEL_PREVIEW_PROJECT_NAME | Previews CORS | Activación explícita y proyecto definido |
| TRUST_PROXY | Confianza en proxy | 1 en producción; false en desarrollo |
| BODY_LIMIT, REQUEST_TIMEOUT_MS | Tamaño y timeout HTTP | 1mb y 30000 por defecto |
| RATE_LIMIT_ENABLED, API_RATE_LIMIT_MAX | Limitación de API | true y 600 por defecto |
| AUTH_MAX_FAILED_ATTEMPTS, AUTH_LOCKOUT_WINDOW_MINUTES, AUTH_LOCKOUT_DURATION_MINUTES | Bloqueo de cuenta | 5, 15 y 15 por defecto |
| AUTH_IP_RATE_LIMIT_MAX, AUTH_IP_RATE_LIMIT_WINDOW_MS | Limitación de login | 15 y 900000 por defecto |
| API_RATE_LIMIT_WINDOW_MS, PUBLIC_TRACKING_RATE_LIMIT_WINDOW_MS | Ventanas de limitación | 900000 por defecto |
| PUBLIC_TRACKING_RATE_LIMIT_MAX | Seguimiento público | 60 por defecto |

## Arranque sin Docker

Abra dos terminales, configure una base de desarrollo preparada y las claves Auth de su entorno:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

El navegador usa el puerto 3000 y Express el 8080 salvo configuración diferente. Una base local no sustituye al proveedor de identidad: el acceso sigue requiriendo Supabase Auth y un perfil activo con el mismo UUID en `app_users`.

## Docker

El archivo base requiere `DATABASE_URL` y conecta con la base compartida; no declara PostgreSQL. Para ese modo:

```powershell
docker compose up --build
docker compose down
```

Para una base PostgreSQL local nueva, revise antes el seed `004` y su pertinencia; contiene un perfil predefinido y no crea una identidad de Supabase Auth. El overlay monta los 13 SQL como scripts de inicialización:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

La inicialización SQL solo ocurre con un directorio de datos vacío. Detener servicios preserva el volumen. No se recomienda borrar volúmenes como procedimiento de actualización. Para una base existente, planifique migraciones con respaldo y revisión; [base de datos](06-base-datos.md) explica los límites del ejecutor.

## Comprobación inicial

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/api/health
```

El primer endpoint comprueba el proceso; el segundo ejecuta `SELECT 1` y devuelve 503 si falla PostgreSQL. Una readiness correcta no comprueba Auth, tablas ni permisos del sistema.

Fuentes: [env backend](../../backend/src/config/env.ts), [Compose base](../../docker-compose.yml), [overlay local](../../docker-compose.local.yml), [ejemplo frontend](../../frontend/.env.example).
