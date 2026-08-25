-- Guarda el motivo por el que se canceló una solicitud para que quede registro
-- de quién la canceló y por qué, no sólo del cambio de estado.

ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS motivo_cancelacion text,
    ADD COLUMN IF NOT EXISTS cancelada_en timestamp with time zone;

COMMENT ON COLUMN public.ventas.motivo_cancelacion IS 'Motivo capturado al cancelar la solicitud.';
COMMENT ON COLUMN public.ventas.cancelada_en IS 'Fecha y hora en que se canceló la solicitud.';

NOTIFY pgrst, 'reload schema';
