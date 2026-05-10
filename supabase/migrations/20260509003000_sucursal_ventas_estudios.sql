alter table public.ventas
add column if not exists id_sucursal integer,
add column if not exists sucursal text;

alter table public.estudios_venta
add column if not exists id_sucursal integer,
add column if not exists sucursal text;

create index if not exists idx_ventas_id_sucursal
on public.ventas (id_sucursal);

create index if not exists idx_estudios_venta_id_sucursal
on public.estudios_venta (id_sucursal);

do $$
begin
	if not exists (
		select 1
		from information_schema.table_constraints
		where constraint_schema = 'public'
			and table_name = 'ventas'
			and constraint_name = 'ventas_id_sucursal_fkey'
	) then
		alter table public.ventas
		add constraint ventas_id_sucursal_fkey
		foreign key (id_sucursal)
		references public.sucursales (id_sucursal)
		on update cascade
		on delete set null;
	end if;

	if not exists (
		select 1
		from information_schema.table_constraints
		where constraint_schema = 'public'
			and table_name = 'estudios_venta'
			and constraint_name = 'estudios_venta_id_sucursal_fkey'
	) then
		alter table public.estudios_venta
		add constraint estudios_venta_id_sucursal_fkey
		foreign key (id_sucursal)
		references public.sucursales (id_sucursal)
		on update cascade
		on delete set null;
	end if;
end $$;

update public.ventas v
set
	id_sucursal = coalesce(v.id_sucursal, c.id_sucursal),
	sucursal = coalesce(v.sucursal, s.nombre)
from public.citas c
left join public.sucursales s on s.id_sucursal = c.id_sucursal
where v.id_cita = c.id_cita
	and (v.id_sucursal is null or nullif(v.sucursal, '') is null);

update public.ventas v
set sucursal = e.sucursal
from public.empleados e
where v.id_empleado = e.id_empleado
	and nullif(v.sucursal, '') is null
	and nullif(e.sucursal, '') is not null;

update public.ventas v
set id_sucursal = s.id_sucursal
from public.sucursales s
where v.id_sucursal is null
	and lower(trim(v.sucursal)) = lower(trim(s.nombre));

update public.estudios_venta ev
set
	id_sucursal = coalesce(ev.id_sucursal, v.id_sucursal),
	sucursal = coalesce(ev.sucursal, v.sucursal)
from public.ventas v
where ev.id_venta = v.id_venta
	and (ev.id_sucursal is null or nullif(ev.sucursal, '') is null);

notify pgrst, 'reload schema';
