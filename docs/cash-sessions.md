# Apertura y cierre de caja

Aplicar `backend/database/migrations/011_cash_sessions.sql` antes de desplegar el backend. No elimina ni asigna retroactivamente pagos existentes. Docker local la ejecuta al inicializar un volumen nuevo; para bases existentes aplicar el SQL con el mecanismo habitual de migraciones, sin eliminar volúmenes.

En Inicio y Cierre de caja, cada usuario opera únicamente sus propios turnos. Registrar un fondo inicial (puede ser Q 0.00) abre la caja. Solo puede existir un turno abierto por cajero, incluso entre varias pestañas. El cajero necesita abrir antes de registrar un cobro. Los pagos administrativos existentes siguen disponibles; si el administrador tiene un turno abierto, sus pagos se asocian a este.

El efectivo esperado es fondo inicial más pagos en efectivo asociados al turno. Transferencias, tarjeta y otros métodos no se suman al efectivo físico. Los turnos pueden cruzar medianoche; los resúmenes diarios siguen siendo independientes. Al cerrar se registra efectivo contado, esperado y observaciones; una diferencia requiere explicación. No hay retiros, gastos ni reapertura de turnos en este flujo.

API autenticada para ADMIN/CASHIER:
- GET `/api/cashier/sessions`: hasta 30 turnos del usuario, el más reciente primero.
- POST `/api/cashier/sessions/open`: `{ "openingAmount": "100.00" }`.
- POST `/api/cashier/sessions/close`: `{ "sessionId": "uuid-del-turno", "countedCash": "150.00", "notes": "" }`.

Apertura, cierre y registro de pagos comparten bloqueo transaccional del usuario para impedir cobros simultáneos al cierre. Los cierres se conservan y se auditan. La tabla tiene RLS sin políticas públicas; el backend debe conectarse con el rol privado propietario o un rol con BYPASSRLS. No conceder acceso directo a clientes públicos.
