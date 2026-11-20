-- La duración de la cita ya no es sólo media hora o una hora.
--
-- Cada estudio aparta su tiempo -una hora por resonancia, media por cualquier
-- otro- y una cita con tres resonancias ocupa tres horas. Además se puede
-- alargar a mano. Se acepta cualquier duración en bloques de media hora, de
-- media hora a un día de agenda (12 horas).

alter table public.citas
	drop constraint if exists citas_duracion_minutos_check;

alter table public.citas
	add constraint citas_duracion_minutos_check
	check (duracion_minutos between 30 and 720 and duracion_minutos % 30 = 0);

comment on column public.citas.duracion_minutos is 'Minutos que ocupa la cita en la agenda, en bloques de 30 (de 30 a 720).';

NOTIFY pgrst, 'reload schema';
