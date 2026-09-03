-- Clientes dados de baja.
--
-- Hay convenios que ya no se usan y sólo estorban en el selector de clientes:
-- quien cobra tiene que buscar entre veinte nombres los cuatro que trabaja. La
-- primera idea fue borrarlos, pero `ventas.id_cliente` está declarada con
-- `on delete set null`, así que borrar el cliente le quita el convenio a todas
-- sus ventas históricas, sin vuelta atrás: el reporte de ventas y los tickets
-- reimpresos de meses pasados dejarían de decir a nombre de quién se cobró.
--
-- En vez de eso se marcan como inactivos. La orden vieja conserva su convenio,
-- su tarifario sigue ahí por si el cliente regresa, y basta poner `activo` en
-- verdadero para darlo de alta de nuevo.
--
-- La columna nace en verdadero para todos: dar de baja es la excepción, y así
-- ninguna consulta existente cambia de resultado al aplicarse la migración.

alter table public.clientes
	add column if not exists activo boolean not null default true;

comment on column public.clientes.activo is 'Falso para los convenios dados de baja: dejan de ofrecerse al capturar, pero sus ventas, citas y precios pactados se conservan.';

-- Un índice parcial: las consultas de los selectores piden siempre los activos,
-- que son la mayoría, y este índice es el que hace que pedirlos no cueste
-- recorrer la tabla entera.
create index if not exists idx_clientes_activo on public.clientes (nombre) where activo;

-- Los once que en el selector salían con un punto azul al lado del nombre. Se
-- buscan por el nombre visible -se le quita al principio todo lo que no sea
-- letra o número- porque se dieron de alta pegando el texto desde otro lado y
-- se les coló un símbolo invisible que impide compararlos tal cual.
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
	v_marcados integer;
	v_fila record;
begin
	for v_fila in
		select id_cliente, nombre
		from public.clientes
		where activo
			and upper(btrim(regexp_replace(nombre, '^[^[:alnum:]]+', ''))) = any (v_nombres)
		order by nombre
	loop
		raise notice 'Se da de baja el cliente % (id %)', quote_literal(v_fila.nombre), v_fila.id_cliente;
	end loop;

	update public.clientes
	set activo = false
	where activo
		and upper(btrim(regexp_replace(nombre, '^[^[:alnum:]]+', ''))) = any (v_nombres);
	get diagnostics v_marcados = row_count;

	raise notice 'Clientes dados de baja: % de % de la lista', v_marcados, cardinality(v_nombres);

	if v_marcados = 0 then
		raise notice 'Ninguno seguia activo: la migracion ya se habia corrido o los nombres cambiaron.';
	end if;
end
$$;

NOTIFY pgrst, 'reload schema';
