# Solicitudes y cargos de repuestos

Aplicar `backend/database/migrations/012_part_requests.sql` antes de ejecutar esta versión. La tabla tiene RLS y no se expone a clientes de Supabase. El backend usa su conexión privada a PostgreSQL.

- Operario: desde una orden asignada y activa, seleccionar un artículo del catálogo, cantidad y motivo. Se permite solicitar artículos sin stock; la aprobación espera la entrada de existencias. No se reservan ni descuentan unidades al solicitar.
- Administrador o encargado de inventario: entrar en **Solicitudes de repuestos**, revisar stock y definir el **precio unitario de venta**. Se muestra el costo de referencia original y se propone como precio inicial de venta; el revisor puede ajustarlo antes de confirmar. Para rechazar es obligatoria una observación.
- Aprobar requiere que la orden siga activa y que tenga un total cotizado. Si no lo tiene, Administración debe definirlo primero. Se evita inicializar el total a solo los repuestos omitiendo el costo de reparación.
- En una transacción se bloquea la solicitud, la orden y el artículo, se registra la salida de inventario y se suma cantidad × precio (redondeado a centavos) al total aprobado. La solicitud queda resuelta y no se puede aprobar dos veces. Un error revierte todos los cambios.
- Los repuestos aprobados figuran en el resumen de la orden de caja. El saldo usa el total actualizado menos los pagos existentes. El resumen aclara que los cargos ya están incluidos: no se suman de nuevo al cobrar.
- Las salidas de estas solicitudes se consultan en el historial de inventario y el historial de la orden. Se conservan separadas de las asignaciones manuales antiguas, que no deben usarse para descontar otra vez el mismo repuesto. No existe reversión de una aprobación en este flujo.
- Si se modifica manualmente el total de una orden después de una aprobación, debe ingresarse el total final incluyendo los repuestos aprobados.

API `/api/part-requests`: catálogo de lectura y solicitudes de la orden asignada para OPERATOR; bandeja de lectura y revisión para ADMIN/INVENTORY. Otros roles no tienen acceso. El resumen de caja expone los cargos aprobados mediante su endpoint autorizado existente.
