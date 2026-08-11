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
	v_saldo numeric := 0;
	v_laboratorio jsonb := '[]'::jsonb;
	v_radiologia jsonb := '[]'::jsonb;
begin
	select
		v.id_venta, v.folio, v.fecha_venta, v.id_sucursal,
		coalesce(v.total, 0) as total, coalesce(v.pago_recibido, 0) as pago_recibido,
		p.id_paciente, p.nombre as paciente_nombre, p.fecha_nacimiento, p.sexo,
		p.telefono, p.email, c.nombre as cliente_nombre
	into v_venta
	from public.ventas v
	join public.pacientes p on p.id_paciente = v.id_paciente
	left join public.clientes c on c.id_cliente = v.id_cliente
	where v.estado = 'activo'
		and v.folio = btrim(coalesce(p_folio, ''))
		and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') = v_telefono
	limit 1;

	if v_venta.id_venta is null then
		return jsonb_build_object('encontrado', false, 'mensaje', 'No encontramos resultados con ese folio y telefono.');
	end if;

	v_saldo := greatest(coalesce(v_venta.total, 0) - coalesce(v_venta.pago_recibido, 0), 0);
	if v_saldo > 0 then
		return jsonb_build_object(
			'encontrado', true, 'autorizado', false,
			'mensaje', 'La solicitud tiene adeudo pendiente. Favor de pasar a recepcion.',
			'saldo', v_saldo,
			'venta', jsonb_build_object(
				'id_venta', v_venta.id_venta, 'folio', v_venta.folio,
				'fecha_venta', v_venta.fecha_venta, 'id_sucursal', v_venta.id_sucursal,
				'paciente', v_venta.paciente_nombre,
				'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
			)
		);
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
		where ev.id_venta = v_venta.id_venta
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
		where er.id_venta = v_venta.id_venta
			and (coalesce(er.listo_entrega, false) = true or coalesce(er.entregado, false) = true)
			and coalesce(btrim(er.reporte), '') <> ''
	) estudios;

	return jsonb_build_object(
		'encontrado', true, 'autorizado', true, 'saldo', 0,
		'venta', jsonb_build_object(
			'id_venta', v_venta.id_venta, 'folio', v_venta.folio,
			'fecha_venta', v_venta.fecha_venta, 'id_sucursal', v_venta.id_sucursal,
			'paciente', v_venta.paciente_nombre, 'fecha_nacimiento', v_venta.fecha_nacimiento,
			'sexo', v_venta.sexo, 'telefono', v_venta.telefono, 'email', v_venta.email,
			'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
		),
		'estudios', v_laboratorio || v_radiologia
	);
end;
$$;
