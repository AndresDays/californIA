-- Ajusta los precios de imagen de SSA a la lista de precios de imagen
-- 2026 (245 estudios; la hoja repite algunos renglones y aquí van una vez).
--
-- Primero se revisa que cada estudio exista en el catálogo de imagen y se da de
-- alta el que falte; luego se deja el precio del cliente igual al de la hoja:
-- se reemplaza el que haya y se agrega el que falte. Se puede volver a correr.
--
-- De SSA se toma la columna "Nvo precio 2026-2027", que es la lista vigente.
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
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL BILATERAL', 5886.00),
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL UNILATERAL', 4179.60),
	('ESTUDIOS CONTRASTADOS', 'COLANGIOGRAFIA POR SONDA EN T', 1371.60),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA DOBLE CONTRASTE', 1890.00),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA POR COLOSTOMIA', 2203.20),
	('ESTUDIOS CONTRASTADOS', 'FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 1371.60),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA BILATERAL', 2030.40),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA UNILATERAL', 1404.00),
	('ESTUDIOS CONTRASTADOS', 'HISTEROSALPINGOGRAFIA', 1771.20),
	('ESTUDIOS CONTRASTADOS', 'SERIE ESOFAGO GASTRODUODENAL', 1566.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE GASTRODUODENAL BEBES MENORES 1', 1177.20),
	('ESTUDIOS CONTRASTADOS', 'SERIE GASTRODUODENAL/CONTRASTE HIDROSOLUBLE', 2257.20),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA BILATERAL', 2354.40),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA UNILATERAL', 1771.20),
	('ESTUDIOS CONTRASTADOS', 'TRANSITO INTESTINAL', 2030.40),
	('ESTUDIOS CONTRASTADOS', 'URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 1630.80),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA', 1825.20),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 2160.00),
	('OTROS ESTUDIOS', 'AGUDEZA VISUAL', 118.80),
	('OTROS ESTUDIOS', 'AUDIOMETRIA TONAL PAQUETE', 615.60),
	('OTROS ESTUDIOS', 'BIOPSIA MAMA AGUJA TRU CUT con estudio histo', 5864.40),
	('OTROS ESTUDIOS', 'BIOPSIA POR TAC', 7117.20),
	('OTROS ESTUDIOS', 'DENSITOMETRIA COMPLETA', 1609.20),
	('OTROS ESTUDIOS', 'DENSITOMETRIA DE COLUMNA Y CADERA', 896.40),
	('OTROS ESTUDIOS', 'ECOCARDIOGRAMA', 2548.80),
	('OTROS ESTUDIOS', 'ELECTROCARDIOGRAMA', 777.60),
	('OTROS ESTUDIOS', 'ELECTROENCEFALOGRAMA', 3391.20),
	('OTROS ESTUDIOS', 'ELECTROENCEFALOGRAMA CON MAPEO', 3888.00),
	('OTROS ESTUDIOS', 'EXAMEN CLINICO MEDICO', 540.00),
	('OTROS ESTUDIOS', 'HOLTER CARDIOLOGO', 2138.40),
	('OTROS ESTUDIOS', 'MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 777.60),
	('OTROS ESTUDIOS', 'MAPA', 2138.40),
	('OTROS ESTUDIOS', 'PRUEBAS DE ESFUERZO', 3682.80),
	('RADIOLOGIA', 'ABDOMEN 1 PLACA', 421.20),
	('RADIOLOGIA', 'ABDOMEN 2 PLACAS', 637.20),
	('RADIOLOGIA', 'AMBAS MANOS AP, LATERAL Y OBLICUAS', 918.00),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR', 637.20),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR Y OBLICUAS', 788.40),
	('RADIOLOGIA', 'AMBOS CODOS A.P. Y LAT.', 788.40),
	('RADIOLOGIA', 'AMBOS PIES 1 POSICION', 637.20),
	('RADIOLOGIA', 'AMBOS PIES 2 POSICIONES', 788.40),
	('RADIOLOGIA', 'ANTEBRAZO A.P. Y LAT.', 583.20),
	('RADIOLOGIA', 'ANTEBRAZO AP', 421.20),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR', 637.20),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR 4 POSICIO', 788.40),
	('RADIOLOGIA', 'BRAZO A.P. Y LAT.', 637.20),
	('RADIOLOGIA', 'BRAZO AP', 421.20),
	('RADIOLOGIA', 'CODO A.P. Y LAT.', 637.20),
	('RADIOLOGIA', 'CODOS AP', 637.20),
	('RADIOLOGIA', 'COLUMNA 1 POSICION', 421.20),
	('RADIOLOGIA', 'COLUMNA CERVICAL (2 POSICIONES)', 637.20),
	('RADIOLOGIA', 'COLUMNA CERVICAL( 4 POSICIONES)', 907.20),
	('RADIOLOGIA', 'COLUMNA DORSAL (2 POSICIONES)', 637.20),
	('RADIOLOGIA', 'COLUMNA DORSAL (4 POSICIONES)', 907.20),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR ( 4 POSICIONES)', 907.20),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 788.40),
	('RADIOLOGIA', 'COLUMNA LUMBAR (2 POSICIONES)', 637.20),
	('RADIOLOGIA', 'COLUMNA LUMBAR (4 POSICIONES)', 907.20),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (2 POSICIONES)', 637.20),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (4 POSICIONES)', 907.20),
	('RADIOLOGIA', 'COLUMNA SACROCOXIGEA (2 POSICIONES)', 637.20),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP', 1015.20),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP Y LATERAL', 1630.80),
	('RADIOLOGIA', 'COXIS AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'CRANEO 1 POSICION', 421.20),
	('RADIOLOGIA', 'CRANEO AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'CRANEO AP, LAT Y TOWNE', 788.40),
	('RADIOLOGIA', 'CUELLO A.P.', 421.20),
	('RADIOLOGIA', 'ESCANOMETRIA', 1015.20),
	('RADIOLOGIA', 'FEMUR 1 PLACA', 421.20),
	('RADIOLOGIA', 'FEMUR 2 PLACAS', 637.20),
	('RADIOLOGIA', 'HOMBRO AP', 421.20),
	('RADIOLOGIA', 'HOMBRO AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'HOMBROS AP', 637.20),
	('RADIOLOGIA', 'HOMBROS AP Y LATERAL', 907.20),
	('RADIOLOGIA', 'HUESOS PROPIOS DE LA NARIZ AP', 421.20),
	('RADIOLOGIA', 'LATERAL DE RINOFARINGE ( NASOFARINGE)', 421.20),
	('RADIOLOGIA', 'MANO DORSOPALMAR', 421.20),
	('RADIOLOGIA', 'MANO DORSOPALMAR AP, LATERAL Y OBLICUA', 788.40),
	('RADIOLOGIA', 'MANO DORSOPALMAR Y OBLICUA', 637.20),
	('RADIOLOGIA', 'MASTOIDES BILATERAL', 788.40),
	('RADIOLOGIA', 'MASTOIDES UNILATERAL', 421.20),
	('RADIOLOGIA', 'MUÑECA AP', 421.20),
	('RADIOLOGIA', 'MUÑECA AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'MUÑECAS AP', 637.20),
	('RADIOLOGIA', 'MUÑECAS AP Y LATERAL', 788.40),
	('RADIOLOGIA', 'PELVICEFALOMETRIA 2 PLACAS', 788.40),
	('RADIOLOGIA', 'PELVIS 1 PLACA', 421.20),
	('RADIOLOGIA', 'PELVIS 2 PLACAS', 637.20),
	('RADIOLOGIA', 'PERFILOGRAMA', 421.20),
	('RADIOLOGIA', 'PIE 1 POSICION', 421.20),
	('RADIOLOGIA', 'PIE 2 POSICIONES', 637.20),
	('RADIOLOGIA', 'PIE AP, LAT Y OBLICUA', 788.40),
	('RADIOLOGIA', 'PIERNA AP', 421.20),
	('RADIOLOGIA', 'PIERNA AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'PIERNAS AP', 637.20),
	('RADIOLOGIA', 'PIERNAS AP Y LATERAL', 788.40),
	('RADIOLOGIA', 'PLACA CUALQUIER REGION', 421.20),
	('RADIOLOGIA', 'PLACA EXTRA', 421.20),
	('RADIOLOGIA', 'RODILLA A.P', 421.20),
	('RADIOLOGIA', 'RODILLA AP Y LATERAL', 680.40),
	('RADIOLOGIA', 'RODILLAS AP', 637.20),
	('RADIOLOGIA', 'RODILLAS COMPARATIVAS AP Y LATERAL', 907.20),
	('RADIOLOGIA', 'ROTULAS AXIALES A 30°,60° Y 90° (UN LADO)', 788.40),
	('RADIOLOGIA', 'SENOS PARANASALES 1 POSICION', 421.20),
	('RADIOLOGIA', 'SENOS PARANASALES 2 POSICIONES', 637.20),
	('RADIOLOGIA', 'SENOS PARANASALES 3 POSICIONES', 788.40),
	('RADIOLOGIA', 'SERIE CARDIACA', 1231.20),
	('RADIOLOGIA', 'SERIE OSEA METASTASICA', 2592.00),
	('RADIOLOGIA', 'SHULLER BILATERAL', 907.20),
	('RADIOLOGIA', 'SHULLER UNILATERAL', 637.20),
	('RADIOLOGIA', 'TOBILLO A.P.', 421.20),
	('RADIOLOGIA', 'TOBILLO AP Y LATERAL', 637.20),
	('RADIOLOGIA', 'TOBILLOS AP', 421.20),
	('RADIOLOGIA', 'TOBILLOS AP Y LATERAL', 788.40),
	('RADIOLOGIA', 'TORAX (1 POSICION)', 421.20),
	('RADIOLOGIA', 'TORAX (2 POSICIONES)', 788.40),
	('RADIOLOGIA', 'TORAX OSEO Y OBLICUA', 788.40),
	('RADIOLOGIA', 'WATERS Y LATERAL DE CRANEO', 788.40),
	('RESONANCIA MAGNETICA', 'ANGIO-RESONANCIA CONTRASTADA DE CUALQUIER REGION', 6361.20),
	('RESONANCIA MAGNETICA', 'COLANGIO-RESONANCIA', 6361.20),
	('RESONANCIA MAGNETICA', 'RM ABDOMEN CONTRASTADA', 5292.00),
	('RESONANCIA MAGNETICA', 'RM ABDOMEN SIMPLE', 4125.60),
	('RESONANCIA MAGNETICA', 'RM ARTICULACION MANDIBULAR', 3909.60),
	('RESONANCIA MAGNETICA', 'RM CODO SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL CONTRASTADA', 4579.20),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL SIMPLE', 3056.40),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL CONTRASTADA', 4579.20),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL SIMPLE', 3056.40),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR CONTRASTADA', 4579.20),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR SIMPLE', 3056.40),
	('RESONANCIA MAGNETICA', 'RM CRANEO CONTRASTADA', 5108.40),
	('RESONANCIA MAGNETICA', 'RM CRANEO SIMPLE', 4222.80),
	('RESONANCIA MAGNETICA', 'RM CUELLO CONTRASTADA', 5108.40),
	('RESONANCIA MAGNETICA', 'RM CUELLO SIMPLE', 3520.80),
	('RESONANCIA MAGNETICA', 'RM DE CORAZON CONTRASTADA', 12063.60),
	('RESONANCIA MAGNETICA', 'RM DE CORAZON SIMPLE', 9806.40),
	('RESONANCIA MAGNETICA', 'RM FEMUR - MUSLO SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM HIPOFISIS (CONTRASTADA)', 5108.40),
	('RESONANCIA MAGNETICA', 'RM HOMBRO CONTRASTADO', 5292.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM MAMARIO CONTRASTADO', 5292.00),
	('RESONANCIA MAGNETICA', 'RM MAMARIO SIMPLE', 4125.60),
	('RESONANCIA MAGNETICA', 'RM MUSCULO ESQUELETICO 1 REGION SIMPLE', 4104.00),
	('RESONANCIA MAGNETICA', 'RM MUÑECA - MANO SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM NARIZ / SENOS PARANASALES', 4222.80),
	('RESONANCIA MAGNETICA', 'RM OIDO SIMPLE', 3520.80),
	('RESONANCIA MAGNETICA', 'RM PANORAMICA SIMPLE (CON 5 NIVELES)', 3682.80),
	('RESONANCIA MAGNETICA', 'RM PELVIS CONTRASTADA', 5292.00),
	('RESONANCIA MAGNETICA', 'RM PELVIS SIMPLE', 4125.60),
	('RESONANCIA MAGNETICA', 'RM PROSTATA CONTRASTADA', 5108.40),
	('RESONANCIA MAGNETICA', 'RM PROSTATA SIMPLE', 4222.80),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA CONTRASTADA', 5292.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM TOBILLO - PIE SIMPLE', 3909.60),
	('RESONANCIA MAGNETICA', 'RM TORAX SIMPLE', 4125.60),
	('TOMOGRAFIA', 'ANGIOTOMOGRAFIA UNA REGION', 6793.20),
	('TOMOGRAFIA', 'TAC ABDOMINO-PELVICO DOBLE CONTRASTE', 3272.40),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICA CON VALSALVA', 4158.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICA CONTRASTADA', 2494.80),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICO SIMPLE', 2160.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN CONTRASTADA', 2494.80),
	('TOMOGRAFIA', 'TAC DE ABDOMEN SIMPLE', 2160.00),
	('TOMOGRAFIA', 'TAC DE CADERA', 2160.00),
	('TOMOGRAFIA', 'TAC DE CADERA CONTRASTADA', 2084.40),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL', 2160.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL CONTRASTADA', 2440.80),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL', 2160.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL CONTRASTADA', 2440.80),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR', 2160.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR CONTRASTADA', 2084.40),
	('TOMOGRAFIA', 'TAC DE CRANEO CON VENTANA OSEA', 2322.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CONTRASTADA', 2440.80),
	('TOMOGRAFIA', 'TAC DE CRANEO SIMPLE', 2041.20),
	('TOMOGRAFIA', 'TAC DE CUELLO CON CONTRASTE', 2278.80),
	('TOMOGRAFIA', 'TAC DE CUELLO SIMPLE', 2160.00),
	('TOMOGRAFIA', 'TAC DE FEMUR', 2160.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS', 2278.80),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL', 2278.80),
	('TOMOGRAFIA', 'TAC DE MASTOIDES', 1965.60),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS', 2278.80),
	('TOMOGRAFIA', 'TAC DE OIDO', 2278.80),
	('TOMOGRAFIA', 'TAC DE OIDO CONTRASTADA', 2084.40),
	('TOMOGRAFIA', 'TAC DE ORBITA', 2278.80),
	('TOMOGRAFIA', 'TAC DE PELVIS', 2160.00),
	('TOMOGRAFIA', 'TAC DE PELVIS CONTRASTADA', 2559.60),
	('TOMOGRAFIA', 'TAC DE RODILLAS', 2278.80),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES', 2322.00),
	('TOMOGRAFIA', 'TAC DE SILLA TURCA', 2322.00),
	('TOMOGRAFIA', 'TAC DE TORAX CONTRASTADA', 2440.80),
	('TOMOGRAFIA', 'TAC DE TORAX SIMPLE', 2278.80),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL CONTRASTADA', 4104.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL SIMPLE', 3790.80),
	('TOMOGRAFIA', 'TAC TRIDIMENSIONAL CUALQUIER REGION', 4158.00),
	('TOMOGRAFIA', 'UROTOMOGRAFIA CONTRASTADA', 2916.00),
	('TOMOGRAFIA', 'UROTOMOGRAFIA SIMPLE', 2559.60),
	('ULTRASONIDOS', 'U.S. ABDOMEN 2 REGIONES', 896.40),
	('ULTRASONIDOS', 'U.S. AORTA ABDOMINAL', 1436.40),
	('ULTRASONIDOS', 'U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 3153.60),
	('ULTRASONIDOS', 'U.S. CAROTIDEO UNILAERAL CON DOPPLER COLOR', 1965.60),
	('ULTRASONIDOS', 'U.S. DE CUELLO', 896.40),
	('ULTRASONIDOS', 'U.S. DE TIROIDES', 896.40),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL BILATERAL', 3628.80),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL UNILATERAL', 2559.60),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 6123.60),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 4039.20),
	('ULTRASONIDOS', 'U.S. DOPPLER DE PENE', 2970.00),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO', 1544.40),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO GEMELAR', 2797.20),
	('ULTRASONIDOS', 'U.S. DOPPLER RENAL', 2948.40),
	('ULTRASONIDOS', 'U.S. DOPPLER TESTICULAR', 1544.40),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO BILATERAL', 3315.60),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO UNILATERAL', 2559.60),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR', 702.00),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR CON PRUEBA DE BOYDEN', 896.40),
	('ULTRASONIDOS', 'U.S. INGUINAL', 896.40),
	('ULTRASONIDOS', 'U.S. INGUINO-ESCROTAL', 896.40),
	('ULTRASONIDOS', 'U.S. MAMARIO', 702.00),
	('ULTRASONIDOS', 'U.S. MUSCULO ESQUELETICO', 896.40),
	('ULTRASONIDOS', 'U.S. OBSTETRICO', 702.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 3A DIMENSION', 1177.20),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 5TA. DIMENSION CON CD Y FOTO', 1285.20),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 1609.20),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ESTRUCTURAL', 1371.60),
	('ULTRASONIDOS', 'U.S. OBSTETRICO GEMELAR', 1306.80),
	('ULTRASONIDOS', 'U.S. OBSTETRICO PERFIL BIOFISICO', 1242.00),
	('ULTRASONIDOS', 'U.S. PELVICO / UTERO Y ANEXOS', 702.00),
	('ULTRASONIDOS', 'U.S. PROSTATICO', 702.00),
	('ULTRASONIDOS', 'U.S. PROSTATICO ENDORECTAL', 896.40),
	('ULTRASONIDOS', 'U.S. RENAL', 702.00),
	('ULTRASONIDOS', 'U.S. SEGUIMIENTO FOLICULAR', 1825.20),
	('ULTRASONIDOS', 'U.S. SONOHISTERO', 1760.40),
	('ULTRASONIDOS', 'U.S. TEJIDOS BLANDOS', 896.40),
	('ULTRASONIDOS', 'U.S. TESTICULAR', 702.00),
	('ULTRASONIDOS', 'U.S. TRANSFONTANELAR', 896.40),
	('ULTRASONIDOS', 'U.S. TRANSVAGINAL/ENDOVAGINAL', 896.40),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION ESTUDIO CONTRASTADO', 712.80),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION PLACA RX', 421.20),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION TOMOGRAFIA', 1134.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO ESTUDIO CONTRASTADO', 594.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO RADIOLOGO RX', 594.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO TOMOGRAFIA', 896.40),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO CONVENCIONAL', 831.60),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO DOPPLER', 1306.80),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO ENDOCAVITARIO', 831.60);

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
	and upper(btrim(pe.cliente)) = upper('SSA')
	and (
		pe.clave = t.clave
		or (
			coalesce(pe.clave, '') not ilike 'VET-%'
			and pg_temp.llave_imagen(pe.descripcion) = pg_temp.llave_imagen(t.descripcion_catalogo)
		)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select 'Estudio', t.clave, t.descripcion_catalogo, 'SSA', t.precio, now()
from tmp_lista_imagen_claves t
where t.clave is not null;

do $$
declare
	v_sin_clave integer;
begin
	select count(*) into v_sin_clave from tmp_lista_imagen_claves where clave is null;
	if v_sin_clave > 0 then
		raise notice 'ATENCION: % estudios de SSA no quedaron en el catálogo', v_sin_clave;
	end if;
end
$$;

drop table tmp_lista_imagen_claves;
drop table tmp_lista_imagen_cat;
drop table tmp_lista_imagen;

NOTIFY pgrst, 'reload schema';
