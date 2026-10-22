# 12 Pruebas y calidad

Verificaciones locales ejecutadas el 22 de octubre de 2026 sobre el commit auditado, con Node 24.15.0 y npm 11.12.1. Se instalaron dependencias con `npm ci --ignore-scripts --no-audit --no-fund` en cada subproyecto para la auditoría. Esto conserva lockfiles y omite scripts de instalación; no sustituye un ensayo de instalación completa. No se cargaron credenciales productivas ni se ejecutaron migraciones.

| Área | Comando desde raíz | Resultado observado |
| --- | --- | --- |
| Backend | npm run lint --prefix backend | Sin diagnósticos ESLint |
| Backend | npm test --prefix backend | 35 archivos, 345 pruebas aprobadas; 14.32 s |
| Backend | npm run build --prefix backend | tsc completado sin errores |
| Frontend | npm run lint --prefix frontend | Sin diagnósticos ESLint |
| Frontend | npm test --prefix frontend | 30 archivos, 178 pruebas aprobadas; 20.56 s |
| Frontend | npm run build --prefix frontend | next build completado; rutas estáticas y dinámicas generadas |

Los logs están en `artifacts/manual-audit/`, ignorado por Git. Los conteos históricos de `docs/development.md` ya no representan esta suite.

## Alcance de la evidencia

Backend incluye `tests/**/*.test.ts`; frontend `src/**/*.test.{ts,tsx}` con jsdom. Supertest comprueba HTTP con Express y dobles de dependencias. No se ejecutaron pruebas end-to-end con navegador, PostgreSQL y Supabase reales. La suite no certifica migraciones ni concurrencia SQL. El [inventario](anexo-pruebas.md) identifica archivos; no se midió porcentaje de cobertura.

CI versionada: `.github/workflows/ci.yml`. En Ubuntu, dos jobs independientes usan Node 24, `npm ci`, lint, test y build. Se activa en PR y push a develop/main. No contiene un paso de migración ni un despliegue explícito. Ejecuciones remotas y protecciones GitHub: **NO VERIFICADO**.

## Validación documental

El script `herramientas/verificar_manual.py` comprueba capítulos, enlaces, estructura Mermaid, inventarios, Word y patrones sensibles. Parser completo y revisión visual se registran por separado en [validación final](registro-validacion.md).

No se ejecutó `scripts/k6-load-test.js`: debe utilizarse solo con un destino autorizado y un plan de carga. Tampoco se ejecutó escaneo de dependencias ni pentest. No se modificó código de producción para lograr resultados favorables.

Fuentes: [Vitest backend](../../backend/vitest.config.ts), [Vitest frontend](../../frontend/vitest.config.ts), [CI](../../.github/workflows/ci.yml), [carga](../load-testing.md).
