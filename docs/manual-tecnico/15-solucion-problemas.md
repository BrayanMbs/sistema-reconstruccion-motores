# 15 Solución de problemas

| Síntoma | Comprobación y resolución |
| --- | --- |
| Backend exige DATABASE_URL | NODE_ENV o CLOUD_DATABASE_REQUIRED activan modo compartido; defina URL de desarrollo o use overlay local |
| Error al resolver postgres desde Windows | DB_HOST=postgres solo existe en red Docker; arranque desde backend con host local correcto |
| /health responde pero /api/health falla | Proceso vivo y base inaccesible; revise URL, puerto, pooler, red y TLS sin imprimir credenciales |
| Readiness correcta y consultas fallan | SELECT 1 no revisa tablas; compare migraciones y esquema en el entorno de ensayo |
| AUTH_NOT_CONFIGURED | Faltan URL o clave anónima del backend |
| AUTH_ADMIN_NOT_CONFIGURED | Falta configuración administrativa privada; nunca use la clave de servicio en navegador |
| INVALID_CREDENTIALS | Cuenta/clave incorrecta, perfil ausente o inactivo; inspeccione de manera autorizada Auth y app_users por UUID |
| PROFILE_NOT_FOUND o USER_INACTIVE | El token no sustituye un perfil válido; revise reconciliación de identidades |
| PASSWORD_CHANGE_REQUIRED | Complete /cambiar-contrasena con cuenta de prueba; no quite la bandera manualmente como solución rutinaria |
| 403 en área aparentemente válida | Compare rol exacto del router y dueño de orden; ADMIN no accede por herencia a operativo |
| Navegador bloquea acceso a API | Revise NEXT_PUBLIC_API_URL, origen CORS exacto y redeploy tras cambiar variables públicas |
| 429 | Respete Retry-After; revise ventanas y proxy; no desactive límites productivos para eludir el bloqueo |
| CASH_SESSION_NOT_OPEN | CASHIER necesita abrir turno antes del cobro |
| CASH_DIFFERENCE_NOTE_REQUIRED | Explique diferencia entre efectivo contado y esperado |
| ORDER_TOTAL_NOT_DEFINED o ORDER_QUOTE_REQUIRED | ADMIN debe aprobar monto antes de cobro/aprobación de repuesto |
| INSUFFICIENT_STOCK | Revise existencias y solicitudes concurrentes; no fuerce negativos |
| SQL nuevo no aparece en Docker existente | initdb no repite scripts; prepare migración pendiente con respaldo, no borre el volumen |
| Exportación parcial | Revise X-Export-Truncated y límite 5000; reduzca filtros/rango |
| Índice Word vacío o antiguo | Actualice toda la tabla en Word; el archivo contiene campo TOC y estilos jerárquicos |

Para reportar un fallo incluya commit, entorno, hora local, ruta, método, código HTTP, código de error y pasos con datos ficticios. Quite Authorization, cookies, claves, contraseñas, códigos reales de seguimiento y datos personales. No adjunte `.env` ni volcados productivos.

La guía histórica [primeros pasos](../primeros-pasos.md) puede aportar contexto, pero no sustituye las correcciones verificadas de [instalación](04-instalacion-configuracion.md).
