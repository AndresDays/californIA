-- Duración de la cita.
--
-- Todas las citas ocupaban media hora en el calendario, pero hay estudios
-- -resonancias, tomografías con contraste- que llevan la hora completa. Sin
-- guardar la duración, el bloque siguiente se veía libre y se agendaba encima.
-- Por ahora la agenda maneja 30 minutos o 1 hora; las citas existentes quedan
-- en 30, que era lo único que se podía agendar.

alter table public.citas
	add column if not exists duracion_minutos integer not null default 30;

alter table public.citas
	drop constraint if exists citas_duracion_minutos_check;

alter table public.citas
	add constraint citas_duracion_minutos_check check (duracion_minutos in (30, 60));

comment on column public.citas.duracion_minutos is 'Minutos que ocupa la cita en la agenda: 30 o 60.';

NOTIFY pgrst, 'reload schema';
