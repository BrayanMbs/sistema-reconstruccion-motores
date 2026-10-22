# 3 Tecnologías y dependencias

Versiones declaradas en los manifiestos del commit, no una recomendación de versiones futuras. Los lockfiles fijan el árbol utilizado por `npm ci`.

| Componente | Versión o declaración | Evidencia |
| --- | --- | --- |
| Runtime esperado | Node.js 24.x | engines de ambos package.json, Docker y CI |
| Runtime de auditoría | Node.js 24.15.0; npm 11.12.1 | comandos locales ejecutados |
| Next.js y eslint-config-next | 16.3.6 | frontend/package.json |
| React y React DOM | 19.2.0 | frontend/package.json |
| TypeScript | 5.8.3 | ambos manifiestos |
| Tailwind y PostCSS | 4.1.7 | frontend/package.json |
| Express | 5.1.0 | backend/package.json |
| pg | 8.16.0 | backend/package.json |
| Supabase JS | 2.49.8 | ambos manifiestos |
| Vitest | 3.1.3 | ambos manifiestos |
| Testing Library React | 16.3.0 | frontend/package.json |
| Supertest | 7.1.3 | backend/package.json |
| ESLint | 9.26.0 | ambos manifiestos |
| QR | qrcode ^1.5.4 | frontend/package.json; resolución exacta en lockfile |
| PostgreSQL local | postgres:17-alpine | docker-compose.local.yml |

La versión efectiva del PostgreSQL hospedado y la configuración de la plataforma son **NO VERIFICADO**. No hay ORM: las consultas y migraciones son SQL. React Testing Library trabaja sobre jsdom; no equivale a una prueba con navegador real.

## Reproducibilidad

Desde cada subproyecto use `npm ci`, que respeta el lockfile, y luego los scripts `lint`, `test` y `build`. No existe un `package.json` raíz que orqueste ambos. Las dependencias de exportación documental son independientes: Python, `python-docx` y Pillow; no forman parte del runtime de la aplicación. Véase [anexos](16-glosario-anexos.md).

Referencias: [backend](../../backend/package.json), [frontend](../../frontend/package.json), [lock backend](../../backend/package-lock.json), [lock frontend](../../frontend/package-lock.json).
