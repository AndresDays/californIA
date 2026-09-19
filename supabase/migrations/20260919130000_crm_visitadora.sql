-- El módulo de la visitadora eran tres pantallas sueltas: el informe semanal,
-- la programación y el concentrado de comisiones. Todo lo demás —el directorio
-- de médicos con su convenio, los prospectos, los seguimientos, las órdenes
-- entregadas y las altas de eBudaicom— seguía viviendo en libretas, WhatsApp y
-- Excel. Estas tablas traen ese expediente comercial a la aplicación, colgado
-- del catálogo de doctores que ya usan recepción y radiología para no tener dos
-- listas de médicos que se contradicen.

-- --------------------------------------------------------------------------
-- Ficha comercial del médico (1–1 con doctores)
-- --------------------------------------------------------------------------
create table if not exists public.doctores_crm (
	id_doctor integer primary key references public.doctores(id_doctor) on delete cascade,
	whatsapp text,
	direccion_consultorio text,
	hospital text,
	zona text,
	ubicacion text,
	latitud numeric(10,7),
	longitud numeric(10,7),
	-- "Lunes y miércoles de 16:00 a 20:00": se escribe como lo dicta el médico,
	-- porque cada consultorio tiene su propio arreglo.
	horario_consulta text,
	foto_url text,
	-- 'prospecto' es el estado inicial: un médico entra al directorio antes de
	-- tener convenio y va subiendo de estatus.
	estatus text not null default 'prospecto'
		check (estatus in ('activo', 'prospecto', 'inactivo', 'suspendido')),
	frecuencia_visita_dias integer check (frecuencia_visita_dias is null or frecuencia_visita_dias > 0),
	origen_contacto text,
	-- Campos del embudo de prospectos. Viven aquí y no en otra tabla para que
	-- convertir un prospecto en médico activo sea cambiar el estatus, sin
	-- recapturar nada ni perder su historial.
	interes text check (interes is null or interes in ('alto', 'medio', 'bajo')),
	probabilidad_cierre smallint check (probabilidad_cierre is null or probabilidad_cierre between 0 and 100),
	servicios_ofrecidos text,
	fecha_primer_contacto date,
	notas text,
	id_empleado integer references public.empleados(id_empleado),
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_doctores_crm_estatus on public.doctores_crm (estatus);
create index if not exists idx_doctores_crm_zona on public.doctores_crm (zona);

-- --------------------------------------------------------------------------
-- Convenios. Con histórico: subirle las condiciones a un médico no debe borrar
-- con qué convenio se trabajó el año pasado.
-- --------------------------------------------------------------------------
create table if not exists public.convenios_medico (
	id_convenio uuid primary key default gen_random_uuid(),
	id_doctor integer not null references public.doctores(id_doctor) on delete cascade,
	tipo text not null
		check (tipo in ('mixto', 'puntos', 'especial', 'prospecto', 'sin_convenio')),
	condiciones text,
	usa_ordenes_clinica boolean not null default false,
	maneja_puntos boolean not null default false,
	vigente_desde date not null default current_date,
	vigente_hasta date,
	activo boolean not null default true,
	id_empleado integer references public.empleados(id_empleado),
	created_at timestamp with time zone default now()
);

create index if not exists idx_convenios_medico_doctor
	on public.convenios_medico (id_doctor, vigente_desde desc);
-- Un solo convenio vigente por médico: el histórico se conserva con activo=false.
create unique index if not exists idx_convenios_medico_vigente
	on public.convenios_medico (id_doctor) where activo;

-- --------------------------------------------------------------------------
-- Agenda de visitas. La programación semanal por día se queda como está (es el
-- Excel que ella entrega); esto son las visitas individuales con fecha y hora,
-- que sí se reprograman y se marcan como realizadas.
-- --------------------------------------------------------------------------
create table if not exists public.agenda_visitas (
	id_agenda uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	id_doctor integer references public.doctores(id_doctor) on delete set null,
	medico_nombre text not null,
	especialidad text,
	zona text,
	fecha date not null,
	hora time,
	objetivo text,
	tipo_visita text not null default 'seguimiento'
		check (tipo_visita in (
			'seguimiento', 'prospeccion', 'entrega_ordenes',
			'reactivacion_convenio', 'presentacion_servicios', 'cobranza', 'otro'
		)),
	estatus text not null default 'programada'
		check (estatus in ('programada', 'realizada', 'reprogramada', 'cancelada')),
	resultado text,
	proximo_seguimiento date,
	-- Cuando la visita se registra, aquí queda el enlace al renglón del informe.
	id_visita uuid references public.visitas_medicas(id_visita) on delete set null,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_agenda_visitas_fecha on public.agenda_visitas (fecha);
create index if not exists idx_agenda_visitas_doctor on public.agenda_visitas (id_doctor);

-- --------------------------------------------------------------------------
-- Lo que trae el informe hoy no alcanza para el expediente: faltaba separar el
-- objetivo del resultado, lo que se ofreció de lo que se entregó, y la fecha
-- del siguiente paso.
-- --------------------------------------------------------------------------
alter table public.visitas_medicas add column if not exists tipo_visita text;
alter table public.visitas_medicas add column if not exists objetivo text;
alter table public.visitas_medicas add column if not exists resultado text;
alter table public.visitas_medicas add column if not exists que_se_ofrecio text;
alter table public.visitas_medicas add column if not exists que_se_entrego text;
alter table public.visitas_medicas add column if not exists compromisos text;
alter table public.visitas_medicas add column if not exists proxima_accion text;
alter table public.visitas_medicas add column if not exists fecha_seguimiento date;
alter table public.visitas_medicas add column if not exists id_agenda uuid
	references public.agenda_visitas(id_agenda) on delete set null;

create index if not exists idx_visitas_medicas_seguimiento
	on public.visitas_medicas (fecha_seguimiento) where fecha_seguimiento is not null;

-- --------------------------------------------------------------------------
-- Pendientes. Un solo lugar para "hablarle al doctor", "entregar órdenes",
-- "crear su usuario en eBudaicom" o "felicitarlo por su cumpleaños".
-- --------------------------------------------------------------------------
create table if not exists public.tareas_seguimiento (
	id_tarea uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	id_doctor integer references public.doctores(id_doctor) on delete cascade,
	medico_nombre text,
	tipo text not null default 'seguimiento'
		check (tipo in (
			'seguimiento', 'llamada', 'entrega_ordenes', 'reactivar_convenio',
			'alta_ebudaicom', 'confirmar_cita', 'visita', 'cumpleanos', 'otro'
		)),
	descripcion text,
	fecha_objetivo date not null,
	estado text not null default 'pendiente'
		check (estado in ('pendiente', 'hecha', 'cancelada')),
	completada_en timestamp with time zone,
	notas text,
	created_at timestamp with time zone default now()
);

create index if not exists idx_tareas_seguimiento_pendientes
	on public.tareas_seguimiento (fecha_objetivo) where estado = 'pendiente';
create index if not exists idx_tareas_seguimiento_doctor
	on public.tareas_seguimiento (id_doctor);

-- --------------------------------------------------------------------------
-- Órdenes médicas entregadas: cuántas se dejaron, cuándo, y cuáles toca renovar.
-- --------------------------------------------------------------------------
create table if not exists public.ordenes_medicas_entregadas (
	id_entrega uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	id_doctor integer not null references public.doctores(id_doctor) on delete cascade,
	fecha_entrega date not null default current_date,
	cantidad integer not null default 0 check (cantidad >= 0),
	tipo_orden text,
	folios text,
	-- Cuando se acaben o caduquen, aquí está la fecha que dispara el recordatorio.
	fecha_renovacion date,
	seguimiento text,
	observaciones text,
	created_at timestamp with time zone default now()
);

create index if not exists idx_ordenes_entregadas_doctor
	on public.ordenes_medicas_entregadas (id_doctor, fecha_entrega desc);

-- --------------------------------------------------------------------------
-- eBudaicom: quién ya tiene usuario y quién sigue pendiente.
-- --------------------------------------------------------------------------
create table if not exists public.ebudaicom_medicos (
	id_doctor integer primary key references public.doctores(id_doctor) on delete cascade,
	estado text not null default 'pendiente'
		check (estado in ('pendiente', 'creado', 'activo', 'no_aplica')),
	usuario text,
	fecha_creacion date,
	observaciones text,
	id_empleado integer references public.empleados(id_empleado),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_ebudaicom_estado on public.ebudaicom_medicos (estado);

-- --------------------------------------------------------------------------
-- Qué estudios ofrecerle a cada especialidad. Es la chuleta que ella consulta
-- parada en el consultorio, sobre los catálogos de estudios que ya existen.
-- --------------------------------------------------------------------------
create table if not exists public.servicios_por_especialidad (
	id_servicio uuid primary key default gen_random_uuid(),
	especialidad text not null,
	nombre_servicio text not null,
	categoria text not null default 'laboratorio'
		check (categoria in ('laboratorio', 'imagen', 'especializado', 'paquete')),
	descripcion text,
	orden smallint not null default 0,
	activo boolean not null default true,
	unique (especialidad, nombre_servicio)
);

create index if not exists idx_servicios_especialidad
	on public.servicios_por_especialidad (especialidad) where activo;

-- --------------------------------------------------------------------------
-- Permisos. Se reutilizan las funciones del módulo: quien entra al módulo de
-- visitadora trabaja su cartera; nadie más ve estas tablas.
-- --------------------------------------------------------------------------
alter table public.doctores_crm enable row level security;
alter table public.convenios_medico enable row level security;
alter table public.agenda_visitas enable row level security;
alter table public.tareas_seguimiento enable row level security;
alter table public.ordenes_medicas_entregadas enable row level security;
alter table public.ebudaicom_medicos enable row level security;
alter table public.servicios_por_especialidad enable row level security;

do $$
declare
	tabla text;
begin
	foreach tabla in array array[
		'doctores_crm', 'convenios_medico', 'agenda_visitas', 'tareas_seguimiento',
		'ordenes_medicas_entregadas', 'ebudaicom_medicos'
	] loop
		execute format('drop policy if exists %I_todo_visitadora on public.%I', tabla, tabla);
		execute format(
			'create policy %I_todo_visitadora on public.%I for all to authenticated
			 using (public.es_usuario_visitadora()) with check (public.es_usuario_visitadora())',
			tabla, tabla
		);
	end loop;
end $$;

-- El catálogo de servicios lo lee cualquier empleado interno (sirve en
-- recepción para orientar al paciente), pero sólo el módulo lo edita.
drop policy if exists servicios_especialidad_select_interno on public.servicios_por_especialidad;
create policy servicios_especialidad_select_interno
on public.servicios_por_especialidad
for select to authenticated
using (public.es_empleado_interno_activo());

drop policy if exists servicios_especialidad_escribe_visitadora on public.servicios_por_especialidad;
create policy servicios_especialidad_escribe_visitadora
on public.servicios_por_especialidad
for all to authenticated
using (public.es_usuario_visitadora())
with check (public.es_usuario_visitadora());

-- --------------------------------------------------------------------------
-- Semilla mínima del catálogo de servicios, para que la pantalla no nazca
-- vacía. Se amplía desde la aplicación.
-- --------------------------------------------------------------------------
insert into public.servicios_por_especialidad (especialidad, nombre_servicio, categoria, descripcion, orden)
values
	('Medicina General', 'Química sanguínea de 6 elementos', 'laboratorio', 'Control de rutina y chequeo anual.', 1),
	('Medicina General', 'Biometría hemática completa', 'laboratorio', 'Estudio base de cualquier valoración.', 2),
	('Medicina Interna', 'Perfil tiroideo', 'laboratorio', 'Seguimiento de hipotiroidismo e hipertiroidismo.', 1),
	('Medicina Interna', 'Ultrasonido de abdomen completo', 'imagen', 'Dolor abdominal y control de hígado graso.', 2),
	('Ginecología', 'Ultrasonido pélvico y transvaginal', 'imagen', 'Control ginecológico y seguimiento de embarazo temprano.', 1),
	('Ginecología', 'Mastografía', 'imagen', 'Tamizaje anual a partir de los 40 años.', 2),
	('Traumatología', 'Radiografía simple', 'imagen', 'Urgencia y control de fracturas.', 1),
	('Traumatología', 'Resonancia magnética de rodilla', 'imagen', 'Lesión de meniscos y ligamentos.', 2),
	('Pediatría', 'Biometría hemática completa', 'laboratorio', 'Control del niño sano.', 1),
	('Pediatría', 'Radiografía de tórax', 'imagen', 'Cuadros respiratorios.', 2),
	('Cardiología', 'Perfil de lípidos', 'laboratorio', 'Riesgo cardiovascular.', 1),
	('Cardiología', 'Tomografía de tórax', 'imagen', 'Valoración cardiopulmonar.', 2),
	('Urología', 'Antígeno prostático', 'laboratorio', 'Tamizaje en mayores de 45 años.', 1),
	('Urología', 'Ultrasonido renal y vesicoprostático', 'imagen', 'Litiasis y crecimiento prostático.', 2)
on conflict (especialidad, nombre_servicio) do nothing;

NOTIFY pgrst, 'reload schema';
