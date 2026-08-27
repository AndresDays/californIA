-- La visitadora entregaba su informe semanal de visitas y su programación de
-- rutas en Excel, y las comisiones de los médicos se calculaban a mano: por eso
-- en el reporte de agosto hay tres médicos distintos reclamando comisiones que
-- nadie sabía si estaban pagadas. Estas tablas mueven los dos Excel a la
-- aplicación y dejan que la comisión salga de las ventas ya capturadas.

create table if not exists public.visitas_medicas (
	id_visita uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	fecha date not null,
	-- Cuando el nombre empata con el catálogo se guarda el id: ése es el enlace
	-- que hace que la visita cuente para el concentrado de comisiones.
	id_doctor integer references public.doctores(id_doctor),
	medico_nombre text not null,
	especialidad text,
	ubicacion text,
	zona text,
	actividades text,
	comentarios_medico text,
	observaciones text,
	seguimiento text,
	-- Texto libre a propósito: en el Excel real conviven "MIXTO", "PUNTOS",
	-- "N/A" y párrafos completos describiendo el convenio.
	tipo_convenio text,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_visitas_medicas_fecha
	on public.visitas_medicas (fecha desc);
create index if not exists idx_visitas_medicas_doctor
	on public.visitas_medicas (id_doctor);

create table if not exists public.programacion_visitas (
	id_programacion uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	semana_inicio date not null,
	dia_semana smallint not null check (dia_semana between 1 and 7),
	zona text,
	-- [{ "nombre": "Camila Ross", "id_doctor": 42 }] — se guarda el nombre tal
	-- cual lo escribe ella y, cuando empata con el catálogo, también el id.
	medicos_programados jsonb not null default '[]'::jsonb,
	objetivos text,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now(),
	unique (id_empleado, semana_inicio, dia_semana)
);

create index if not exists idx_programacion_visitas_semana
	on public.programacion_visitas (semana_inicio desc);

-- El porcentaje lleva fecha de vigencia porque a los médicos se les sube
-- conforme aumenta su flujo de pacientes. Sin vigencia, subirle a uno de 10% a
-- 15% recalcularía hacia atrás los meses ya pagados.
create table if not exists public.comisiones_doctor (
	id_comision uuid primary key default gen_random_uuid(),
	id_doctor integer not null references public.doctores(id_doctor) on delete cascade,
	porcentaje numeric(5,2) not null check (porcentaje >= 0 and porcentaje <= 100),
	vigente_desde date not null,
	-- Aquí viven las excepciones que todavía no se modelan, del estilo
	-- "15% general y 20% en resonancia magnética de corazón".
	notas text,
	created_at timestamp with time zone default now(),
	unique (id_doctor, vigente_desde)
);

create index if not exists idx_comisiones_doctor_vigencia
	on public.comisiones_doctor (id_doctor, vigente_desde desc);

-- Mientras el mes está abierto el concentrado se calcula en vivo desde ventas.
-- Al cerrarlo se congela aquí para que un cambio posterior de porcentaje o una
-- venta capturada tarde no muevan lo que ya se pagó.
create table if not exists public.comisiones_mensuales (
	id_mensual uuid primary key default gen_random_uuid(),
	id_doctor integer not null references public.doctores(id_doctor),
	periodo date not null,
	ordenes integer not null default 0,
	ingreso_generado numeric(12,2) not null default 0,
	porcentaje numeric(5,2) not null default 0,
	comision numeric(12,2) not null default 0,
	estado text not null default 'cerrado' check (estado in ('cerrado', 'pagado')),
	cerrado_por integer references public.empleados(id_empleado),
	cerrado_en timestamp with time zone default now(),
	pagado_en timestamp with time zone,
	referencia_pago text,
	unique (id_doctor, periodo)
);

create index if not exists idx_comisiones_mensuales_periodo
	on public.comisiones_mensuales (periodo desc);

-- Quién entra al módulo. Nadie más: ni recepción, ni laboratorio, ni el
-- radiólogo clínico. 'radiologo' es como se guarda "Radiólogo - Director"
-- (ver normalizarRolUsuario en src/utils/usuarios-auth.js).
create or replace function public.es_usuario_visitadora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
			and regexp_replace(
				translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu'),
				'[[:space:]]+',
				'_',
				'g'
			) in (
				'visitadora',
				'visitador',
				'admin',
				'administrador',
				'desarrollador',
				'radiologo',
				'radiologo_director'
			)
	);
$$;

grant execute on function public.es_usuario_visitadora() to authenticated;

-- Quién mueve dinero: fija porcentajes, cierra el mes y marca pagos. La
-- visitadora queda fuera a propósito — ella consulta, no autoriza.
create or replace function public.es_usuario_comisiones_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
			and regexp_replace(
				translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu'),
				'[[:space:]]+',
				'_',
				'g'
			) in (
				'admin',
				'administrador',
				'desarrollador',
				'radiologo',
				'radiologo_director'
			)
	);
$$;

grant execute on function public.es_usuario_comisiones_admin() to authenticated;

alter table public.visitas_medicas enable row level security;
alter table public.programacion_visitas enable row level security;
alter table public.comisiones_doctor enable row level security;
alter table public.comisiones_mensuales enable row level security;

-- El informe y la programación son de la visitadora: los captura, los corrige y
-- los borra ella misma. Administración y dirección los ven y los corrigen igual.
drop policy if exists visitas_medicas_todo_visitadora on public.visitas_medicas;
create policy visitas_medicas_todo_visitadora
on public.visitas_medicas
for all
to authenticated
using (public.es_usuario_visitadora())
with check (public.es_usuario_visitadora());

drop policy if exists programacion_visitas_todo_visitadora on public.programacion_visitas;
create policy programacion_visitas_todo_visitadora
on public.programacion_visitas
for all
to authenticated
using (public.es_usuario_visitadora())
with check (public.es_usuario_visitadora());

-- Los porcentajes y los cierres se consultan desde el módulo, pero sólo
-- administración y dirección los escriben.
drop policy if exists comisiones_doctor_select_modulo on public.comisiones_doctor;
create policy comisiones_doctor_select_modulo
on public.comisiones_doctor
for select
to authenticated
using (public.es_usuario_visitadora());

drop policy if exists comisiones_doctor_escribe_admin on public.comisiones_doctor;
create policy comisiones_doctor_escribe_admin
on public.comisiones_doctor
for all
to authenticated
using (public.es_usuario_comisiones_admin())
with check (public.es_usuario_comisiones_admin());

drop policy if exists comisiones_mensuales_select_modulo on public.comisiones_mensuales;
create policy comisiones_mensuales_select_modulo
on public.comisiones_mensuales
for select
to authenticated
using (public.es_usuario_visitadora());

drop policy if exists comisiones_mensuales_escribe_admin on public.comisiones_mensuales;
create policy comisiones_mensuales_escribe_admin
on public.comisiones_mensuales
for all
to authenticated
using (public.es_usuario_comisiones_admin())
with check (public.es_usuario_comisiones_admin());

NOTIFY pgrst, 'reload schema';
