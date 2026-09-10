-- Observaciones sobre un doctor.
--
-- Lo que recepción se entera del médico mientras captura -que cambió de
-- consultorio, que pidió que le llamen antes de mandar resultados, que se quejó
-- de un precio- hoy no tiene dónde anotarse: se cuenta de palabra y se pierde.
-- Queda escrito en el propio doctor y se avisa a quien tiene que actuar: la
-- visitadora, que es quien lo visita, y dirección.
--
-- Es una bitácora, no un campo: se agregan observaciones, no se corrigen, para
-- que quede el historial de lo que se fue sabiendo y quién lo anotó.

create table if not exists public.doctor_observaciones (
	id bigint generated always as identity primary key,
	id_doctor integer not null references public.doctores (id_doctor) on delete cascade,
	observacion text not null,
	id_empleado integer references public.empleados (id_empleado) on delete set null,
	-- El nombre se copia además del id porque el empleado puede darse de baja y
	-- la observación tiene que seguir diciendo quién la anotó.
	creado_por_nombre text,
	created_at timestamp with time zone not null default now(),
	constraint doctor_observaciones_texto_check check (btrim(observacion) <> '')
);

comment on table public.doctor_observaciones is 'Bitácora de lo que el personal anota sobre un doctor; cada alta avisa a visitadora y dirección.';

create index if not exists idx_doctor_observaciones_doctor
	on public.doctor_observaciones (id_doctor, created_at desc);

alter table public.doctor_observaciones enable row level security;

-- Cualquier empleado activo anota y lee: quien captura es quien se entera, y
-- quien lo va a atender necesita ver lo anterior. Los clientes de convenio y
-- los médicos externos no entran aquí.
drop policy if exists doctor_observaciones_interno on public.doctor_observaciones;
create policy doctor_observaciones_interno on public.doctor_observaciones
for select to authenticated
using (public.es_empleado_interno_activo());

drop policy if exists doctor_observaciones_alta on public.doctor_observaciones;
create policy doctor_observaciones_alta on public.doctor_observaciones
for insert to authenticated
with check (public.es_empleado_interno_activo());

-- Quién se entera: la visitadora, porque es quien visita al médico, y dirección
-- -radiólogo director, administración y desarrollo-, que es quien decide.
create or replace function public.destinatarios_observacion_doctor()
returns table (auth_uuid uuid, nombre text, email text)
language sql
stable
security definer
set search_path = public
as $$
	select e.auth_uuid, e.nombre::text, nullif(btrim(e.email), '')::text
	from public.empleados e
	where coalesce(e.activo, true) = true
		and e.auth_uuid is not null
		and regexp_replace(
			translate(lower(btrim(coalesce(e.rol, ''))), 'áéíóúü', 'aeiouu'),
			'[^a-z0-9]+', '_', 'g'
		) in (
			'admin',
			'administrador',
			'desarrollador',
			'radiologo',
			'radiologo_director',
			'visitadora',
			'visitador'
		);
$$;

grant execute on function public.destinatarios_observacion_doctor() to authenticated;

create or replace function public.avisar_observacion_doctor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_actor uuid := auth.uid();
	v_doctor text;
	v_quien text;
	v_titulo text;
	v_mensaje text;
	v_destinatario record;
begin
	select btrim(concat_ws(' ',
		coalesce(nullif(btrim(d.primer_nombre), ''), d.nombre),
		d.apellido_paterno,
		d.apellido_materno
	))
	into v_doctor
	from public.doctores d
	where d.id_doctor = new.id_doctor;
	v_doctor := coalesce(nullif(v_doctor, ''), 'Doctor sin nombre');

	v_quien := coalesce(nullif(btrim(new.creado_por_nombre), ''), 'un usuario');

	v_titulo := 'Observación de doctor · ' || v_doctor;
	-- La observación entera va en el mensaje: es lo único que se necesita saber,
	-- y obligar a abrir otra pantalla para leerla haría que nadie la lea.
	v_mensaje := new.observacion || ' (anotó ' || v_quien || ')';

	for v_destinatario in select * from public.destinatarios_observacion_doctor() loop
		-- Quien la anotó no se avisa a sí mismo: acaba de escribirla.
		continue when v_actor is not null and v_destinatario.auth_uuid = v_actor;

		-- Un renglón por persona: así el `read_at` de la campana es de cada
		-- quien, y que la visitadora lo lea no le apaga el aviso a dirección.
		insert into public.notificaciones (
			titulo, mensaje, tipo, canal_destino, usuario_destino,
			entidad_tipo, entidad_id, action_path
		)
		values (
			v_titulo, v_mensaje, 'info', 'usuario', v_destinatario.auth_uuid,
			'doctor_observacion', new.id_doctor, '/doctores'
		);
	end loop;

	return new;
end;
$$;

drop trigger if exists observacion_doctor_avisa on public.doctor_observaciones;
create trigger observacion_doctor_avisa
after insert on public.doctor_observaciones
for each row execute function public.avisar_observacion_doctor();

notify pgrst, 'reload schema';
