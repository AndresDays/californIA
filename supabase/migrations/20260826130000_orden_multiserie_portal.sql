-- Una visita puede partirse en varias ventas —una por serie de folio, porque
-- cada una factura por su empresa— y el paciente no tiene por qué saberlo: en
-- el portal entra con cualquiera de sus folios y ve todos sus resultados.

alter table public.ventas
	add column if not exists folio_grupo text;

comment on column public.ventas.folio_grupo is 'Agrupa las ventas de una misma visita partida por serie de folio.';

create index if not exists idx_ventas_folio_grupo on public.ventas (folio_grupo);

create or replace function public.buscar_resultados_portal(
	p_folio text,
	p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_venta record;
	v_telefono text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
	v_folio text := upper(regexp_replace(coalesce(p_folio, ''), '[^A-Za-z0-9]', '', 'g'));
	v_ids integer[];
	v_ids_pagadas integer[];
	v_saldo numeric := 0;
	v_laboratorio jsonb := '[]'::jsonb;
	v_radiologia jsonb := '[]'::jsonb;
	v_folios text;
	v_mensaje text := null;
begin
	select
		v.id_venta, v.folio, v.folio_grupo, v.fecha_venta, v.id_sucursal,
		coalesce(v.total, 0) as total, coalesce(v.pago_recibido, 0) as pago_recibido,
		p.id_paciente, p.nombre as paciente_nombre, p.fecha_nacimiento, p.sexo,
		p.telefono, p.email, c.nombre as cliente_nombre
	into v_venta
	from public.ventas v
	join public.pacientes p on p.id_paciente = v.id_paciente
	left join public.clientes c on c.id_cliente = v.id_cliente
	where v.estado = 'activo'
		and upper(regexp_replace(coalesce(v.folio, ''), '[^A-Za-z0-9]', '', 'g')) = v_folio
		and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') = v_telefono
	limit 1;

	if v_venta.id_venta is null then
		return jsonb_build_object('encontrado', false, 'mensaje', 'No encontramos resultados con ese folio y telefono.');
	end if;

	-- Las ventas hermanas de la misma visita: se exige el mismo paciente para que
	-- el grupo nunca cruce resultados de otra persona.
	select
		array_agg(v.id_venta order by v.folio),
		array_agg(v.id_venta order by v.folio) filter (
			where greatest(coalesce(v.total, 0) - coalesce(v.pago_recibido, 0), 0) <= 0
		),
		coalesce(sum(greatest(coalesce(v.total, 0) - coalesce(v.pago_recibido, 0), 0)), 0),
		string_agg(v.folio, ', ' order by v.folio)
	into v_ids, v_ids_pagadas, v_saldo, v_folios
	from public.ventas v
	where v.estado = 'activo'
		and v.id_paciente = v_venta.id_paciente
		and (
			(v_venta.folio_grupo is not null and v.folio_grupo = v_venta.folio_grupo)
			or (v_venta.folio_grupo is null and v.id_venta = v_venta.id_venta)
		);

	-- Con varias órdenes en la visita, la que ya está pagada sí se entrega: negar
	-- todo el paquete por el adeudo de la otra no ayuda a cobrarlo.
	if v_ids_pagadas is null or array_length(v_ids_pagadas, 1) is null then
		return jsonb_build_object(
			'encontrado', true, 'autorizado', false,
			'mensaje', 'La solicitud tiene adeudo pendiente. Favor de pasar a recepcion.',
			'saldo', v_saldo,
			'venta', jsonb_build_object(
				'id_venta', v_venta.id_venta, 'folio', v_venta.folio,
				'folios', v_folios,
				'fecha_venta', v_venta.fecha_venta, 'id_sucursal', v_venta.id_sucursal,
				'paciente', v_venta.paciente_nombre,
				'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
			)
		);
	end if;

	if v_saldo > 0 then
		v_mensaje := 'Otra orden de esta visita tiene adeudo pendiente. Favor de pasar a recepcion por esos resultados.';
	end if;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_laboratorio
	from (
		select jsonb_build_object(
			'id', ev.id_estudio_venta, 'tipo', 'laboratorio', 'clave', ev.clave_estudio,
			'descripcion', ev.descripcion_estudio, 'estado', ev.estado_validacion,
			'fecha_entrega', ev.fecha_entrega,
			'archivo_cultivo_path', case
				when lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
					and rca.archivo_path = ev.id_estudio_venta::text || '/cultivo.pdf'
				then rca.archivo_path else null end,
			'analitos', coalesce((
				select jsonb_agg(jsonb_build_object(
					'clave', r.clave, 'descripcion', coalesce(a.descripcion, r.clave),
					'resultado', r.valor, 'unidades', coalesce(a.unidad, ''),
					'referencia', case
						when a.tipo_resultado = 'Subtitulo' then ''
						when a.vr_bajo is not null and a.vr_alto is not null then concat(a.vr_bajo, ' - ', a.vr_alto)
						when a.vr_bajo is not null then concat('>', a.vr_bajo)
						else coalesce(a.referencia, '') end
				) order by coalesce(ea.orden, 9999), r.clave)
				from jsonb_each_text(case when coalesce(btrim(ev.resultados), '') = '' then '{}'::jsonb else ev.resultados::jsonb end) as r(clave, valor)
				left join public.analitos a on a.clave = r.clave
				left join public.estudio_analitos ea on ea.clave_estudio = ev.clave_estudio and ea.id_analito = a.id_analito
			), '[]'::jsonb)
		) as estudio
		from public.estudios_venta ev
		left join public.resultados_cultivo_adjuntos rca on rca.id_estudio_venta = ev.id_estudio_venta
		where ev.id_venta = any(v_ids_pagadas)
			and ev.estado_validacion = 'validado'
			and coalesce(ev.muestra_pendiente, false) = false
			and (coalesce(btrim(ev.resultados), '') not in ('', '{}')
				or (lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
					and rca.archivo_path = ev.id_estudio_venta::text || '/cultivo.pdf'))
	) estudios;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_radiologia
	from (
		select jsonb_build_object(
			'id', er.id_estudio, 'tipo', 'imagen', 'clave', concat('IMG-', er.id_estudio),
			'descripcion', coalesce(er.descripcion, er.tipo_estudio),
			'estado', case when er.entregado then 'entregado' else 'interpretado' end,
			'fecha_estudio', er.fecha_estudio, 'fecha_entrega', er.fecha_entrega, 'reporte', er.reporte
		) as estudio
		from public.estudios_radiologia er
		where er.id_venta = any(v_ids_pagadas)
			and (coalesce(er.listo_entrega, false) = true or coalesce(er.entregado, false) = true)
			and coalesce(btrim(er.reporte), '') <> ''
	) estudios;

	return jsonb_build_object(
		'encontrado', true, 'autorizado', true, 'saldo', v_saldo,
		'mensaje', v_mensaje,
		'venta', jsonb_build_object(
			'id_venta', v_venta.id_venta, 'folio', v_venta.folio,
			'folios', v_folios,
			'fecha_venta', v_venta.fecha_venta, 'id_sucursal', v_venta.id_sucursal,
			'paciente', v_venta.paciente_nombre, 'fecha_nacimiento', v_venta.fecha_nacimiento,
			'sexo', v_venta.sexo, 'telefono', v_venta.telefono, 'email', v_venta.email,
			'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
		),
		'estudios', v_laboratorio || v_radiologia
	);
end;
$$;

grant execute on function public.buscar_resultados_portal(text, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
