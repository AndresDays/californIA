-- Precios de imagen de ISSSTE, tomados de la lista de precios de imagen
-- 2026 (194 estudios; la hoja repite algunos renglones y aquí van una vez).
--
-- Primero se revisa que cada estudio exista en el catálogo de imagen y se da de
-- alta el que falte; luego se agrega el precio que el cliente no tenga. Un
-- precio que ya existe no se toca, así que la migración se puede volver a
-- correr sin cambiar nada.
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
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL BILATERAL', 3980.00),
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL UNILATERAL', 2600.00),
	('ESTUDIOS CONTRASTADOS', 'COLANGIOGRAFIA POR SONDA EN T', 1160.00),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA DOBLE CONTRASTE', 1190.00),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA POR COLOSTOMIA', 595.00),
	('ESTUDIOS CONTRASTADOS', 'FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 255.00),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA BILATERAL', 2200.00),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA UNILATERAL', 1675.00),
	('ESTUDIOS CONTRASTADOS', 'HISTEROSALPINGOGRAFIA', 1250.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE ESOFAGO GASTRODUODENAL', 495.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE GASTRODUODENAL BEBES MENORES 1', 235.00),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA BILATERAL', 2225.00),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA UNILATERAL', 1403.00),
	('ESTUDIOS CONTRASTADOS', 'TRANSITO INTESTINAL', 595.00),
	('ESTUDIOS CONTRASTADOS', 'URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 825.00),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA', 425.00),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 455.00),
	('OTROS ESTUDIOS', 'BIOPSIA MAMA AGUJA TRU CUT con estudio histo', 1315.00),
	('OTROS ESTUDIOS', 'BIOPSIA MAMA AGUJA TRU CUT sin estudio histop', 1215.00),
	('OTROS ESTUDIOS', 'DENSITOMETRIA DE COLUMNA Y CADERA', 650.00),
	('OTROS ESTUDIOS', 'ECOCARDIOGRAMA', 3585.00),
	('OTROS ESTUDIOS', 'ELECTROCARDIOGRAMA', 235.00),
	('OTROS ESTUDIOS', 'ELECTROENCEFALOGRAMA', 3785.00),
	('OTROS ESTUDIOS', 'HOLTER CARDIOLOGO', 3615.00),
	('OTROS ESTUDIOS', 'MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 285.00),
	('OTROS ESTUDIOS', 'MAMOGRAFIA DIGITAL CON ULTRASONIDO', 595.00),
	('OTROS ESTUDIOS', 'PRUEBAS DE ESFUERZO', 4250.00),
	('RADIOLOGIA', 'ABDOMEN 1 PLACA', 310.00),
	('RADIOLOGIA', 'ABDOMEN 2 PLACAS', 550.00),
	('RADIOLOGIA', 'AMBAS MANOS AP, LATERAL Y OBLICUAS', 285.00),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR', 190.00),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR Y OBLICUAS', 538.00),
	('RADIOLOGIA', 'AMBOS CODOS A.P. Y LAT.', 230.00),
	('RADIOLOGIA', 'AMBOS PIES 1 POSICION', 225.00),
	('RADIOLOGIA', 'AMBOS PIES 2 POSICIONES', 225.00),
	('RADIOLOGIA', 'ANTEBRAZO A.P. Y LAT.', 290.00),
	('RADIOLOGIA', 'ANTEBRAZO AP', 180.00),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR', 215.00),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR 4 POSICIO', 185.00),
	('RADIOLOGIA', 'BRAZO A.P. Y LAT.', 550.00),
	('RADIOLOGIA', 'BRAZO AP', 310.00),
	('RADIOLOGIA', 'CODO A.P.', 185.00),
	('RADIOLOGIA', 'CODO A.P. Y LAT.', 550.00),
	('RADIOLOGIA', 'CODOS AP', 225.00),
	('RADIOLOGIA', 'COLUMNA 1 POSICION', 310.00),
	('RADIOLOGIA', 'COLUMNA CERVICAL (2 POSICIONES)', 550.00),
	('RADIOLOGIA', 'COLUMNA CERVICAL( 4 POSICIONES)', 859.00),
	('RADIOLOGIA', 'COLUMNA DORSAL (2 POSICIONES)', 400.00),
	('RADIOLOGIA', 'COLUMNA DORSAL (4 POSICIONES)', 859.00),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR ( 4 POSICIONES)', 859.00),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 400.00),
	('RADIOLOGIA', 'COLUMNA LUMBAR (2 POSICIONES)', 550.00),
	('RADIOLOGIA', 'COLUMNA LUMBAR (4 POSICIONES)', 859.00),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (2 POSICIONES)', 290.00),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (4 POSICIONES)', 859.00),
	('RADIOLOGIA', 'COLUMNA SACROCOXIGEA (2 POSICIONES)', 125.00),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP', 400.00),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP Y LATERAL', 800.00),
	('RADIOLOGIA', 'COXIS AP Y LATERAL', 290.00),
	('RADIOLOGIA', 'CRANEO 1 POSICION', 290.00),
	('RADIOLOGIA', 'CRANEO AP Y LATERAL', 550.00),
	('RADIOLOGIA', 'CRANEO AP, LAT Y TOWNE', 657.00),
	('RADIOLOGIA', 'CUELLO A.P.', 190.00),
	('RADIOLOGIA', 'ESCANOMETRIA', 500.00),
	('RADIOLOGIA', 'FEMUR 1 PLACA', 290.00),
	('RADIOLOGIA', 'FEMUR 2 PLACAS', 550.00),
	('RADIOLOGIA', 'HOMBRO AP', 285.00),
	('RADIOLOGIA', 'HOMBRO AP Y LATERAL', 400.00),
	('RADIOLOGIA', 'HOMBROS AP', 290.00),
	('RADIOLOGIA', 'HOMBROS AP Y LATERAL', 400.00),
	('RADIOLOGIA', 'HUESOS PROPIOS DE LA NARIZ AP', 115.00),
	('RADIOLOGIA', 'LATERAL DE RINOFARINGE ( NASOFARINGE)', 115.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR', 290.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR AP, LATERAL Y OBLICUA', 550.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR Y OBLICUA', 400.00),
	('RADIOLOGIA', 'MASTOIDES BILATERAL', 455.00),
	('RADIOLOGIA', 'MASTOIDES UNILATERAL', 354.00),
	('RADIOLOGIA', 'MUÑECA AP', 255.00),
	('RADIOLOGIA', 'MUÑECA AP Y LATERAL', 450.00),
	('RADIOLOGIA', 'MUÑECAS AP', 310.00),
	('RADIOLOGIA', 'MUÑECAS AP Y LATERAL', 550.00),
	('RADIOLOGIA', 'PELVICEFALOMETRIA 2 PLACAS', 135.00),
	('RADIOLOGIA', 'PELVIS 1 PLACA', 310.00),
	('RADIOLOGIA', 'PELVIS 2 PLACAS', 550.00),
	('RADIOLOGIA', 'PERFILOGRAMA', 290.00),
	('RADIOLOGIA', 'PIE 1 POSICION', 290.00),
	('RADIOLOGIA', 'PIE 2 POSICIONES', 500.00),
	('RADIOLOGIA', 'PIE AP, LAT Y OBLICUA', 315.00),
	('RADIOLOGIA', 'PIERNA AP', 215.00),
	('RADIOLOGIA', 'PIERNA AP Y LATERAL', 255.00),
	('RADIOLOGIA', 'PIERNAS AP', 290.00),
	('RADIOLOGIA', 'PIERNAS AP Y LATERAL', 595.00),
	('RADIOLOGIA', 'RODILLA A.P', 315.00),
	('RADIOLOGIA', 'RODILLA AP Y LATERAL', 380.00),
	('RADIOLOGIA', 'RODILLAS AP', 355.00),
	('RADIOLOGIA', 'RODILLAS COMPARATIVAS AP Y LATERAL', 550.00),
	('RADIOLOGIA', 'ROTULAS AXIALES A 30°,60° Y 90° (UN LADO)', 255.00),
	('RADIOLOGIA', 'SENOS PARANASALES 1 POSICION', 125.00),
	('RADIOLOGIA', 'SENOS PARANASALES 2 POSICIONES', 155.00),
	('RADIOLOGIA', 'SENOS PARANASALES 3 POSICIONES', 175.00),
	('RADIOLOGIA', 'SERIE OSEA METASTASICA', 1087.00),
	('RADIOLOGIA', 'SHULLER BILATERAL', 115.00),
	('RADIOLOGIA', 'SHULLER UNILATERAL', 125.00),
	('RADIOLOGIA', 'TOBILLO A.P.', 295.00),
	('RADIOLOGIA', 'TOBILLO AP Y LATERAL', 550.00),
	('RADIOLOGIA', 'TOBILLOS AP', 315.00),
	('RADIOLOGIA', 'TOBILLOS AP Y LATERAL', 619.00),
	('RADIOLOGIA', 'TORAX (1 POSICION)', 310.00),
	('RADIOLOGIA', 'TORAX (2 POSICIONES)', 350.00),
	('RADIOLOGIA', 'TORAX OSEO Y OBLICUA', 315.00),
	('RADIOLOGIA', 'WATERS Y LATERAL DE CRANEO', 315.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR SIMPLE', 2450.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO SIMPLE', 3100.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA SIMPLE', 3100.00),
	('TOMOGRAFIA', 'ANGIOTOMOGRAFIA UNA REGION', 4925.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICA CONTRASTADA', 2190.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICO SIMPLE', 1525.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN CONTRASTADA', 2090.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN SIMPLE', 1490.00),
	('TOMOGRAFIA', 'TAC DE CADERA', 1300.00),
	('TOMOGRAFIA', 'TAC DE CADERA CONTRASTADA', 1400.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL', 1500.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL CONTRASTADA', 1090.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL', 1300.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL CONTRASTADA', 2090.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR', 1315.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR CONTRASTADA', 1855.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CON VENTANA OSEA', 1600.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CONTRASTADA', 2185.00),
	('TOMOGRAFIA', 'TAC DE CRANEO SIMPLE', 1550.00),
	('TOMOGRAFIA', 'TAC DE CUELLO CON CONTRASTE', 2059.00),
	('TOMOGRAFIA', 'TAC DE CUELLO SIMPLE', 1488.00),
	('TOMOGRAFIA', 'TAC DE FEMUR', 1700.00),
	('TOMOGRAFIA', 'TAC DE FEMUR CONTRASTADA', 1800.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS', 1690.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS CONTRASTADA', 1850.00),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL', 1815.00),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL CONTRASTADA', 2290.00),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS', 1488.00),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS CONTRASTADA', 2059.00),
	('TOMOGRAFIA', 'TAC DE OIDO', 1415.00),
	('TOMOGRAFIA', 'TAC DE OIDO CONTRASTADA', 1895.00),
	('TOMOGRAFIA', 'TAC DE ORBITA', 1355.00),
	('TOMOGRAFIA', 'TAC DE ORBITA CONTRASTADA', 1755.00),
	('TOMOGRAFIA', 'TAC DE PELVIS', 1535.00),
	('TOMOGRAFIA', 'TAC DE PELVIS CONTRASTADA', 2059.00),
	('TOMOGRAFIA', 'TAC DE RODILLAS', 1350.00),
	('TOMOGRAFIA', 'TAC DE RODILLAS CONTRASTADA', 1550.00),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES', 1585.00),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES CONTRASTADA', 2190.00),
	('TOMOGRAFIA', 'TAC DE SILLA TURCA', 1595.00),
	('TOMOGRAFIA', 'TAC DE TORAX CONTRASTADA', 1800.00),
	('TOMOGRAFIA', 'TAC DE TORAX SIMPLE', 1550.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL CONTRASTADA', 3235.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL SIMPLE', 2525.00),
	('TOMOGRAFIA', 'TAC TRIDIMENSIONAL CUALQUIER REGION', 3214.00),
	('TOMOGRAFIA', 'TAC TRIFASICA', 3890.00),
	('TOMOGRAFIA', 'UROTOMOGRAFIA CONTRASTADA', 3590.00),
	('TOMOGRAFIA', 'UROTOMOGRAFIA SIMPLE', 2900.00),
	('ULTRASONIDOS', 'U.S. ABDOMEN 2 REGIONES', 515.00),
	('ULTRASONIDOS', 'U.S. AORTA ABDOMINAL', 455.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 815.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO UNILAERAL CON DOPPLER COLOR', 795.00),
	('ULTRASONIDOS', 'U.S. DE CUELLO', 695.00),
	('ULTRASONIDOS', 'U.S. DE PENE', 855.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL BILATERAL', 1890.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL UNILATERAL', 1690.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 3680.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 3600.00),
	('ULTRASONIDOS', 'U.S. DOPPLER RENAL', 925.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO BILATERAL', 1595.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO UNILATERAL', 1495.00),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR', 545.00),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR CON PRUEBA DE BOYDEN', 828.00),
	('ULTRASONIDOS', 'U.S. INGUINO-ESCROTAL', 825.00),
	('ULTRASONIDOS', 'U.S. MAMARIO', 285.00),
	('ULTRASONIDOS', 'U.S. MUSCULO ESQUELETICO', 800.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO', 523.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 3A DIMENSION', 948.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 5TA. DIMENSION CON CD Y FOTO', 1074.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 595.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ESTRUCTURAL', 680.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO GEMELAR', 595.00),
	('ULTRASONIDOS', 'U.S. PELVICO / UTERO Y ANEXOS', 541.00),
	('ULTRASONIDOS', 'U.S. PROSTATICO ENDORECTAL', 578.00),
	('ULTRASONIDOS', 'U.S. RENAL', 545.00),
	('ULTRASONIDOS', 'U.S. SEGUIMIENTO FOLICULAR', 1555.00),
	('ULTRASONIDOS', 'U.S. SONOHISTERO', 1390.00),
	('ULTRASONIDOS', 'U.S. TEJIDOS BLANDOS', 455.00),
	('ULTRASONIDOS', 'U.S. TESTICULAR', 855.00),
	('ULTRASONIDOS', 'U.S. TRANSFONTANELAR', 455.00),
	('ULTRASONIDOS', 'U.S. TRANSVAGINAL/ENDOVAGINAL', 946.00);

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

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select 'Estudio', t.clave, t.descripcion_catalogo, 'ISSSTE', t.precio, now()
from tmp_lista_imagen_claves t
where t.clave is not null
	and not exists (
		select 1
		from public.precios_estudios pe
		where upper(btrim(pe.cliente)) = upper('ISSSTE')
			and (
				pe.clave = t.clave
				or (
					coalesce(pe.clave, '') not ilike 'VET-%'
					and pg_temp.llave_imagen(pe.descripcion) = pg_temp.llave_imagen(t.descripcion_catalogo)
				)
			)
	);

do $$
declare
	v_sin_clave integer;
begin
	select count(*) into v_sin_clave from tmp_lista_imagen_claves where clave is null;
	if v_sin_clave > 0 then
		raise notice 'ATENCION: % estudios de ISSSTE no quedaron en el catálogo', v_sin_clave;
	end if;
end
$$;

drop table tmp_lista_imagen_claves;
drop table tmp_lista_imagen_cat;
drop table tmp_lista_imagen;

NOTIFY pgrst, 'reload schema';
