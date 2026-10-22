# 1 Introducción

El Sistema de Reconstrucción de Motores centraliza clientes, órdenes, asignación de técnicos, existencias, solicitudes de repuestos, cobros y seguimiento de reparaciones. Este manual está dirigido a desarrolladores que deben instalarlo, comprender sus contratos, extenderlo y mantenerlo. La referencia es el código de `develop`, commit `9d158a875bacc5b9946501fde7466e47105ee9d6`, actualizado y comparado con `origin/develop` el 22 de octubre de 2026, zona America/Guatemala. La rama documental es `docs/manual-tecnico-desarrolladores`.

## Objetivos

- Explicar la arquitectura cliente-servidor y las responsabilidades reales de sus capas.
- Proporcionar procedimientos de incorporación, pruebas y diagnóstico que preserven los datos.
- Identificar diferencias entre documentación histórica e implementación y señalar riesgos pendientes.
- Mantener Markdown y Word a partir de las mismas fuentes y de inventarios reproducibles.

## Alcance y método

Se revisaron manifiestos y lockfiles, configuración Docker y CI, rutas HTTP y páginas, middleware de acceso, servicios, repositorios, validadores, contratos y migraciones versionadas. Los anexos registran el inventario de endpoints, páginas, pruebas y esquema SQL. El estado «implementado» significa que existe código conectado a rutas; no certifica que una instancia productiva funcione correctamente.

**NO VERIFICADO**: configuración de cuentas Vercel/Supabase, esquema y permisos efectivos de la base remota, backups, restauración, usuarios reales, secretos desplegados y protecciones de ramas en GitHub. No se ejecutaron migraciones ni operaciones de negocio contra servicios productivos. No se copiaron `.env` privados ni datos personales del seed.

Los hallazgos están en [auditoría técnica](auditoria-tecnica.md). El [índice](README.md) permite navegar por tareas. Las guías anteriores se conservan como antecedentes; ante una discrepancia, este manual describe exclusivamente el commit identificado y no reemplaza una revisión de cambios futuros.
