alter table public.estudios_radiologia
	add column if not exists id_venta integer references public.ventas(id_venta) on update cascade on delete set null,
	add column if not exists id_estudio_venta integer references public.estudios_venta(id_estudio_venta) on update cascade on delete set null,
	add column if not exists listo_entrega boolean not null default false,
	add column if not exists entregado boolean not null default false,
	add column if not exists fecha_entrega timestamp with time zone;

create index if not exists idx_estudios_radiologia_id_venta
on public.estudios_radiologia (id_venta);

create index if not exists idx_estudios_radiologia_id_estudio_venta
on public.estudios_radiologia (id_estudio_venta);

create index if not exists idx_estudios_radiologia_entrega
on public.estudios_radiologia (listo_entrega, entregado);

update public.estudios_radiologia er
set
	id_venta = v.id_venta,
	id_estudio_venta = ev.id_estudio_venta,
	updated_at = now()
from public.ventas v
join public.estudios_venta ev on ev.id_venta = v.id_venta
where er.id_paciente = v.id_paciente
	and er.id_venta is null
	and er.id_estudio_venta is null
	and v.estado = 'activo'
	and regexp_replace(lower(coalesce(ev.descripcion_estudio, ev.clave_estudio, '')), '[^a-z0-9]', '', 'g')
		= regexp_replace(lower(coalesce(er.descripcion, er.tipo_estudio, '')), '[^a-z0-9]', '', 'g')
	and (
		er.fecha_estudio is null
		or v.fecha_venta::date = er.fecha_estudio::date
	);

update public.estudios_venta ev
set
	estado_captura = 'completado',
	estado_validacion = case
		when er.listo_entrega = true then 'validado'
		else 'guardado'
	end,
	updated_at = now()
from public.estudios_radiologia er
where er.id_estudio_venta = ev.id_estudio_venta
	and (
		er.listo_entrega = true
		or er.estado = 'COMPLETADO'
		or coalesce(btrim(er.reporte), '') <> ''
	)
	and coalesce(ev.estado_validacion, '') <> case
		when er.listo_entrega = true then 'validado'
		else 'guardado'
	end;
