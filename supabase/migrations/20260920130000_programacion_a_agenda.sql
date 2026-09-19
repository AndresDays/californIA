-- La pantalla de programación semanal se retira: la agenda la cubre con fecha,
-- hora, reprogramación y registro de la visita. Lo que ya estaba capturado no
-- se tira: cada médico programado de cada día se convierte en una visita de la
-- agenda, en el día que le tocaba.

insert into public.agenda_visitas (
	id_empleado, id_doctor, medico_nombre, zona, fecha, objetivo, tipo_visita, estatus
)
select
	dia.id_empleado,
	-- En el JSON el médico puede venir ligado al catálogo o sólo como nombre,
	-- que es como ella lo escribía cuando el médico todavía no existía.
	nullif(medico ->> 'id_doctor', '')::integer,
	coalesce(nullif(trim(medico ->> 'nombre'), ''), 'Sin nombre'),
	dia.zona,
	dia.semana_inicio + (dia.dia_semana - 1),
	dia.objetivos,
	'seguimiento',
	-- Lo que ya pasó entra como realizada para que no aparezca como pendiente
	-- de hoy; lo que está por venir se queda programado.
	case when dia.semana_inicio + (dia.dia_semana - 1) < current_date
		then 'realizada' else 'programada' end
from public.programacion_visitas dia
cross join lateral jsonb_array_elements(
	case jsonb_typeof(dia.medicos_programados)
		when 'array' then dia.medicos_programados
		else '[]'::jsonb
	end
) as medico
where coalesce(nullif(trim(medico ->> 'nombre'), ''), '') <> ''
	-- Si la migración se corre dos veces, el mismo médico no entra otra vez al
	-- mismo día.
	and not exists (
		select 1 from public.agenda_visitas ya
		where ya.fecha = dia.semana_inicio + (dia.dia_semana - 1)
			and ya.medico_nombre = coalesce(nullif(trim(medico ->> 'nombre'), ''), 'Sin nombre')
	);

-- La tabla se queda como archivo de lo que se entregó en su momento: ya nadie
-- la escribe, pero borrarla perdería el historial de rutas del año.
comment on table public.programacion_visitas is
	'Histórico de la programación semanal en Excel (pantalla retirada en la versión 2.18.0). Migrada a agenda_visitas; sólo lectura.';

NOTIFY pgrst, 'reload schema';
