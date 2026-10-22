# Registro de validación final

Fecha: 22 de octubre de 2026. Commit de referencia: `9d158a875bacc5b9946501fde7466e47105ee9d6`.

Las seis verificaciones de aplicación concluyeron sin errores: lint, test y build backend/frontend. Backend: 345 pruebas en 35 archivos. Frontend: 178 pruebas en 30 archivos. No se ejecutaron migraciones, pruebas de carga ni conexiones de negocio productivas.

El Word reúne los 16 capítulos técnicos, auditoría y cuatro anexos, además de portada, control de versiones e índice actualizable. Carta, márgenes de una pulgada, cuerpo Calibri 11, interlineado 1.15, encabezado/pie y diez figuras. Se cubren ocho temas de diagramación con once fuentes Mermaid: un ER completo y tres vistas de impresión. Fuentes y procedimiento de regeneración en [glosario y anexos](16-glosario-anexos.md).

El [verificador](herramientas/verificar_manual.py) pasó sin errores: 23 Markdown, 16 capítulos, enlaces locales existentes, referencias de inventarios válidas, once fuentes Mermaid y diez figuras Word. También comprobó campos TOC/PAGE, tamaño carta, márgenes y firmas de tokens/claves. La revisión de las fuentes generadas no encontró credenciales ni datos personales reales.

Las once fuentes pasaron el parser de Mermaid y se renderizaron localmente a SVG/PNG con Mermaid y Microsoft Edge. El script empaquetado `render_docx.py` no pudo utilizarse porque el runtime no contiene LibreOffice. Se utilizó Microsoft Word por COM para actualizar el índice y exportar un PDF local de revisión; se rasterizó con PyMuPDF. La versión final tiene 61 páginas. Se inspeccionó la paginación, tablas y figuras de las páginas renderizadas y se comprobaron límites de texto: sin páginas vacías ni bloques fuera de márgenes. El PDF y las imágenes de QA se conservan solo en `artifacts/manual-audit/`; el entregable formal es el DOCX.

Se corrigieron el borde decorativo de la portada, encabezados de tabla aislados y dimensiones de diagramas. El ER completo permanece ampliable en SVG; las vistas impresas lo dividen por dominio. El índice Word quedó actualizado. La comprobación de datos sensibles usa firmas y revisión de fuentes; no es un escáner DLP certificado.

La comprobación inicial de espacios cubrió también los archivos nuevos mediante comparación contra un directorio vacío. Para la publicación autorizada se vuelve a ejecutar el validador y `git diff --check` sobre los archivos preparados para commit. Los cambios se limitan a documentación y sus herramientas en la rama solicitada.

El trabajo conserva documentos previos y código de aplicación. La fase inicial se entregó sin commit, push ni PR; su publicación posterior hacia `develop` fue autorizada expresamente y queda pendiente de revisión, sin merge. Los hallazgos de auditoría no se corrigen en este PR. Los archivos de evidencias de ejecución se encuentran en el directorio local ignorado `artifacts/manual-audit/`.

## Revisión para publicación

Se regeneró el Word desde las fuentes finales y se volvió a actualizar su índice con Microsoft Word: conserva 61 páginas y los cuatro campos académicos editables. La comparación con la entrega anterior localizó diez páginas con cambios de texto; se revisaron esas páginas y la portada. La comprobación de las 61 páginas no detectó páginas vacías ni bloques fuera de márgenes.

El diccionario identifica explícitamente las definiciones iniciales y cada modificación posterior, y el generador conserva esas etiquetas. La actualización de Word limpia automáticamente los metadatos de autor que Word pudiera añadir al guardar. El validador también comprueba esos metadatos, los campos académicos, la ausencia de protección de edición y de bordes decorativos.

Se repitieron el validador documental, el parser de las once fuentes Mermaid y la comprobación de sintaxis Python. Las pruebas de aplicación consignadas en el capítulo 12 pertenecen a la auditoría del commit base; no se volvieron a ejecutar localmente para estos ajustes exclusivamente documentales. El estado de los checks del PR se consulta en GitHub, sin confundirlo con los resultados históricos de auditoría.
