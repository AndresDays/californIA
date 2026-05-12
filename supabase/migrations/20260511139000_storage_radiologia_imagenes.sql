insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'radiologia',
	'radiologia',
	true,
	524288000,
	array[
		'application/dicom',
		'application/octet-stream',
		'image/dicom-rle',
		'image/jpeg',
		'image/png',
		'image/webp',
		'application/pdf'
	]
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'radiologia_storage_select'
	) then
		create policy radiologia_storage_select
		on storage.objects
		for select
		to authenticated
		using (
			bucket_id = 'radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'radiologia_storage_insert'
	) then
		create policy radiologia_storage_insert
		on storage.objects
		for insert
		to authenticated
		with check (
			bucket_id = 'radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'radiologia_storage_update'
	) then
		create policy radiologia_storage_update
		on storage.objects
		for update
		to authenticated
		using (
			bucket_id = 'radiologia'
			and public.es_usuario_plantillas_radiologia()
		)
		with check (
			bucket_id = 'radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'radiologia_storage_delete'
	) then
		create policy radiologia_storage_delete
		on storage.objects
		for delete
		to authenticated
		using (
			bucket_id = 'radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;
end $$;

notify pgrst, 'reload schema';
