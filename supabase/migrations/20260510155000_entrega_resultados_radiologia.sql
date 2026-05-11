alter table public.estudios_radiologia
	add column if not exists id_venta integer references public.ventas(id_venta) on update cascade on delete set null,
	add column if not exists id_estudio_venta integer references public.estudios_venta(id_estudio_venta) on update cascade on delete set null,
	add column if not exists listo_entrega boolean not null default false,
	add column if not exists entregado boolean not null default false,
	add column if not exists fecha_entrega timestamp with time zone;

create index if not exists idx_estudios_radiologia_id_venta
on public.estudios_radiologia (id_venta);

create index if not exists idx_estudios_radiologia_entrega
on public.estudios_radiologia (listo_entrega, entregado);

