-- Las imagenes diagnosticas y adjuntos no deben exponerse por URL publica.
update storage.buckets
set public = false
where id in ('radiologia', 'reportes-radiologia-adjuntos');

drop policy if exists radiologia_storage_select on storage.objects;

create policy radiologia_storage_select
on storage.objects
for select
to authenticated
using (
	bucket_id = 'radiologia'
	and (
		public.es_usuario_plantillas_radiologia()
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
		));

-- Una URL publica ya no es valida ni debe almacenarse como referencia de acceso.
update public.reporte_radiologia_adjuntos
set archivo_url = null
where archivo_url is not null;

notify pgrst, 'reload schema';
