-- Baja de once clientes que ya no se usan.
--
-- En el selector de clientes de nuevo paciente aparecían con un punto azul al
-- lado del nombre, porque se dieron de alta pegando el texto desde otro lado y
-- se les coló un símbolo al principio. Ninguno se factura ya, así que se dan de
-- baja del catálogo.
--
-- Se buscan por el nombre visible, no por el guardado: se le quita al nombre
-- todo lo que no sea letra o número al principio antes de comparar, para que el
-- símbolo invisible no impida encontrarlos. La comparación va en mayúsculas
-- porque el catálogo mezcla ambas.
--
-- Tres tablas apuntan a `clientes`, y cada una se atiende distinta:
--
--   * `ventas` tiene `on delete set null`, así que las ventas históricas de
--     estos convenios se quedan sin cliente. Es pérdida de información y no
--     tiene vuelta atrás: por eso primero se reporta cuántas son.
--   * `citas` y `cotizaciones` no declaran qué hacer al borrar, así que el
--     `delete` fallaría con una violación de llave foránea. Se les vacía la
--     columna a mano -las dos la aceptan nula- para que la baja pueda darse.
--   * `convenios_facturacion` tiene `on delete cascade` y se limpia sola.
--
-- Los renglones de `precios_estudios` de estos clientes NO se tocan: esa tabla
-- guarda el cliente por nombre y no por id, así que no estorban ni impiden
-- nada. Quedan de peso muerto y el aviso dice cuántos son, por si se quieren
-- borrar después.
--
-- La migración es re-ejecutable: la segunda vez no encuentra nada y no hace
-- nada.

do $$
declare
	v_nombres text[] := array[
		'CONSTRUCTORA LEON DE LA BAHIA',
		'CONSULTORIO SANTA FE (THALYA MACIAS)',
		'DFSOFT',
		'FIDEICOMISO 728 FIPATERM',
		'GAGA (IMELDA)',
		'LAS MINAS',
		'MERCADO LIBRE',
		'NAVAL',
		'ORIARD',
		'PRIAM',
		'RCU'
	];
	v_ids bigint[];
	v_ventas integer;
	v_citas integer;
	v_cotizaciones integer;
	v_precios integer;
	v_borrados integer;
	v_fila record;
begin
	select coalesce(array_agg(id_cliente), '{}'::bigint[])
	into v_ids
	from public.clientes
	where upper(btrim(regexp_replace(nombre, '^[^[:alnum:]]+', ''))) = any (v_nombres);

	if cardinality(v_ids) = 0 then
		raise notice 'Ningun cliente de la lista sigue dado de alta: no hay nada que borrar.';
		return;
	end if;

	-- Se deja constancia de qué se va a borrar y con qué nombre exacto estaba
	-- guardado, que es la única forma de saber después cuál era el símbolo.
	for v_fila in
		select id_cliente, nombre
		from public.clientes
		where id_cliente = any (v_ids)
		order by nombre
	loop
		raise notice 'Se da de baja el cliente % (id %)', quote_literal(v_fila.nombre), v_fila.id_cliente;
	end loop;

	select count(*) into v_ventas
	from public.ventas where id_cliente = any (v_ids);
	select count(*) into v_precios
	from public.precios_estudios
	where upper(btrim(regexp_replace(cliente, '^[^[:alnum:]]+', ''))) = any (v_nombres);

	update public.citas set id_cliente = null where id_cliente = any (v_ids);
	get diagnostics v_citas = row_count;

	update public.cotizaciones set id_cliente = null where id_cliente = any (v_ids);
	get diagnostics v_cotizaciones = row_count;

	delete from public.clientes where id_cliente = any (v_ids);
	get diagnostics v_borrados = row_count;

	raise notice 'Clientes dados de baja: %', v_borrados;
	raise notice 'Ventas que se quedan sin cliente: %', v_ventas;
	raise notice 'Citas desligadas: % | Cotizaciones desligadas: %', v_citas, v_cotizaciones;
	raise notice 'Renglones de precios_estudios que quedan huerfanos (no se borran): %', v_precios;
end
$$;

NOTIFY pgrst, 'reload schema';
