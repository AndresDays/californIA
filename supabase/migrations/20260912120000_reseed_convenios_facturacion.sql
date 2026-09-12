-- La matriz de convenios, otra vez y para los clientes que hoy existen.
--
-- Una tomografía de IMSS tiene que salir con folio B -la factura California-, y
-- estaba saliendo con A. El código resuelve bien la regla; lo que faltaba eran
-- las reglas: `convenios_facturacion` se sembró una sola vez, en agosto,
-- cruzando por nombre contra los clientes que existían ese día. Un convenio
-- dado de alta después, renombrado, o el que quedó al fusionar duplicados, se
-- quedó sin renglones, y sin reglas el folio cae a la empresa del catálogo del
-- estudio: la tomografía es de CDI, o sea serie A.
--
-- Se vuelve a aplicar la matriz completa. Es idempotente -actualiza la empresa
-- si ya existe el renglón- y se puede correr cada vez que se den de alta
-- convenios nuevos.
--
--   California (CDC): IMSS (tomografía, resonancia y ultrasonido doppler),
--   CENTRO MEDICO ANAMAYA -el convenio de Odile- en toda su imagen, y la
--   resonancia de Medisim y SSA.
--   Imagen (CDI): ISSSTE, Medisim y SSA en el resto de su imagen.
--
-- Los dos convenios que importan hoy están dados de alta como "IMSS" y
-- "CENTRO MEDICO ANAMAYA": el primero entra por nombre exacto y el segundo
-- porque ANAMAYA aparece como palabra completa.
--
-- La resonancia de particular no necesita regla: la factura CDC porque así está
-- en el catálogo de estudios, que es de donde sale la empresa cuando el cliente
-- no tiene convenio.

-- El nombre del cliente, comparable: sin acentos, en mayúsculas y con todo lo
-- que no sea letra o número vuelto espacio, para que "I.M.S.S." y "IMSS" sean
-- lo mismo.
create or replace function pg_temp.nombre_convenio(p_nombre text)
returns text
language sql
immutable
as $$
	select btrim(regexp_replace(
		upper(translate(coalesce(p_nombre, ''),
			'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñ',
			'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn')),
		'[^A-Z0-9]+', ' ', 'g'));
$$;

-- `distinct on` porque un mismo cliente puede coincidir con dos convenios de la
-- lista -"ODILE / ANAMAYA" es los dos-, y sin esto la misma regla entraría dos
-- veces en la sentencia, que Postgres rechaza.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select distinct on (c.id_cliente, m.modalidad, m.criterio)
	c.id_cliente, m.modalidad, m.criterio, m.empresa
from public.clientes c
join (
	values
		('IMSS', 'tomografia', '', 'CDC'),
		('IMSS', 'resonancia', '', 'CDC'),
		('IMSS', 'ultrasonido', 'doppler', 'CDC'),
		-- El convenio de Odile está dado de alta como CENTRO MEDICO ANAMAYA;
		-- "ODILE" se deja como alias por si alguna sucursal lo capturó así.
		('ANAMAYA', '*', '', 'CDC'),
		('ODILE', '*', '', 'CDC'),
		('ISSSTE', '*', '', 'CDI'),
		('MEDISIM', '*', '', 'CDI'),
		('MEDISIM', 'resonancia', '', 'CDC'),
		('SSA', '*', '', 'CDI'),
		('SSA', 'resonancia', '', 'CDC')
) as m(convenio, modalidad, criterio, empresa)
	-- El convenio tiene que aparecer como palabra completa -así "CENTRO MEDICO
	-- ANAMAYA" entra y "MASSA SA" no se lleva las reglas de SSA- o al principio
	-- del nombre pegado, que es como quedan las siglas con puntos: "I.M.S.S.
	-- DELEGACION" se normaliza a "I M S S DELEGACION" y sin esto se quedaba
	-- fuera.
	on pg_temp.nombre_convenio(c.nombre) ~ ('(^| )' || m.convenio || '( |$)')
		or replace(pg_temp.nombre_convenio(c.nombre), ' ', '') like m.convenio || '%'
order by c.id_cliente, m.modalidad, m.criterio, m.empresa
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

-- Qué quedó, y a quién le falta: si un convenio de imagen aparece aquí sin
-- reglas, sus estudios se van a facturar por la empresa del catálogo.
do $$
declare
	v_fila record;
	v_sin integer := 0;
begin
	for v_fila in
		select c.nombre, count(cf.id) as reglas
		from public.clientes c
		join public.convenios_facturacion cf on cf.id_cliente = c.id_cliente
		group by c.nombre
		order by c.nombre
	loop
		raise notice 'Convenio con reglas: % (% reglas)', v_fila.nombre, v_fila.reglas;
	end loop;

	for v_fila in
		select c.nombre
		from public.clientes c
		where coalesce(c.activo, true)
			and pg_temp.nombre_convenio(c.nombre) ~ '(^| )(IMSS|ISSSTE|ANAMAYA|ODILE|MEDISIM|SSA)( |$)'
			and not exists (
				select 1 from public.convenios_facturacion cf where cf.id_cliente = c.id_cliente
			)
		order by c.nombre
	loop
		v_sin := v_sin + 1;
		raise notice 'ATENCION: % sigue sin reglas de facturacion', v_fila.nombre;
	end loop;

	if v_sin = 0 then
		raise notice 'Todos los convenios conocidos quedaron con sus reglas.';
	end if;
end
$$;

NOTIFY pgrst, 'reload schema';
