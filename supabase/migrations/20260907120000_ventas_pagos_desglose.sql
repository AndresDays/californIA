-- Un cobro se puede repartir entre varias formas de pago (parte con tarjeta y
-- el resto en efectivo). La venta sigue guardando `forma_pago` para lo que ya
-- lo leía —queda como 'mixto' cuando hay más de una— y el detalle vive aquí,
-- para que el reporte de ventas pueda repartir el importe por forma sin volver
-- a consultar los movimientos.
--
-- Forma: [{"forma_pago": "tarjeta_credito", "monto": 1000,
--          "tarjeta_ultimos4": "1234", "codigo_aprobacion": "A1B2C3"}, ...]

ALTER TABLE public.ventas
	ADD COLUMN IF NOT EXISTS pagos_desglose jsonb;

COMMENT ON COLUMN public.ventas.pagos_desglose IS
	'Desglose del cobro por forma de pago cuando la venta se pagó con más de una. Nulo si hubo una sola forma.';
