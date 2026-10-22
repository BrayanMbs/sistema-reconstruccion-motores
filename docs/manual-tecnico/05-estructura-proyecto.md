# 5 Estructura del proyecto

| Ruta | Responsabilidad verificada |
| --- | --- |
| frontend/src/app | Páginas y layouts del App Router; grupos auth, public, admin, administrativo, operativo y cajero; inventario fuera de grupo |
| frontend/src/modules | auth, users, clients, dashboard, work-orders, operational, operators, inventory, finance, reports, audit, public-tracking, search, settings |
| frontend/src/shared | Servicios API/Auth, componentes visuales, modelos compartidos y validación |
| backend/src/app.ts y server.ts | Construcción de aplicación y arranque del listener |
| backend/src/config | Entorno, pool pg y factorías Supabase |
| backend/src/routes | Montaje de áreas y permisos; algunas acciones inline |
| backend/src/controllers | Adaptadores HTTP |
| backend/src/services | Casos de uso y coordinación |
| backend/src/repositories | SQL parametrizado, transacciones y conversión de filas |
| backend/src/validators | Validación común y por dominio |
| backend/src/dtos y models | Contratos de entrada/salida y modelos de dominio |
| backend/src/middlewares | Sesión, roles, errores, cabeceras, timeout y limitadores |
| backend/src/scripts | Migración/inspección cloud y provisión/sincronización de identidades |
| backend/database/migrations | 13 archivos SQL versionados |
| backend/tests | Pruebas backend |
| .github/workflows/ci.yml | Lint, test y build por subproyecto |
| scripts/k6-load-test.js | Prueba de carga configurable; no ejecutada contra servicios |
| docs | Documentación histórica y este manual |

No existen todos los directorios propuestos por la arquitectura histórica: el backend no tiene carpeta `mappers` y el frontend no tiene módulo `workers`; el personal está en `operators` y `operational`. Los hooks específicos comprobados incluyen `modules/settings/hooks/use-settings.ts` y `modules/reports/hooks/use-reports.ts`.

Use [rutas frontend](anexo-rutas-frontend.md), [catálogo de endpoints](anexo-endpoints.md), [inventario de pruebas](anexo-pruebas.md) y [diccionario SQL](anexo-esquema.md) para localizar implementaciones sin duplicar todo el código en el manual.
