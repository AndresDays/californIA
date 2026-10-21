-- Ajusta los precios de imagen de IMSS a la lista de precios de imagen
-- 2026 (100 estudios; la hoja repite algunos renglones y aquí van una vez).
--
-- Primero se revisa que cada estudio exista en el catálogo de imagen y se da de
-- alta el que falte; luego se deja el precio del cliente igual al de la hoja:
-- se reemplaza el que haya y se agrega el que falte. Se puede volver a correr.
--
-- La hoja no trae claves: se cruza por descripción, sin acentos ni signos. Cuatro
-- descripciones de la hoja tienen erratas ("4 POSICIO", "30°,60° Y 90°",
-- "HISTEROSALPINGOGRAFIA", "UNILAERAL") y se leen con la ortografía del
-- catálogo para no dar de alta un duplicado. Los estudios de veterinaria no
-- cuentan: hay nombres iguales y el precio de la mascota no es el de la persona.

create temporary table tmp_lista_imagen (
	categoria text not null,
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_lista_imagen (categoria, descripcion, precio)
values
	('RESONANCIA MAGNETICA', 'RM ABDOMEN CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM ABDOMEN SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM ARTICULACION MANDIBULAR', 2450.00),
	('RESONANCIA MAGNETICA', 'RM CODO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA 2 REGIONES', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA 2 REGIONES CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA 3 REGIONES', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA 3 REGIONES CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM CRANEO CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM CRANEO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM CUELLO CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM CUELLO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM FEMUR - MUSLO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO CONTRASTADO', 4250.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM MAMARIO CONTRASTADO', 4250.00),
	('RESONANCIA MAGNETICA', 'RM MAMARIO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM MUSCULO ESQUELETICO 1 REGION SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM MUSCULO ESQUELETICO 2 REGIONES SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM MUSCULO ESQUELETICO 3 REGIONES SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM MUÑECA - MANO CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM MUÑECA - MANO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM NARIZ / SENOS PARANASALES', 2450.00),
	('RESONANCIA MAGNETICA', 'RM NARIZ / SENOS PARANASALES CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM OIDO SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM PANORAMICA SIMPLE (CON 5 NIVELES)', 2450.00),
	('RESONANCIA MAGNETICA', 'RM PELVIS CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM PELVIS SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA CONTRASTADA', 4250.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM TOBILLO - PIE SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM TORAX SIMPLE', 2450.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICA CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICO SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC DE CADERA', 2350.00),
	('TOMOGRAFIA', 'TAC DE CADERA CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL', 2350.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL', 2350.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR', 2350.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE CRANEO SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC DE CUELLO CON CONTRASTE', 2750.00),
	('TOMOGRAFIA', 'TAC DE CUELLO SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC DE FEMUR', 2350.00),
	('TOMOGRAFIA', 'TAC DE FEMUR CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS', 2350.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL', 2350.00),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE MASTOIDES', 2350.00),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS', 2350.00),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE OIDO', 2350.00),
	('TOMOGRAFIA', 'TAC DE OIDO CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE ORBITA', 2350.00),
	('TOMOGRAFIA', 'TAC DE ORBITA CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE PELVIS', 2350.00),
	('TOMOGRAFIA', 'TAC DE PELVIS CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE RODILLAS', 2350.00),
	('TOMOGRAFIA', 'TAC DE RODILLAS CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES', 2350.00),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE SILLA TURCA', 2350.00),
	('TOMOGRAFIA', 'TAC DE TORAX CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC DE TORAX SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL CONTRASTADA', 2750.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL SIMPLE', 2350.00),
	('TOMOGRAFIA', 'TAC TRIDIMENSIONAL CUALQUIER REGION', 2350.00),
	('TOMOGRAFIA', 'TAC TRIFASICA', 2750.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 1650.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO UNILAERAL CON DOPPLER COLOR', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL BILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL UNILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER DE PENE', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER HEPATICO CON ELASTOGRAFIA', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER HEPATO VESICULAR', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER MAMARIO', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO GEMELAR', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER RENAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER TEJIDOS BLANDOS', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER TESTICULAR', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER TIROIDEO', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER TRANSVAGINAL / ENDOVAGINAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO BILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO UNILATERAL', 1650.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 1650.00);

create or replace function pg_temp.llave_imagen(p_texto text)
returns text
language sql
immutable
as $$
	select btrim(regexp_replace(
		regexp_replace(
			upper(translate(coalesce(p_texto, ''),
				'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñ',
				'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn')),
			'[^A-Z0-9]+', ' ', 'g'),
		'\s+', ' ', 'g'));
$$;

-- La descripción con que se busca en el catálogo, con las erratas corregidas,
-- y la modalidad que le toca por su categoría.
create temporary table tmp_lista_imagen_cat as
select
	t.categoria,
	t.descripcion,
	t.precio,
	case pg_temp.llave_imagen(t.descripcion)
		when pg_temp.llave_imagen('ARTICULACION TEMPOROMANDIBULAR 4 POSICIO')
			then 'ARTICULACION TEMPOROMANDIBULAR 4 POSICIONES'
		when pg_temp.llave_imagen('ROTULAS AXIALES A 30°,60° Y 90° (UN LADO)')
			then 'ROTULAS AXIALES A 30, 60 Y 90 GRADOS (UN LADO)'
		when pg_temp.llave_imagen('HISTEROSALPINGOGRAFIA')
			then 'HISTEROSALPINGOSGRAFIA'
		when pg_temp.llave_imagen('U.S. CAROTIDEO UNILAERAL CON DOPPLER COLOR')
			then 'U.S. CAROTIDEO UNILATERAL CON DOPPLER COLOR'
		else t.descripcion
	end as descripcion_catalogo,
	case t.categoria
		when 'ESTUDIOS CONTRASTADOS' then 'estudios_contrastados'
		when 'OTROS ESTUDIOS' then 'otro'
		when 'RADIOLOGIA' then 'radiografia'
		when 'RESONANCIA MAGNETICA' then 'resonancia'
		when 'TOMOGRAFIA' then 'tomografia'
		when 'ULTRASONIDOS' then 'ultrasonido'
		when 'URGENCIAS Y OTROS' then 'urgencias_otros'
	end as modalidad
from tmp_lista_imagen t;

-- ── Catálogo ────────────────────────────────────────────────────────────────
-- Se da de alta lo que no esté. La resonancia es de CDC y el resto de la imagen
-- de CDI, como el resto del catálogo. La clave sigue el formato de las demás:
-- prefijo de la modalidad y la descripción en mayúsculas con guiones.
insert into public.estudios_imagen_catalogo (
	clave,
	descripcion,
	empresa_operativa,
	id_empresa,
	modalidad,
	area,
	requiere_contraste,
	requiere_interpretacion,
	dias_proceso,
	activo
)
select distinct on (pg_temp.llave_imagen(t.descripcion_catalogo))
	case t.modalidad
		when 'estudios_contrastados' then 'EC'
		when 'otro' then 'OT'
		when 'radiografia' then 'RX'
		when 'resonancia' then 'RM'
		when 'tomografia' then 'TAC'
		when 'ultrasonido' then 'US'
		when 'urgencias_otros' then 'UO'
	end || '-' || regexp_replace(
		regexp_replace(pg_temp.llave_imagen(t.descripcion_catalogo), '^(RM|U S|TAC DE|TAC) ', ''),
		' ', '-', 'g'),
	t.descripcion_catalogo,
	case when t.modalidad = 'resonancia' then 'CDC' else 'CDI' end,
	(
		select e.id_empresa
		from public.empresas e
		where case
			when t.modalidad = 'resonancia'
				then e.nombre ilike '%california%' or e.nombre ~* '\mcdc\M'
			else e.nombre ilike '%imagen%' or e.nombre ~* '\mcdi\M'
		end
		order by e.id_empresa
		limit 1
	),
	t.modalidad,
	case t.modalidad
		when 'estudios_contrastados' then 'Estudios contrastados'
		when 'otro' then 'Otros estudios'
		when 'radiografia' then 'Radiologia'
		when 'resonancia' then 'Resonancia magnetica'
		when 'tomografia' then 'Tomografia'
		when 'ultrasonido' then 'Ultrasonidos'
		when 'urgencias_otros' then 'Urgencias y otros'
	end,
	t.descripcion_catalogo ilike '%contrast%',
	t.modalidad not in ('otro', 'urgencias_otros'),
	1,
	true
from tmp_lista_imagen_cat t
where t.modalidad is not null
	and not exists (
		select 1 from public.estudios_imagen_catalogo e
		where e.modalidad <> 'veterinaria'
			and pg_temp.llave_imagen(e.descripcion) = pg_temp.llave_imagen(t.descripcion_catalogo)
	)
order by pg_temp.llave_imagen(t.descripcion_catalogo)
on conflict (clave) do nothing;

-- ── Precios ─────────────────────────────────────────────────────────────────
-- Se cobra con la clave que el estudio tiene en el catálogo, para que el precio
-- se encuentre por clave y no sólo por descripción.
create temporary table tmp_lista_imagen_claves as
select
	t.*,
	(
		select e.clave
		from public.estudios_imagen_catalogo e
		where e.modalidad <> 'veterinaria'
			and pg_temp.llave_imagen(e.descripcion) = pg_temp.llave_imagen(t.descripcion_catalogo)
		order by e.clave
		limit 1
	) as clave
from tmp_lista_imagen_cat t;

-- Se borra el precio que tenga el cliente para esos estudios -por clave o por
-- descripción, sin tocar los de veterinaria- y se vuelve a insertar con el de
-- la hoja. De paso se limpian renglones repetidos.
delete from public.precios_estudios pe
using tmp_lista_imagen_claves t
where t.clave is not null
	and upper(btrim(pe.cliente)) = upper('IMSS')
	and (
		pe.clave = t.clave
		or (
			coalesce(pe.clave, '') not ilike 'VET-%'
			and pg_temp.llave_imagen(pe.descripcion) = pg_temp.llave_imagen(t.descripcion_catalogo)
		)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select 'Estudio', t.clave, t.descripcion_catalogo, 'IMSS', t.precio, now()
from tmp_lista_imagen_claves t
where t.clave is not null;

do $$
declare
	v_sin_clave integer;
begin
	select count(*) into v_sin_clave from tmp_lista_imagen_claves where clave is null;
	if v_sin_clave > 0 then
		raise notice 'ATENCION: % estudios de IMSS no quedaron en el catálogo', v_sin_clave;
	end if;
end
$$;

drop table tmp_lista_imagen_claves;
drop table tmp_lista_imagen_cat;
drop table tmp_lista_imagen;

NOTIFY pgrst, 'reload schema';
