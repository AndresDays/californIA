-- El radiólogo clínico no hereda las políticas amplias de personal interno.
-- Sus únicas mutaciones se realizan mediante las RPC acotadas de esta migración.
create or replace function public.es_radiologo_clinico_activo()
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
			and lower(replace(trim(coalesce(e.rol, '')), ' ', '_')) = 'radiologo_clinico'
	);
$$;

grant execute on function public.es_radiologo_clinico_activo() to authenticated;

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
			and lower(replace(trim(coalesce(e.rol, '')), ' ', '_')) <> 'radiologo_clinico'
	);
$$;

create policy radiologo_clinico_select_estudios
on public.estudios_radiologia
for select to authenticated
using (public.es_radiologo_clinico_activo());

create policy radiologo_clinico_select_imagenes
on public.estudio_dicom_imagenes
for select to authenticated
using (public.es_radiologo_clinico_activo());

create policy radiologo_clinico_select_pacientes_vinculados
on public.pacientes
for select to authenticated
using (
	public.es_radiologo_clinico_activo()
	and exists (
		select 1 from public.estudios_radiologia er
		where er.id_paciente = pacientes.id_paciente
	)
);

-- Solo carga de objetos nuevos: no se permite sobrescribir ni borrar archivos.
create policy radiologo_clinico_insert_storage_radiologia
on storage.objects
for insert to authenticated
with check (
	bucket_id = 'radiologia'
	and name ~ '^[0-9]+/.+'
	and public.es_radiologo_clinico_activo()
);

drop policy if exists radiologia_storage_select on storage.objects;
create policy radiologia_storage_select
on storage.objects
for select to authenticated
using (
	bucket_id = 'radiologia'
	and (
		public.es_usuario_plantillas_radiologia()
		or public.es_radiologo_clinico_activo()
		or exists (
			select 1
			from public.estudios_radiologia er
			join public.doctores d on d.id_doctor = er.id_doctor
			where d.auth_uuid = auth.uid()
				and coalesce(d.activo, true) is true
				and (
					er.storage_path = storage.objects.name
					or exists (
						select 1
						from public.estudio_dicom_imagenes edi
						where edi.id_estudio = er.id_estudio
							and edi.storage_path = storage.objects.name
					)
				)
		)
	)
);

create or replace function public.actualizar_reporte_radiologo_clinico(
	p_id_estudio integer,
	p_reporte text,
	p_estado text default 'COMPLETADO'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if not public.es_radiologo_clinico_activo() then
		raise exception 'No autorizado para interpretar estudios';
	end if;

	if p_id_estudio is null or p_estado not in ('EN PROCESO', 'COMPLETADO') then
		raise exception 'Actualización clínica inválida';
	end if;

	update public.estudios_radiologia
	set reporte = coalesce(p_reporte, ''), estado = p_estado, updated_at = now()
	where id_estudio = p_id_estudio;

	if not found then
		raise exception 'Estudio no encontrado';
	end if;
end;
$$;

grant execute on function public.actualizar_reporte_radiologo_clinico(integer, text, text) to authenticated;

create or replace function public.registrar_imagenes_radiologo_clinico(
	p_id_estudio integer,
	p_imagenes jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
	v_imagen jsonb;
	v_path text;
	v_primera_ruta text;
	v_total integer := 0;
begin
	if not public.es_radiologo_clinico_activo() then
		raise exception 'No autorizado para registrar imágenes';
	end if;

	if p_id_estudio is null or jsonb_typeof(p_imagenes) <> 'array' or jsonb_array_length(p_imagenes) = 0 then
		raise exception 'Imágenes inválidas';
	end if;

	if not exists (select 1 from public.estudios_radiologia where id_estudio = p_id_estudio) then
		raise exception 'Estudio no encontrado';
	end if;

	for v_imagen in select value from jsonb_array_elements(p_imagenes)
	loop
		v_path := v_imagen ->> 'storage_path';
		if v_path is null or v_path !~ ('^' || p_id_estudio::text || '/.+') then
			raise exception 'Ruta de imagen inválida';
		end if;

		if not exists (
			select 1 from storage.objects so
			where so.bucket_id = 'radiologia' and so.name = v_path
		) then
			raise exception 'El archivo no existe en el bucket de radiología';
		end if;

		insert into public.estudio_dicom_imagenes (
			id_estudio, bucket, storage_path, file_name, file_size, mime_type,
			modality, study_instance_uid, series_instance_uid, series_description,
			instance_number, frame_count
		) values (
			p_id_estudio, 'radiologia', v_path, nullif(v_imagen ->> 'file_name', ''),
			nullif(v_imagen ->> 'file_size', '')::bigint, nullif(v_imagen ->> 'mime_type', ''),
			nullif(v_imagen ->> 'modality', ''), nullif(v_imagen ->> 'study_instance_uid', ''),
			nullif(v_imagen ->> 'series_instance_uid', ''), nullif(v_imagen ->> 'series_description', ''),
			nullif(v_imagen ->> 'instance_number', '')::integer, nullif(v_imagen ->> 'frame_count', '')::integer
		);

		v_primera_ruta := coalesce(v_primera_ruta, v_path);
		v_total := v_total + 1;
	end loop;

	update public.estudios_radiologia
	set storage_path = v_primera_ruta, estado = 'EN PROCESO', updated_at = now()
	where id_estudio = p_id_estudio;

	return v_total;
end;
$$;

grant execute on function public.registrar_imagenes_radiologo_clinico(integer, jsonb) to authenticated;

notify pgrst, 'reload schema';
