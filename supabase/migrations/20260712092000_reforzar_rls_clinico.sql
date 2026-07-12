create or replace function public.es_empleado_interno_activo()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) is true
	);
$$;

grant execute on function public.es_empleado_interno_activo() to authenticated;

alter table public.pacientes enable row level security;
alter table public.citas enable row level security;
alter table public.ventas enable row level security;
alter table public.doctores enable row level security;
alter table public.estudios_radiologia enable row level security;
alter table public.estudio_dicom_imagenes enable row level security;

drop policy if exists pacientes_operacion_interna on public.pacientes;
create policy pacientes_operacion_interna on public.pacientes
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists pacientes_select_doctor_externo on public.pacientes;
create policy pacientes_select_doctor_externo on public.pacientes
for select to authenticated
using (
	exists (
		select 1
		from public.estudios_radiologia er
		join public.doctores d on d.id_doctor = er.id_doctor
		where er.id_paciente = pacientes.id_paciente
			and d.auth_uuid = auth.uid()
			and coalesce(d.activo, true) is true
	)
);

drop policy if exists citas_operacion_interna on public.citas;
create policy citas_operacion_interna on public.citas
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists ventas_operacion_interna on public.ventas;
create policy ventas_operacion_interna on public.ventas
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists doctores_operacion_interna on public.doctores;
create policy doctores_operacion_interna on public.doctores
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists estudios_radiologia_operacion_interna on public.estudios_radiologia;
create policy estudios_radiologia_operacion_interna on public.estudios_radiologia
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists estudio_dicom_imagenes_operacion_interna on public.estudio_dicom_imagenes;
create policy estudio_dicom_imagenes_operacion_interna on public.estudio_dicom_imagenes
for all to authenticated
using (public.es_empleado_interno_activo())
with check (public.es_empleado_interno_activo());

drop policy if exists estudio_dicom_imagenes_select_doctor_externo on public.estudio_dicom_imagenes;
create policy estudio_dicom_imagenes_select_doctor_externo on public.estudio_dicom_imagenes
for select to authenticated
using (
	exists (
		select 1
		from public.estudios_radiologia er
		join public.doctores d on d.id_doctor = er.id_doctor
		where er.id_estudio = estudio_dicom_imagenes.id_estudio
			and d.auth_uuid = auth.uid()
			and coalesce(d.activo, true) is true
	)
);

notify pgrst, 'reload schema';
