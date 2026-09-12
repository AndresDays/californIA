-- Precios de veterinaria, actualizados a la lista del 01/08/2026.
--
-- Son los estudios que ya están en el catálogo con modalidad veterinaria: aquí
-- sólo se les fija el precio de particular, que es como se cobran -la
-- veterinaria no se factura a convenios-. No se da de alta ningún estudio: si
-- alguno de la lista no está en el catálogo se avisa al final, porque darlo de
-- alta con una clave inventada dejaría un renglón que nadie encuentra al
-- cobrar.

create temporary table tmp_precios_vet (
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_precios_vet (descripcion, precio)
values
	('RM CERVICAL CONTRASTADA', 4320),
	('RM CERVICAL SIMPLE', 3240),
	('RM CRÁNEO CONTRASTADA', 4320),
	('RM CRANEO SIMPLE', 3240),
	('RM DORSAL SIMPLE', 3240),
	('RM LUMBAR SIMPLE', 3240),
	('RM LUMBOSACRA CONTRASTADA', 4320),
	('RM RODILLA SIMPLE', 3240),
	('RM TORACOABDOMINAL CONTRASTADA', 4320),
	('RM TORACOLUMBAR CONTRASTADA', 4320),
	('RM TORACOLUMBAR SIMPLE', 3240),
	('RX ABDOMEN', 530),
	('RX COLUMNA', 530),
	('RX CRANEO', 530),
	('RX EXTREMIDADES', 530),
	('RX MANDIBULA', 530),
	('RX PELVIS', 530),
	('RX TORAX', 530),
	('TAC ABDOMEN', 3620),
	('TAC ABDOMEN CONTRASTADO', 4090),
	('TAC COLUMNA', 3620),
	('TAC COLUMNA CONTRASTADA', 3890),
	('TAC CRANEO', 2810),
	('TAC CRANEO CONTRASTADO', 3190),
	('TAC EXTREMIDADES', 3620),
	('TAC EXTREMIDADES CONTRASTADO', 3890),
	('TAC MANDIBULA', 3620),
	('TAC MANDIBULA CONTRASTADA', 3890),
	('TAC PELVIS', 3350),
	('TAC PELVIS CONTRASTADA', 3730),
	('TAC TORAX CONTRASTADO', 3460),
	('TAC TORAX SIMPLE', 3620),
	('US ABDOMEN COMPLETO', 1000),
	('US HIGADO', 840),
	('US PELVICO (UTERO GESTACION)', 1000),
	('US PROSTATA Y TESTICULOS', 840),
	('US UTERO Y OVARIOS', 840);

-- Las descripciones se comparan sin acentos, sin espacios de sobra y en
-- mayúsculas: la lista trae "RM CRÁNEO CONTRASTADA" y el catálogo lo puede
-- tener sin acento.
create or replace function pg_temp.llave_vet(p_texto text)
returns text
language sql
immutable
as $$
	select upper(btrim(regexp_replace(
		translate(coalesce(p_texto, ''),
			'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñ',
			'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn'),
		'\s+', ' ', 'g')));
$$;

-- La clave con la que se cobra es la que el estudio ya tiene en el catálogo.
-- Se prefiere la fila de veterinaria: hay estudios humanos con nombres
-- parecidos -"TAC CRANEO"- y el precio de la mascota no es el de la persona.
create temporary table tmp_precios_vet_claves as
select
	t.descripcion,
	t.precio,
	(
		select e.clave
		from public.estudios_imagen_catalogo e
		where pg_temp.llave_vet(e.descripcion) = pg_temp.llave_vet(t.descripcion)
		order by (e.modalidad <> 'veterinaria'), e.clave
		limit 1
	) as clave,
	(
		select e.modalidad
		from public.estudios_imagen_catalogo e
		where pg_temp.llave_vet(e.descripcion) = pg_temp.llave_vet(t.descripcion)
		order by (e.modalidad <> 'veterinaria'), e.clave
		limit 1
	) as modalidad
from tmp_precios_vet t;

-- Se borra lo que hubiera de esas claves para particular y se vuelve a
-- insertar: así la migración se puede correr de nuevo y de paso limpia los
-- renglones repetidos de capturas anteriores.
delete from public.precios_estudios pe
using tmp_precios_vet_claves t
where pe.cliente = 'Particular'
	and t.clave is not null
	and (
		pe.clave = t.clave
		or pg_temp.llave_vet(pe.descripcion) = pg_temp.llave_vet(t.descripcion)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio)
select 'Estudio', t.clave, t.descripcion, 'Particular', t.precio
from tmp_precios_vet_claves t
where t.clave is not null;

do $$
declare
	v_fila record;
	v_actualizados integer;
	v_faltantes integer := 0;
	v_fuera integer := 0;
begin
	select count(*) into v_actualizados from tmp_precios_vet_claves where clave is not null;
	raise notice 'Precios de veterinaria fijados: % de %', v_actualizados, (
		select count(*) from tmp_precios_vet
	);

	for v_fila in
		select descripcion from tmp_precios_vet_claves where clave is null order by descripcion
	loop
		v_faltantes := v_faltantes + 1;
		raise notice 'ATENCION: "%" no esta en el catalogo; su precio no se fijo', v_fila.descripcion;
	end loop;

	-- Un estudio de la lista que en el catálogo no es de veterinaria casi
	-- siempre significa que falta darlo de alta como tal: se avisa porque se le
	-- acaba de poner el precio de la mascota.
	for v_fila in
		select descripcion, clave, modalidad
		from tmp_precios_vet_claves
		where clave is not null and modalidad is distinct from 'veterinaria'
		order by descripcion
	loop
		v_fuera := v_fuera + 1;
		raise notice 'ATENCION: "%" cruzo con % (modalidad %), no con un estudio de veterinaria',
			v_fila.descripcion, v_fila.clave, v_fila.modalidad;
	end loop;

	if v_faltantes = 0 and v_fuera = 0 then
		raise notice 'Todos los estudios de la lista cruzaron con su estudio de veterinaria.';
	end if;
end
$$;

drop table tmp_precios_vet_claves;
drop table tmp_precios_vet;

NOTIFY pgrst, 'reload schema';
