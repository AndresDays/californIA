create extension if not exists pgcrypto;

create table if not exists public.notificaciones (
	id uuid primary key default gen_random_uuid(),
	titulo text not null,
	mensaje text not null,
	tipo text not null default 'sistema',
	canal_destino text not null default 'todos',
	rol_destino text,
	usuario_destino uuid references auth.users(id) on delete cascade,
	entidad_tipo text,
	entidad_id integer,
	id_venta integer references public.ventas(id_venta) on update cascade on delete set null,
	id_sucursal integer references public.sucursales(id_sucursal) on update cascade on delete set null,
	sucursal text,
	action_path text not null default '/dashboard',
	metadata jsonb not null default '{}'::jsonb,
	read_at timestamptz,
	created_at timestamptz not null default now()
);

create index if not exists idx_notificaciones_created_at
on public.notificaciones (created_at desc);

create index if not exists idx_notificaciones_read_at
on public.notificaciones (read_at);

create index if not exists idx_notificaciones_usuario_destino
on public.notificaciones (usuario_destino);

create index if not exists idx_notificaciones_canal_destino
on public.notificaciones (canal_destino);

create index if not exists idx_notificaciones_id_sucursal
on public.notificaciones (id_sucursal);

create or replace function public.normalizar_texto_notificacion(valor text)
returns text
language sql
immutable
as $$
	select regexp_replace(
		translate(lower(trim(coalesce(valor, ''))), 'áéíóúüñ', 'aeiouun'),
		'[^a-z0-9]+',
		'_',
		'g'
	);
$$;

create or replace function public.es_destinatario_notificacion(
	p_usuario_destino uuid,
	p_rol_destino text,
	p_canal_destino text,
	p_id_sucursal integer,
	p_sucursal text
)
returns boolean
language sql
security definer
set search_path = public
as $$
	with empleado_actual as (
		select
			e.auth_uuid,
			public.normalizar_texto_notificacion(e.rol) as rol,
			s.id_sucursal,
			public.normalizar_texto_notificacion(e.sucursal) as sucursal
		from public.empleados e
		left join public.sucursales s
			on public.normalizar_texto_notificacion(s.nombre) = public.normalizar_texto_notificacion(e.sucursal)
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
		limit 1
	),
	destino as (
		select
			public.normalizar_texto_notificacion(p_rol_destino) as rol_destino,
			public.normalizar_texto_notificacion(coalesce(p_canal_destino, 'todos')) as canal_destino,
			public.normalizar_texto_notificacion(p_sucursal) as sucursal_destino
	)
	select exists (
		select 1
		from empleado_actual e
		cross join destino d
		where (p_usuario_destino is null or p_usuario_destino = auth.uid())
			and (p_id_sucursal is null or e.id_sucursal is null or p_id_sucursal = e.id_sucursal)
			and (d.sucursal_destino = '' or e.sucursal = '' or d.sucursal_destino = e.sucursal)
			and (
				d.rol_destino in ('', 'todos', e.rol)
				or d.canal_destino in ('', 'todos')
				or (
					d.canal_destino in ('captura', 'laboratorio')
					and e.rol in ('quimico', 'tecnico', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino = 'radiologia'
					and e.rol in ('radiologo', 'tecnico_radiologia', 'tecnico', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino in ('entrega', 'recepcion')
					and e.rol in ('recepcionista', 'administrador', 'admin', 'desarrollador')
				)
			)
	);
$$;

grant execute on function public.es_destinatario_notificacion(uuid, text, text, integer, text) to authenticated;

alter table public.notificaciones enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'notificaciones'
			and policyname = 'notificaciones_select_destinatario'
	) then
		create policy notificaciones_select_destinatario
		on public.notificaciones
		for select
		to authenticated
		using (
			public.es_destinatario_notificacion(
				usuario_destino,
				rol_destino,
				canal_destino,
				id_sucursal,
				sucursal
			)
		);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'notificaciones'
			and policyname = 'notificaciones_insert_authenticated'
	) then
		create policy notificaciones_insert_authenticated
		on public.notificaciones
		for insert
		to authenticated
		with check (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'notificaciones'
			and policyname = 'notificaciones_update_destinatario'
	) then
		create policy notificaciones_update_destinatario
		on public.notificaciones
		for update
		to authenticated
		using (
			public.es_destinatario_notificacion(
				usuario_destino,
				rol_destino,
				canal_destino,
				id_sucursal,
				sucursal
			)
		)
		with check (
			public.es_destinatario_notificacion(
				usuario_destino,
				rol_destino,
				canal_destino,
				id_sucursal,
				sucursal
			)
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'notificaciones'
	) then
		alter publication supabase_realtime add table public.notificaciones;
	end if;
exception
	when undefined_object then
		null;
end $$;

notify pgrst, 'reload schema';
