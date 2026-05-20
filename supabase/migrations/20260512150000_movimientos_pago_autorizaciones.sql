create table if not exists public.movimientos_pago_venta (
	id_movimiento bigserial primary key,
	id_venta integer references public.ventas(id_venta) on update cascade on delete cascade,
	folio text,
	tipo_movimiento text not null check (
		tipo_movimiento in ('pago_inicial', 'abono', 'devolucion', 'cancelacion', 'ajuste')
	),
	monto numeric(12,2) not null,
	forma_pago text,
	referencia text,
	motivo text,
	id_sucursal integer,
	sucursal text,
	actor_nombre text,
	actor_rol text,
	actor_auth_uuid uuid,
	created_at timestamp with time zone not null default now()
);

create index if not exists idx_movimientos_pago_venta_id_venta
on public.movimientos_pago_venta (id_venta, created_at desc);

create index if not exists idx_movimientos_pago_venta_corte
on public.movimientos_pago_venta (created_at, id_sucursal, actor_auth_uuid, forma_pago);

alter table public.movimientos_pago_venta enable row level security;

create table if not exists public.autorizaciones_entrega_adeudo (
	id_autorizacion bigserial primary key,
	id_venta integer references public.ventas(id_venta) on update cascade on delete cascade,
	folio text,
	saldo_autorizado numeric(12,2) not null,
	motivo text not null,
	autorizado_por_nombre text,
	autorizado_por_rol text,
	autorizado_por_auth_uuid uuid,
	usado boolean not null default false,
	usado_en timestamp with time zone,
	created_at timestamp with time zone not null default now()
);

create index if not exists idx_autorizaciones_entrega_adeudo_id_venta
on public.autorizaciones_entrega_adeudo (id_venta, created_at desc);

alter table public.autorizaciones_entrega_adeudo enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'movimientos_pago_venta'
			and policyname = 'movimientos_pago_venta_select_authenticated'
	) then
		create policy movimientos_pago_venta_select_authenticated
		on public.movimientos_pago_venta
		for select
		to authenticated
		using (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'movimientos_pago_venta'
			and policyname = 'movimientos_pago_venta_insert_authenticated'
	) then
		create policy movimientos_pago_venta_insert_authenticated
		on public.movimientos_pago_venta
		for insert
		to authenticated
		with check (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'autorizaciones_entrega_adeudo'
			and policyname = 'autorizaciones_entrega_adeudo_select_authenticated'
	) then
		create policy autorizaciones_entrega_adeudo_select_authenticated
		on public.autorizaciones_entrega_adeudo
		for select
		to authenticated
		using (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'autorizaciones_entrega_adeudo'
			and policyname = 'autorizaciones_entrega_adeudo_insert_authenticated'
	) then
		create policy autorizaciones_entrega_adeudo_insert_authenticated
		on public.autorizaciones_entrega_adeudo
		for insert
		to authenticated
		with check (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'autorizaciones_entrega_adeudo'
			and policyname = 'autorizaciones_entrega_adeudo_update_authenticated'
	) then
		create policy autorizaciones_entrega_adeudo_update_authenticated
		on public.autorizaciones_entrega_adeudo
		for update
		to authenticated
		using (true)
		with check (true);
	end if;
end $$;
