-- El técnico no podía ver las imágenes que él mismo sube.
--
-- El visor le decía "Object not found" a los técnicos y a administración,
-- mientras que radiólogo y desarrollador lo abrían sin problema. No era el
-- visor: los renglones de `estudio_dicom_imagenes` sí los lee cualquier
-- empleado activo -por eso el estudio aparecía en la lista-, pero la lectura
-- del archivo en el bucket `radiologia` estaba limitada a los roles de
-- plantillas (radiólogo y desarrollador), al radiólogo clínico y al médico
-- externo dueño del estudio. Storage no distingue entre "no existe" y "no
-- puedes", así que el permiso faltante llegaba como archivo inexistente.
--
-- Se define quién es personal de imagen y con eso se abre la lectura. No se
-- abre a toda la clínica: recepción y laboratorio siguen sin poder abrir un
-- estudio. Subir, sobrescribir y borrar se quedan exactamente como estaban
-- -radiólogo y desarrollador, y el sincronizador de DICOM, que corre con la
-- llave de servicio-: aquí sólo se arregla lo que impedía ver el estudio.

create or replace function public.es_personal_imagen_activo()
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
			-- El rol se guarda como se escribió al dar de alta al usuario:
			-- "Técnico Radiología" con acentos y espacio. Se compara sin acentos y
			-- con los espacios y guiones vueltos guion bajo, igual que hace la
			-- aplicación, o el técnico de radiología se quedaba fuera por el
			-- espacio.
			and regexp_replace(
				translate(lower(btrim(coalesce(e.rol, ''))), 'áéíóúü', 'aeiouu'),
				'[^a-z0-9]+', '_', 'g'
			) in (
				'desarrollador',
				'radiologo',
				'radiologo_clinico',
				'radiologo_director',
				'admin',
				'administrador',
				'tecnico',
				'tecnico_radiologia'
			)
	);
$$;

comment on function public.es_personal_imagen_activo() is 'Empleado activo que trabaja con estudios de imagen: puede leer y subir archivos del bucket radiologia.';

grant execute on function public.es_personal_imagen_activo() to authenticated;

-- Lectura: se suma el personal de imagen a quienes ya podían.
drop policy if exists radiologia_storage_select on storage.objects;
create policy radiologia_storage_select
on storage.objects
for select to authenticated
using (
	bucket_id = 'radiologia'
	and (
		public.es_usuario_plantillas_radiologia()
		or public.es_radiologo_clinico_activo()
		or public.es_personal_imagen_activo()
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

notify pgrst, 'reload schema';
