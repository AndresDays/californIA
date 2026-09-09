-- Doctores duplicados: identificarlos y fusionarlos.
--
-- El mismo médico está dado de alta varias veces porque se capturó distinto
-- cada vez: con acentos y sin ellos, con el nombre completo en `nombre` y los
-- apellidos vacíos, o con espacios de más. En la agenda y en el reporte de
-- comisiones aparece como si fueran varios.
--
-- El script NO se aplica solo: no es una migración a propósito, porque borra
-- registros. Se corre en dos pasos y con la lista a la vista:
--
--   1. Ejecutar sólo la CONSULTA de abajo y revisar los grupos que salen.
--   2. Si la lista es correcta, ejecutar el bloque de FUSIÓN, que está dentro
--      de una transacción: mientras no se haga `commit` no se borra nada.
--
-- Qué hace la fusión, por grupo de duplicados:
--   - Se queda con el registro más completo (el que tiene usuario de acceso, y
--     entre iguales el más antiguo), porque es el que ya trae historia.
--   - Copia al que se queda los datos que sólo tienen los otros (teléfono,
--     correo, especialidad…): fusionar no debe perder información.
--   - Repunta a ese id todas las referencias -ventas, estudios y reportes de
--     radiología, comisiones, empleados- para no dejar órdenes huérfanas.
--   - Borra los sobrantes.

-- La llave con la que se comparan: nombre completo sin acentos, sin dobles
-- espacios y en minúsculas. Toma los apellidos cuando están capturados y, si no,
-- lo que haya en `nombre`.
create or replace function public.doctor_llave_nombre(
	p_nombre text,
	p_primer_nombre text,
	p_apellido_paterno text,
	p_apellido_materno text
)
returns text
language sql
immutable
as $$
	select btrim(regexp_replace(
		lower(translate(
			coalesce(nullif(btrim(coalesce(p_primer_nombre, '')), ''), coalesce(p_nombre, ''))
				|| ' ' || coalesce(p_apellido_paterno, '')
				|| ' ' || coalesce(p_apellido_materno, ''),
			'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñ',
			'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn'
		)),
		'\s+', ' ', 'g'
	));
$$;

comment on function public.doctor_llave_nombre(text, text, text, text) is 'Nombre completo normalizado de un doctor: sirve para detectar los dados de alta dos veces.';

-- ── 1. CONSULTA: qué grupos están duplicados y qué se conservaría ────────────
with normalizados as (
	select
		d.id_doctor,
		d.nombre,
		d.usuario,
		d.created_at,
		public.doctor_llave_nombre(d.nombre, d.primer_nombre, d.apellido_paterno, d.apellido_materno) as llave
	from public.doctores d
)
select
	n.llave,
	count(*) as repetidos,
	min(n.id_doctor) filter (where n.usuario is not null) as id_con_usuario,
	array_agg(n.id_doctor order by n.id_doctor) as ids,
	array_agg(coalesce(n.nombre, '') order by n.id_doctor) as nombres
from normalizados n
where n.llave <> ''
group by n.llave
having count(*) > 1
order by count(*) desc, n.llave;

-- ── 2. FUSIÓN: repunta las referencias y borra los sobrantes ─────────────────
-- Revisar la lista de arriba antes de correr esto. Queda abierto en una
-- transacción: al final, `commit` para aplicar o `rollback` para deshacer.
begin;

do $$
declare
	v_grupo record;
	v_sobrante integer;
	v_columna record;
	v_movidas bigint;
	v_borrados integer := 0;
begin
	for v_grupo in
		with normalizados as (
			select
				d.*,
				public.doctor_llave_nombre(d.nombre, d.primer_nombre, d.apellido_paterno, d.apellido_materno) as llave
			from public.doctores d
		)
		select
			n.llave,
			-- Se queda el que tiene acceso al sistema; entre iguales, el más
			-- antiguo, que es el que trae la historia.
			(array_agg(n.id_doctor order by (n.usuario is null), (n.auth_uuid is null), n.created_at, n.id_doctor))[1] as id_conservar,
			array_agg(n.id_doctor order by n.id_doctor) as ids
		from normalizados n
		where n.llave <> ''
		group by n.llave
		having count(*) > 1
	loop
		raise notice 'Duplicado %: se conserva % y se fusionan %',
			quote_literal(v_grupo.llave), v_grupo.id_conservar, v_grupo.ids;

		-- Los datos que sólo tienen los repetidos se copian al que se queda:
		-- fusionar no debe perder el teléfono ni la especialidad capturados en
		-- el alta duplicada.
		update public.doctores destino
		set
			telefono = coalesce(destino.telefono, origen.telefono),
			email = coalesce(destino.email, origen.email),
			especialidad = coalesce(destino.especialidad, origen.especialidad),
			institucion = coalesce(destino.institucion, origen.institucion),
			fecha_nacimiento = coalesce(destino.fecha_nacimiento, origen.fecha_nacimiento),
			sexo = coalesce(destino.sexo, origen.sexo),
			apellido_paterno = coalesce(destino.apellido_paterno, origen.apellido_paterno),
			apellido_materno = coalesce(destino.apellido_materno, origen.apellido_materno),
			primer_nombre = coalesce(destino.primer_nombre, origen.primer_nombre),
			es_radiologo = destino.es_radiologo or origen.es_radiologo,
			updated_at = now()
		from (
			select
				max(telefono) as telefono,
				max(email) as email,
				max(especialidad) as especialidad,
				max(institucion) as institucion,
				max(fecha_nacimiento) as fecha_nacimiento,
				max(sexo) as sexo,
				max(apellido_paterno) as apellido_paterno,
				max(apellido_materno) as apellido_materno,
				max(primer_nombre) as primer_nombre,
				bool_or(es_radiologo) as es_radiologo
			from public.doctores
			where id_doctor = any (v_grupo.ids)
				and id_doctor <> v_grupo.id_conservar
		) origen
		where destino.id_doctor = v_grupo.id_conservar;

		foreach v_sobrante in array v_grupo.ids loop
			continue when v_sobrante = v_grupo.id_conservar;

			-- Las referencias se recorren por catálogo y no a mano: cualquier
			-- tabla que apunte al doctor -hoy ventas, radiología, comisiones y
			-- empleados- se repunta sin tener que enumerarlas aquí.
			for v_columna in
				select c.table_name, c.column_name
				from information_schema.columns c
				join information_schema.tables t
					on t.table_schema = c.table_schema
					and t.table_name = c.table_name
					and t.table_type = 'BASE TABLE'
				where c.table_schema = 'public'
					and c.table_name <> 'doctores'
					and c.column_name like '%id_doctor%'
			loop
				execute format(
					'update public.%I set %I = $1 where %I = $2',
					v_columna.table_name, v_columna.column_name, v_columna.column_name
				) using v_grupo.id_conservar, v_sobrante;
				get diagnostics v_movidas = row_count;
				if v_movidas > 0 then
					raise notice '  % filas movidas en %.%',
						v_movidas, v_columna.table_name, v_columna.column_name;
				end if;
			end loop;

			delete from public.doctores where id_doctor = v_sobrante;
			v_borrados := v_borrados + 1;
		end loop;
	end loop;

	raise notice 'Doctores duplicados eliminados: %', v_borrados;
end
$$;

-- Comprobación: después de la fusión no debe quedar ningún grupo repetido.
select count(*) as grupos_duplicados_restantes
from (
	select public.doctor_llave_nombre(d.nombre, d.primer_nombre, d.apellido_paterno, d.apellido_materno) as llave
	from public.doctores d
	where public.doctor_llave_nombre(d.nombre, d.primer_nombre, d.apellido_paterno, d.apellido_materno) <> ''
	group by 1
	having count(*) > 1
) grupos;

-- commit;
-- rollback;
