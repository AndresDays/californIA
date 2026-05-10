create extension if not exists pgcrypto;

create table if not exists public.plantillas_radiologia (
	id uuid primary key default gen_random_uuid(),
	nombre text not null,
	descripcion text,
	tipo text not null default 'membrete',
	visibilidad text not null default 'organizacion',
	categoria text,
	archivo_url text,
	archivo_path text,
	mime_type text,
	contenido_html text,
	membrete_base64 text,
	creado_por uuid references auth.users(id) on delete set null,
	creado_por_empleado integer references public.empleados(id_empleado) on update cascade on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint plantillas_radiologia_tipo_check check (tipo in ('membrete', 'documento')),
	constraint plantillas_radiologia_visibilidad_check check (visibilidad in ('privado', 'organizacion'))
);

create index if not exists idx_plantillas_radiologia_tipo
on public.plantillas_radiologia (tipo);

create index if not exists idx_plantillas_radiologia_visibilidad
on public.plantillas_radiologia (visibilidad);

create index if not exists idx_plantillas_radiologia_creado_por
on public.plantillas_radiologia (creado_por);

create or replace function public.es_usuario_plantillas_radiologia()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu') in ('desarrollador', 'radiologo')
			and coalesce(e.activo, true) = true
	);
$$;

grant execute on function public.es_usuario_plantillas_radiologia() to authenticated;

create or replace function public.plantillas_radiologia_set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists plantillas_radiologia_updated_at on public.plantillas_radiologia;

create trigger plantillas_radiologia_updated_at
before update on public.plantillas_radiologia
for each row
execute function public.plantillas_radiologia_set_updated_at();

alter table public.plantillas_radiologia enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'plantillas_radiologia'
			and policyname = 'plantillas_radiologia_select_roles'
	) then
		create policy plantillas_radiologia_select_roles
		on public.plantillas_radiologia
		for select
		to authenticated
		using (public.es_usuario_plantillas_radiologia());
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'plantillas_radiologia'
			and policyname = 'plantillas_radiologia_insert_roles'
	) then
		create policy plantillas_radiologia_insert_roles
		on public.plantillas_radiologia
		for insert
		to authenticated
		with check (public.es_usuario_plantillas_radiologia());
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'plantillas_radiologia'
			and policyname = 'plantillas_radiologia_update_roles'
	) then
		create policy plantillas_radiologia_update_roles
		on public.plantillas_radiologia
		for update
		to authenticated
		using (public.es_usuario_plantillas_radiologia())
		with check (public.es_usuario_plantillas_radiologia());
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'plantillas_radiologia'
			and policyname = 'plantillas_radiologia_delete_roles'
	) then
		create policy plantillas_radiologia_delete_roles
		on public.plantillas_radiologia
		for delete
		to authenticated
		using (public.es_usuario_plantillas_radiologia());
	end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'plantillas-radiologia',
	'plantillas-radiologia',
	true,
	8388608,
	array[
		'image/png',
		'image/jpeg',
		'image/webp',
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
			and policyname = 'plantillas_radiologia_storage_select'
	) then
		create policy plantillas_radiologia_storage_select
		on storage.objects
		for select
		to authenticated
		using (
			bucket_id = 'plantillas-radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'plantillas_radiologia_storage_insert'
	) then
		create policy plantillas_radiologia_storage_insert
		on storage.objects
		for insert
		to authenticated
		with check (
			bucket_id = 'plantillas-radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'plantillas_radiologia_storage_update'
	) then
		create policy plantillas_radiologia_storage_update
		on storage.objects
		for update
		to authenticated
		using (
			bucket_id = 'plantillas-radiologia'
			and public.es_usuario_plantillas_radiologia()
		)
		with check (
			bucket_id = 'plantillas-radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'storage'
			and tablename = 'objects'
			and policyname = 'plantillas_radiologia_storage_delete'
	) then
		create policy plantillas_radiologia_storage_delete
		on storage.objects
		for delete
		to authenticated
		using (
			bucket_id = 'plantillas-radiologia'
			and public.es_usuario_plantillas_radiologia()
		);
	end if;
end $$;

notify pgrst, 'reload schema';
