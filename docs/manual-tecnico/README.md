# Manual Técnico Interno para Desarrolladores

Sistema de Reconstrucción de Motores · Análisis de Sistemas II · versión 1.0 · 22 de octubre de 2026.

Referencia auditada: `develop`, commit `9d158a875bacc5b9946501fde7466e47105ee9d6`; igualdad con `origin/develop` verificada después de fetch. Rama de documentación: `docs/manual-tecnico-desarrolladores`. El manual describe implementación versionada y pruebas locales; el estado cloud no se presume verificado.

## Capítulos

1. [Introducción, objetivos y alcance](01-introduccion.md)
2. [Arquitectura](02-arquitectura.md)
3. [Tecnologías](03-tecnologias.md)
4. [Instalación y configuración](04-instalacion-configuracion.md)
5. [Estructura del proyecto](05-estructura-proyecto.md)
6. [Base de datos](06-base-datos.md)
7. [Desarrollo backend](07-desarrollo-backend.md)
8. [Desarrollo frontend](08-desarrollo-frontend.md)
9. [Autenticación y seguridad](09-autenticacion-seguridad.md)
10. [API REST](10-api-rest.md)
11. [Módulos funcionales](11-modulos-funcionales.md)
12. [Pruebas y calidad](12-pruebas-calidad.md)
13. [Git y colaboración](13-git-colaboracion.md)
14. [Despliegue y mantenimiento](14-despliegue-mantenimiento.md)
15. [Solución de problemas](15-solucion-problemas.md)
16. [Glosario, conclusiones, recomendaciones y anexos](16-glosario-anexos.md)

## Evidencia y entregables

- [Auditoría técnica y severidades](auditoria-tecnica.md).
- [Catálogo API](anexo-endpoints.md), [esquema SQL](anexo-esquema.md), [rutas frontend](anexo-rutas-frontend.md), [pruebas](anexo-pruebas.md).
- [Word editable](Manual_Tecnico_Sistema_Reconstruccion_Motores.docx).
- [Registro de validación final](registro-validacion.md).
- [Generador reproducible](herramientas/generar_manual.py) y [verificador](herramientas/verificar_manual.py).

## Diagramas mantenibles

| Tema | Mermaid | Figura para Word |
| --- | --- | --- |
| Arquitectura general | [Fuente](diagramas/01-arquitectura-general.mmd) | [PNG](diagramas/01-arquitectura-general.png) |
| Backend | [Fuente](diagramas/02-backend.mmd) | [PNG](diagramas/02-backend.png) |
| Frontend | [Fuente](diagramas/03-frontend.mmd) | [PNG](diagramas/03-frontend.png) |
| Entidad relación | [Fuente completa](diagramas/04-entidad-relacion.mmd) | [Vector ampliable](diagramas/04-entidad-relacion.svg) |
| ER órdenes y personal | [Fuente](diagramas/04a-ordenes-personal.mmd) | [PNG](diagramas/04a-ordenes-personal.png) |
| ER inventario | [Fuente](diagramas/04b-inventario-solicitudes.mmd) | [PNG](diagramas/04b-inventario-solicitudes.png) |
| ER finanzas y seguridad | [Fuente](diagramas/04c-finanzas-seguridad.mmd) | [PNG](diagramas/04c-finanzas-seguridad.png) |
| Autenticación | [Secuencia](diagramas/05-autenticacion.mmd) | [Resumen PNG](diagramas/05-autenticacion.png) |
| Orden de trabajo | [Fuente](diagramas/06-orden-trabajo.mmd) | [PNG](diagramas/06-orden-trabajo.png) |
| Git y CI | [Fuente](diagramas/07-git-ci.mmd) | [PNG](diagramas/07-git-ci.png) |
| Vercel y Supabase | [Fuente](diagramas/08-despliegue.mmd) | [PNG](diagramas/08-despliegue.png) |

Se preservan los documentos previos. Las discrepancias se registran con evidencia en la auditoría; este trabajo no modifica funcionalidades ni configura producción.
