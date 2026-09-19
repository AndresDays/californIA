-- La plataforma que usan los médicos dejó de llamarse eBudaicom: en la clínica
-- y con los propios médicos ahora es VisorDICOM. El nombre viejo estaba tanto
-- en la tabla como en el tipo de pendiente "crear usuario", así que se renombra
-- en los dos lados para que la aplicación y la base digan lo mismo.

-- El renombre corre después de 20260919130000_crm_visitadora.sql, pero se
-- escribe de modo que también funcione si aquella migración todavía no se
-- aplicó en este entorno: cada paso comprueba antes de tocar nada.
do $$
begin
	if exists (
		select 1 from pg_tables where schemaname = 'public' and tablename = 'ebudaicom_medicos'
	) and not exists (
		select 1 from pg_tables where schemaname = 'public' and tablename = 'visordicom_medicos'
	) then
		alter table public.ebudaicom_medicos rename to visordicom_medicos;
		alter index if exists idx_ebudaicom_estado rename to idx_visordicom_estado;
	end if;
end $$;

create table if not exists public.visordicom_medicos (
	id_doctor integer primary key references public.doctores(id_doctor) on delete cascade,
	estado text not null default 'pendiente'
		check (estado in ('pendiente', 'creado', 'activo', 'no_aplica')),
	usuario text,
	fecha_creacion date,
	observaciones text,
	id_empleado integer references public.empleados(id_empleado),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_visordicom_estado on public.visordicom_medicos (estado);

alter table public.visordicom_medicos enable row level security;

drop policy if exists ebudaicom_medicos_todo_visitadora on public.visordicom_medicos;
drop policy if exists visordicom_medicos_todo_visitadora on public.visordicom_medicos;
create policy visordicom_medicos_todo_visitadora
on public.visordicom_medicos
for all to authenticated
using (public.es_usuario_visitadora())
with check (public.es_usuario_visitadora());

-- El pendiente "crear usuario" cambia de clave. Primero se abre la restricción,
-- luego se mueven los renglones ya capturados y al final se vuelve a cerrar con
-- la lista nueva: al revés, el update chocaría contra el check.
alter table public.tareas_seguimiento drop constraint if exists tareas_seguimiento_tipo_check;

update public.tareas_seguimiento set tipo = 'alta_visordicom' where tipo = 'alta_ebudaicom';

alter table public.tareas_seguimiento add constraint tareas_seguimiento_tipo_check
	check (tipo in (
		'seguimiento', 'llamada', 'entrega_ordenes', 'reactivar_convenio',
		'alta_visordicom', 'confirmar_cita', 'visita', 'cumpleanos', 'otro'
	));

NOTIFY pgrst, 'reload schema';
