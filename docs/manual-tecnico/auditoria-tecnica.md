# Auditoría técnica

Referencia: `develop` y `origin/develop` coincidentes tras fetch; commit `9d158a875bacc5b9946501fde7466e47105ee9d6`. Fecha local: 22/10/2026. Rama de entrega: `docs/manual-tecnico-desarrolladores`. Árbol inicial limpio. Auditoría estática y pruebas locales; sin modificaciones de lógica, migraciones ni interfaces.

## Criterios

Crítica: explotación o pérdida grave demostrada e inmediata. Alta: riesgo sustancial de integridad o seguridad sustentado por código. Media: debilidad o procedimiento incorrecto con impacto condicionado. Baja: mantenibilidad o documentación localizada. Informativa: alcance y evolución. No se identificó un hallazgo crítico demostrado; esto no certifica ausencia de vulnerabilidades.

## Hallazgos altos

### A01 Atomicidad del ejecutor cloud

Evidencia: `backend/src/scripts/cloud-database.ts` en `applyMigrations` ejecuta BEGIN, SQL, registro en app_schema_migrations y COMMIT; `011_cash_sessions.sql` y `012_part_requests.sql` contienen BEGIN/COMMIT propios. El COMMIT interno puede confirmar el DDL antes de registrar el nombre. Una falla posterior deja esquema y ledger desincronizados. Conclusión por semántica y lectura estática; reproducción en PostgreSQL **NO VERIFICADO**. Recomendación: adoptar un único responsable transaccional, probar fallos inducidos y reconciliar ledger antes de reutilizarlo.

### A02 Cambio de cotización concurrente con pago

Evidencia: `services/payment.service.ts`, `updateOrderTotal`, consulta suma y luego llama `orders.updateTotalAmount` sin compartir el bloqueo transaccional de `repositories/payment.repository.ts`, `createPaymentWithLock`. Entre lectura y actualización puede entrar un cobro: el nuevo total podría quedar menor que lo pagado, pese a validar la suma previa. Riesgo inferido del orden de operaciones, sin prueba de carrera real. Recomendación: serializar cambio de total y cobros sobre la misma fila en una transacción y probar dos conexiones concurrentes.

### A03 TLS sin validación de certificado por defecto

Evidencia: `config/env.ts` habilita rejectUnauthorized solo si DB_SSL_REJECT_UNAUTHORIZED es exactamente true; Compose base usa false por defecto. Si se usa TLS sin corregirlo, no se verifica confianza del certificado. Configuración realmente desplegada **NO VERIFICADO**. Recomendación: certificado confiable y validación activa, ensayados con el pooler del entorno.

## Hallazgos medios

| ID | Evidencia y efecto | Recomendación |
| --- | --- | --- |
| M01 | README y architecture describen PostgreSQL en Compose base y reinicialización con down -v; docker-compose.yml solo monta frontend/backend y exige base compartida | Usar overlay explícito para local; actualizar instrucciones sin recomendar borrado de datos |
| M02 | README enumera seis migraciones; development enumera diez e inventa nombres 007/008 distintos del árbol; existen 13 archivos y dos 006 | Mantener inventario real y registro por nombre |
| M03 | README dice Auth prevista y architecture contiene afirmaciones contradictorias; AuthService y middleware ya implementan login y RBAC | Adoptar descripción comprobada y retirar ambigüedad en revisión documental posterior |
| M04 | development declara CSV y filtros pendientes; routers/services implementan reportes completos y CSV, sin PDF | Separar CSV implementado de PDF no encontrado |
| M05 | WorkOrderService.assignWorker actualiza antes de Promise.all de auditoría/evento/notificación; varios servicios auditan después de persistir | Asegurar atomicidad o reconciliación; actualmente pueden existir éxitos parciales |
| M06 | UserService integra Auth y SQL sin transacción distribuida; algunos errores después de persistir perfiles activan compensación solo en Auth | Diseñar idempotencia/reconciliación y probar fallos de cada frontera |
| M07 | Limitador general usa Map por proceso; solo bloqueos Auth se persisten | No describir toda la limitación como distribuida; valorar almacén/perímetro compartido |
| M08 | Importador cloud enumera diez tablas; omite nuevas entidades y copia payments antes de cash_sessions, que ni incluye | No usar como respaldo completo; ampliar y probar estrategia de transferencia |
| M09 | Varias entradas de orden validan id con requireText y no requireUuid; un UUID malformado puede llegar a pg y generar error no previsto | Homogeneizar formato en una tarea de código separada; caso real con DB no ejecutado |

## Hallazgos bajos e informativos

| ID | Severidad | Evidencia |
| --- | --- | --- |
| B01 | Baja | architecture describe carpeta backend mappers inexistente y frontend workers/tracking con nombres distintos de operators/public-tracking |
| B02 | Baja | cashier.routes y part-request.routes contienen lógica y repositorios inline, sin separación uniforme de capas |
| I01 | Informativa | CANCELLED existe en tipo/constraint, pero no se encontró endpoint dedicado para cancelar |
| I02 | Informativa | No hay archivos vercel.json; configuración externa y despliegue efectivo no comprobados |
| I03 | Informativa | RLS explícito en cash_sessions y part_requests; no se acredita política homogénea para otras tablas ni permisos remotos |
| I04 | Informativa | Seed contiene un perfil personal predefinido; no se reproduce y no crea identidad Auth |

## Estado de funcionalidades

Implementadas y conectadas: Auth y usuarios, dashboards, clientes, órdenes y timeline, personal operativo, inventario, solicitudes de repuestos, caja/finanzas, reportes/CSV, auditoría, seguimiento público y configuración. Pendiente/no encontrado: exportación PDF, endpoint de cancelación y transacciones homogéneas para todos los efectos secundarios. Documentado pero **NO VERIFICADO**: despliegue efectivo, backups, protección de ramas y permisos cloud. Obsoleto respecto de este commit: conteos y descripciones históricas de migraciones, reportes y Auth. Inventario legado permanece montado; no se clasifica como código retirado.

## Validaciones y entrega

Las seis verificaciones de aplicación se ejecutaron satisfactoriamente: backend 345 pruebas/35 archivos; frontend 178 pruebas/30 archivos; lint y build de ambos sin errores. Detalles y límites: [calidad](12-pruebas-calidad.md). Markdown, anexos y Word se generan desde fuentes locales. La revisión documental final se registra en `registro-validacion.md`.

La fase de auditoría se entregó inicialmente sin commit, push, PR ni merge. La publicación documental posterior hacia `develop` fue autorizada expresamente; no incluye la corrección de los 3 hallazgos altos, 9 medios y 2 bajos. No se ejecutaron migraciones ni operaciones de negocio productivas. Los únicos cambios entregables están en `docs/manual-tecnico`; instalaciones y logs están ignorados. Prioridad propuesta: A01/A02, TLS, revisión de permisos efectivos y reconciliación entre sistemas; después alinear documentación histórica y automatizar evidencia de contratos y esquema.
