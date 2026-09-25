# Estado de Desarrollo y Estrategia de Ramas

Última actualización: 25 de septiembre de 2026.

Este documento describe la organización del repositorio, el modelo formal de ramas Git, los módulos implementados, su estado de verificación y las consideraciones para futuras releases.

---

## 1. Modelo Formal de Ramas y Flujo Git

El repositorio adopta una estrategia estricta de ramas para garantizar la estabilidad de producción y el trabajo ordenado del equipo:

```
feature/*, fix/*, chore/*
           │
           ▼  (Pull Request revisado + CI automatizado)
        develop (Integración continua del equipo)
           │
           ▼  (Pruebas completas + Pull Request de Release)
         main  (Versión estable de producción)
           │
           ▼  (Despliegue automático en Vercel)
   VERCEL PRODUCCIÓN
```

* **`main` (PRODUCCIÓN):**
  * Representa exclusivamente la versión estable y validada que se ejecuta en producción.
  * **Vercel Production:** El frontend y el backend en Vercel escuchan **únicamente a `main`**.
  * **Inmutable:** No admite commits directos, pushes directos ni force pushes.
  * **Solo actualizable mediante:** Pull Request de release desde `develop` (o hotfix autorizado).
* **`develop` (INTEGRACIÓN / SIGUIENTE VERSIÓN):**
  * Rama de integración continua y base para todo el trabajo del equipo.
  * Todo desarrollo individual se integra aquí a través de Pull Request.
  * **Aislamiento:** Los cambios integrados a `develop` **NO modifican automáticamente la versión desplegada en producción**.
* **`feature/*`, `fix/*`, `chore/*` (TRABAJO INDIVIDUAL):**
  * Ramas creadas a partir de `develop`.
  * Nunca se fusionan directamente a `main`.

### Flujo de Hotfix de Emergencia
Si surge un error crítico en producción:
1. Crear `hotfix/descripcion` desde `main`.
2. Resolver el fallo con su prueba unitaria o de integración.
3. Abrir Pull Request hacia `main` (para despliegue urgente).
4. **Sincronización obligatoria:** Integrar inmediatamente el hotfix hacia `develop` para evitar regresiones en futuras releases (principio de no divergencia).

---

## 2. Módulos Disponibles en `develop`

| Módulo | Alcance y Capacidades Actuales | Estado |
| :--- | :--- | :---: |
| **Autenticación y RBAC** | Integración con Supabase Auth, validación de estado activo en PostgreSQL y control estricto de roles (`ADMIN`, `ADMINISTRATIVE`, `CASHIER`, `INVENTORY`, `OPERATOR`). Sin cookies cross-origin (`Authorization: Bearer <JWT>`). | **Completado** |
| **Seguridad de Credenciales (Issue #18)** | Restablecimiento administrativo de credenciales, contraseñas temporales, bandera `must_change_password`, redirección obligatoria a `/cambiar-contrasena` y bloqueo de rutas protegidas hasta el cambio exitoso. | **Completado** |
| **Dashboard Administrativo** | Consulta consolidada de métricas de negocio, órdenes activas, inventario y accesos directos por rol. | **Completado** |
| **Gestión de Usuarios** | Creación, edición, activación/inactivación y asignación de roles. | **Completado** |
| **Clientes** | Alta, edición, listado, búsqueda y visualización de detalle de clientes vinculados a órdenes de trabajo. | **Completado** |
| **Órdenes de Trabajo** | Creación, ciclo de estados (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), asignación de técnico e insumos de inventario con deducción transaccional. | **Completado** |
| **Línea de Tiempo / Timeline (Issue #20)** | Historial cronológico de eventos, estados, notas y asignaciones en el detalle de la orden. | **Completado** |
| **Portal Operativo** | Vista dedicada para técnicos (`OPERATOR`), visualización exclusiva de órdenes asignadas, registro de avances, notas técnicas y notificaciones. | **Completado** |
| **Inventario** | Catálogo de productos, existencias, alertas de stock mínimo y registro de movimientos de entrada/salida. | **Completado** |
| **Caja y Finanzas** | Módulo de caja (`/caja`), liquidaciones, registro de cobros por orden, control de pagos e historial financiero. | **Completado** |
| **Auditoría** | Registro estructurado de eventos administrativos sensibles en base de datos. | **Completado** |
| **Portal Público de Seguimiento** | Consulta pública de órdenes vía `/seguimiento` con número de orden y código aleatorio seguro, con rate limiter por IP. | **Completado** |
| **Despliegue Vercel + Supabase (Issues #21 y #24)** | Configuración desacoplada en dos proyectos de Vercel (Next.js y Express Serverless), Supavisor connection pooler (`DB_POOL_MAX=1` en prod), liveness `/health` y readiness `/api/health` (503 en falla de DB), CORS endurecido con `ALLOW_VERCEL_PREVIEWS=false` y runtime en Node 24.x. | **Completado** |
| **Reportes (Issue #14)** | Funcionalidad básica integrada: indicadores generales, órdenes por estado, insumos y total de cobros vía `GET /api/admin/reports/summary`. Filtros avanzados por fechas, indicadores ampliados y exportación CSV/PDF permanecen en desarrollo dentro del **Issue #14 (Abierto)**. | **Básico Integrado / Extensión Pendiente** |
| **Configuración (Issue #15)** | Funcionalidad básica integrada: datos generales del taller, moneda e impuesto en tabla `app_settings` vía `GET|PUT /api/admin/settings`. Registro de auditoría extendido y gestión avanzada de parámetros permanecen en desarrollo dentro del **Issue #15 (Abierto)**. | **Básico Integrado / Extensión Pendiente** |

---

## 3. Estado de Migraciones de Base de Datos

Las siguientes 9 migraciones se encuentran formalmente versionadas en `backend/database/migrations/` y **ya están aplicadas en Supabase Cloud**:

1. `001_issue_1_admin.sql` — Estructura base de usuarios, roles y autenticación.
2. `002_admin_operations.sql` — Inventario, asignaciones, pagos y parámetros generales.
3. `003_operational_workflow.sql` — Flujo operativo, prioridades y notificaciones de técnicos.
4. `004_seed_admin.sql` — Seed inicial administrativo.
5. `005_public_order_tracking.sql` — Códigos de seguimiento público de órdenes.
6. `006_administrative_workflow.sql` — Permisos y vistas administrativas.
7. `007_cashier_and_finance_workflow.sql` — Módulo de caja y cobros financieros.
8. `008_order_timeline_and_history.sql` — Eventos cronológicos y línea de tiempo de órdenes.
9. `009_mandatory_password_change.sql` — Columna `must_change_password` y flujo de cambio forzoso.

> [!NOTE]
> La tabla `public.app_schema_migrations` en Supabase Cloud registra todas las migraciones anteriores. Este ticket no genera ninguna migración adicional.

---

## 4. Validación Automatizada (CI y Suites de Pruebas)

El proyecto cuenta con integración continua automatizada mediante **GitHub Actions** (`.github/workflows/ci.yml`), ejecutando en **Node 24**:

* **Backend:**
  * Linter: ESLint sin errores ni advertencias (`0 errors, 0 warnings`).
  * Pruebas: Vitest — **20 archivos de prueba, 114 pruebas aprobadas (100%)**.
  * Compilación: TypeScript (`tsc -p tsconfig.json`) sin errores.
* **Frontend:**
  * Linter: ESLint sin errores ni advertencias (`0 errors, 0 warnings`).
  * Pruebas: Vitest + Testing Library — **11 archivos de prueba, 27 pruebas aprobadas (100%)**.
  * Compilación: Next.js 16 (`next build`) — 33 rutas estáticas y dinámicas compiladas exitosamente.
