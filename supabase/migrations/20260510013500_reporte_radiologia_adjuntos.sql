create table if not exists public.reporte_radiologia_adjuntos (
	id uuid primary key default gen_random_uuid(),
	id_estudio integer references public.estudios_radiologia(id_estudio) on update cascade on delete cascade,
	nombre_archivo text not null,
	archivo_path text not null,
	archivo_url text,
	mime_type text,
	size_bytes bigint,
	creado_por uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now()
);

create index if not exists idx_reporte_radiologia_adjuntos_estudio
on public.reporte_radiologia_adjuntos (id_estudio);

alter table public.reporte_radiologia_adjuntos enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'reporte_radiologia_adjuntos'
			and policyname = 'reporte_radiologia_adjuntos_select_roles'
	) then
		create policy reporte_radiologia_adjuntos_select_roles
		on public.reporte_radiologia_adjuntos
		for select
		to authenticated
		using (public.es_usuario_plantillas_radiologia());
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'reporte_radiologia_adjuntos'
			and policyname = 'reporte_radiologia_adjuntos_insert_roles'
	) then
		create policy reporte_radiologia_adjuntos_insert_roles
		on public.reporte_radiologia_adjuntos
		for insert
		to authenticated
		with check (public.es_usuario_plantillas_radiologia());
	end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'reportes-radiologia-adjuntos',
	'reportes-radiologia-adjuntos',
	true,
	26214400,
	array[
		'image/png',
		'image/jpeg',
		'image/webp',
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'text/plain'
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
			and policyname = 'reportes_radiologia_adjuntos_storage_select'
	) then
		create policy reportes_radiologia_adjuntos_storage_select
		on storage.objects
		for select
		to authenticated
		using (
			bucket_id = 'reportes-radiologia-adjuntos'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'reportes_radiologia_adjuntos_storage_insert'
	) then
		create policy reportes_radiologia_adjuntos_storage_insert
		on storage.objects
		for insert
		to authenticated
		with check (
			bucket_id = 'reportes-radiologia-adjuntos'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;
end $$;

notify pgrst, 'reload schema';
