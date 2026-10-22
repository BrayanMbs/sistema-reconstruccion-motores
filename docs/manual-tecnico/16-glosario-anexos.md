# 16 Glosario y anexos

| Término | Significado en este proyecto |
| --- | --- |
| App Router | Enrutamiento por archivos y layouts de Next.js |
| Bearer | Token de acceso presentado en Authorization |
| DTO | Contrato TypeScript de intercambio; no valida por sí solo en runtime |
| RBAC | Restricción de recursos por rol de app_users |
| Repositorio | Clase de persistencia SQL, distinta del repositorio Git |
| Pool | Grupo de conexiones pg por instancia de backend |
| FK / PK | Clave foránea / primaria |
| RLS | Seguridad por filas de PostgreSQL; no demostrada para todo el esquema |
| Liveness | Proceso Express capaz de responder /health |
| Readiness | Conectividad SELECT 1 desde /api/health |
| Migración | Archivo SQL de evolución de esquema |
| Seed | Datos iniciales; no equivale a crear usuarios Auth |
| Cotización | total_amount aprobado de la orden |
| Turno de caja | cash_sessions del actor y pagos vinculados |
| CSV | Exportación de datos tabulares implementada en reportes |
| NO VERIFICADO | Afirmación que no pudo comprobarse con evidencia disponible |

## Conclusiones técnicas

El sistema dispone de módulos administrativos, operativos, inventario y finanzas conectados a una API con sesión y roles. Los repositorios críticos incorporan transacciones y bloqueos; esa garantía no es homogénea para auditoría, cotizaciones y operaciones que involucran Auth. La principal deuda documental es la divergencia con la evolución del código, especialmente entorno Docker, migraciones y reportes.

## Recomendaciones de mantenimiento

Priorice atomicidad del ejecutor SQL y consistencia de cotizaciones; pruebe concurrencia y fallos entre sistemas. Revise TLS y permisos reales de tablas, preserve datos sensibles en los logs y documente restauración. Mantenga contratos de API y catálogos con cada cambio, actualice ambas versiones del manual y distinga pruebas aisladas de validaciones desplegadas.

## Referencias y fuentes complementarias

- [Catálogo de endpoints](anexo-endpoints.md).
- [Diccionario SQL e índices](anexo-esquema.md).
- [Páginas frontend](anexo-rutas-frontend.md).
- [Inventario de pruebas](anexo-pruebas.md).
- [Auditoría clasificada](auditoria-tecnica.md).
- [Arquitectura histórica](../architecture.md), [API histórica](../api.md), [desarrollo](../development.md), [despliegue](../deployment-vercel.md).
- [Caja](../cash-sessions.md), [solicitudes](../part-requests.md), [carga](../load-testing.md), [migración Supabase](../migracion-supabase.md).

Las referencias a código son la fuente primaria para este commit. No se consultaron fuentes externas para atribuir capacidades a plataformas; sus condiciones operativas deben verificarse antes de un despliegue.

## Regenerar Word y anexos

Desde la raíz, con Python y dependencias `python-docx`/Pillow disponibles:

```powershell
python docs/manual-tecnico/herramientas/generar_manual.py
python docs/manual-tecnico/herramientas/verificar_manual.py
git diff --check
```

En Windows con Microsoft Word instalado, `powershell -File docs/manual-tecnico/herramientas/actualizar_word.ps1` actualiza el índice y la paginación y limpia los metadatos de autor después de guardar. El parámetro opcional `-PdfPath artifacts/manual-audit/vista.pdf` exporta una vista para inspección; el directorio debe existir. No forma parte del build de aplicación.

El generador relee rutas, páginas, pruebas y SQL, excluye el seed con datos personales y reúne los 16 capítulos, auditoría y anexos en Word. Las figuras PNG y SVG se renderizan directamente desde Mermaid. El ER completo dispone de tres vistas de impresión con entidades repetidas. Para actualizar figuras, instale `mermaid` y `playwright` en `artifacts/manual-doc-tools` y ejecute `node docs/manual-tecnico/herramientas/renderizar_diagramas.mjs`; requiere Microsoft Edge disponible para renderizar de forma local. El generador Word conserva esas imágenes.

Actualizar los inventarios no reaudita reglas ni actualiza automáticamente este commit de referencia. Después de cambios de código, revise capítulos y resultados de pruebas, identifique el nuevo commit y vuelva a exportar. La revisión visual del Word requiere renderizado; consulte el registro de calidad para conocer si fue posible en esta entrega.
