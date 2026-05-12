create table if not exists public.solicitudes_auditoria (
	id_evento bigserial primary key,
	id_venta integer references public.ventas(id_venta) on update cascade on delete cascade,
	folio text,
	evento text not null,
	descripcion text not null,
	actor_nombre text,
	actor_rol text,
	actor_auth_uuid uuid,
	entidad_tipo text,
	entidad_id integer,
	detalles jsonb not null default '{}'::jsonb,
	created_at timestamp with time zone not null default now()
);

create index if not exists idx_solicitudes_auditoria_id_venta
on public.solicitudes_auditoria (id_venta, created_at desc);

create index if not exists idx_solicitudes_auditoria_actor
on public.solicitudes_auditoria (actor_auth_uuid);

alter table public.solicitudes_auditoria enable row level security;

do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'solicitudes_auditoria'
			and policyname = 'solicitudes_auditoria_select_authenticated'
	) then
		create policy solicitudes_auditoria_select_authenticated
		on public.solicitudes_auditoria
		for select
		to authenticated
		using (true);
	end if;

	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'solicitudes_auditoria'
			and policyname = 'solicitudes_auditoria_insert_authenticated'
	) then
		create policy solicitudes_auditoria_insert_authenticated
		on public.solicitudes_auditoria
		for insert
		to authenticated
		with check (true);
	end if;
end $$;
