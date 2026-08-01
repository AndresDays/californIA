-- Revierte únicamente los datos de prueba insertados por la migración de staging.
-- Si alguien ya los usó en datos operativos, se aborta completa para no borrar referencias.
do $$
declare
	v_sucursal_id bigint;
	v_catalogo_id bigint;
begin
	select id_sucursal into v_sucursal_id
	from public.sucursales
	where nombre = 'STAGING - NO PRODUCCION';

	select id into v_catalogo_id
	from public.estudios_imagen_catalogo
	where clave = 'STAGING-DX-PRUEBA';

	if v_sucursal_id is not null and (
		exists (select 1 from public.citas where id_sucursal = v_sucursal_id)
		or exists (select 1 from public.ventas where id_sucursal = v_sucursal_id)
		or exists (select 1 from public.estudios_venta where id_sucursal = v_sucursal_id)
		or exists (select 1 from public.movimientos_pago_venta where id_sucursal = v_sucursal_id)
		or exists (select 1 from public.notificaciones where id_sucursal = v_sucursal_id)
	) then
		raise exception 'No se puede borrar la sucursal staging: ya tiene referencias operativas';
	end if;

	if v_catalogo_id is not null and (
		exists (select 1 from public.citas where id_tipo_estudio = v_catalogo_id)
		or exists (select 1 from public.estudios_venta where clave_estudio = 'STAGING-DX-PRUEBA')
		or exists (select 1 from public.estudios_radiologia where tipo_estudio = 'STAGING-DX-PRUEBA')
	) then
		raise exception 'No se puede borrar el estudio staging: ya tiene referencias operativas';
	end if;

	delete from public.precios_estudios
	where tipo = 'Estudio'
		and clave = 'STAGING-DX-PRUEBA'
		and descripcion = 'RADIOGRAFIA DE PRUEBA - SOLO STAGING'
		and cliente = 'Particular'
		and precio = 1.00;

	delete from public.estudios_imagen_catalogo
	where clave = 'STAGING-DX-PRUEBA'
		and descripcion = 'RADIOGRAFIA DE PRUEBA - SOLO STAGING'
		and empresa_operativa = 'CDC'
		and modalidad = 'radiografia';

	delete from public.sucursales
	where id_sucursal = v_sucursal_id;
end;
$$;
