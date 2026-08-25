-- Los cobros con tarjeta se concilian con la terminal: se guardan los últimos
-- cuatro dígitos y el código de aprobación tanto en la venta como en cada
-- movimiento de pago.

ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS tarjeta_ultimos4 text,
    ADD COLUMN IF NOT EXISTS codigo_aprobacion text;

ALTER TABLE public.movimientos_pago_venta
    ADD COLUMN IF NOT EXISTS tarjeta_ultimos4 text,
    ADD COLUMN IF NOT EXISTS codigo_aprobacion text;

ALTER TABLE public.ventas
    DROP CONSTRAINT IF EXISTS ventas_tarjeta_ultimos4_check;
ALTER TABLE public.ventas
    ADD CONSTRAINT ventas_tarjeta_ultimos4_check
    CHECK (tarjeta_ultimos4 IS NULL OR tarjeta_ultimos4 ~ '^[0-9]{4}$');

ALTER TABLE public.movimientos_pago_venta
    DROP CONSTRAINT IF EXISTS movimientos_pago_venta_tarjeta_ultimos4_check;
ALTER TABLE public.movimientos_pago_venta
    ADD CONSTRAINT movimientos_pago_venta_tarjeta_ultimos4_check
    CHECK (tarjeta_ultimos4 IS NULL OR tarjeta_ultimos4 ~ '^[0-9]{4}$');

COMMENT ON COLUMN public.ventas.tarjeta_ultimos4 IS 'Últimos 4 dígitos de la tarjeta con la que se cobró.';
COMMENT ON COLUMN public.ventas.codigo_aprobacion IS 'Código de aprobación que devolvió la terminal.';
COMMENT ON COLUMN public.movimientos_pago_venta.tarjeta_ultimos4 IS 'Últimos 4 dígitos de la tarjeta del movimiento.';
COMMENT ON COLUMN public.movimientos_pago_venta.codigo_aprobacion IS 'Código de aprobación de la terminal para el movimiento.';

NOTIFY pgrst, 'reload schema';
