-- Precios de imagen de Medisim, tomados de la lista de precios de imagen
-- 2026 (229 estudios; la hoja repite algunos renglones y aquí van una vez).
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
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL BILATERAL', 6470.00),
	('ESTUDIOS CONTRASTADOS', 'ARTERIOGRAFIA FEMORAL UNILATERAL', 4260.00),
	('ESTUDIOS CONTRASTADOS', 'COLANGIOGRAFIA POR SONDA EN T', 1730.00),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA DOBLE CONTRASTE', 2290.00),
	('ESTUDIOS CONTRASTADOS', 'COLON POR ENEMA POR COLOSTOMIA', 2430.00),
	('ESTUDIOS CONTRASTADOS', 'FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 1910.00),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA BILATERAL', 2890.00),
	('ESTUDIOS CONTRASTADOS', 'FLEBOGRAFIA UNILATERAL', 2540.00),
	('ESTUDIOS CONTRASTADOS', 'HISTEROSALPINGOGRAFIA', 2140.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE ESOFAGO GASTRODUODENAL', 1960.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE GASTRODUODENAL BEBES MENORES 1', 1470.00),
	('ESTUDIOS CONTRASTADOS', 'SERIE GASTRODUODENAL/CONTRASTE HIDROSOLUBLE', 2420.00),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA BILATERAL', 2950.00),
	('ESTUDIOS CONTRASTADOS', 'SIALOGRAFIA UNILATERAL', 2140.00),
	('ESTUDIOS CONTRASTADOS', 'TRANSITO INTESTINAL', 2430.00),
	('ESTUDIOS CONTRASTADOS', 'URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 2020.00),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA', 2250.00),
	('ESTUDIOS CONTRASTADOS', 'UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 2430.00),
	('OTROS ESTUDIOS', 'BIOPSIA MAMA AGUJA TRU CUT con estudio histo', 5490.00),
	('OTROS ESTUDIOS', 'BIOPSIA POR TAC', 5720.00),
	('OTROS ESTUDIOS', 'DENSITOMETRIA COMPLETA', 1420.00),
	('OTROS ESTUDIOS', 'DENSITOMETRIA DE COLUMNA Y CADERA', 1000.00),
	('OTROS ESTUDIOS', 'ECOCARDIOGRAMA', 3120.00),
	('OTROS ESTUDIOS', 'ELECTROCARDIOGRAMA', 750.00),
	('OTROS ESTUDIOS', 'HOLTER CARDIOLOGO', 2630.00),
	('OTROS ESTUDIOS', 'MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 890.00),
	('OTROS ESTUDIOS', 'MAPA', 2630.00),
	('RADIOLOGIA', 'ABDOMEN 1 PLACA', 460.00),
	('RADIOLOGIA', 'ABDOMEN 2 PLACAS', 750.00),
	('RADIOLOGIA', 'AMBAS MANOS AP, LATERAL Y OBLICUAS', 1100.00),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR', 750.00),
	('RADIOLOGIA', 'AMBAS MANOS DORSOPALMAR Y OBLICUAS', 810.00),
	('RADIOLOGIA', 'AMBOS CODOS A.P. Y LAT.', 810.00),
	('RADIOLOGIA', 'AMBOS PIES 1 POSICION', 750.00),
	('RADIOLOGIA', 'AMBOS PIES 2 POSICIONES', 810.00),
	('RADIOLOGIA', 'ANTEBRAZO A.P. Y LAT.', 750.00),
	('RADIOLOGIA', 'ANTEBRAZO AP', 460.00),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR', 460.00),
	('RADIOLOGIA', 'ARTICULACION TEMPOROMANDIBULAR 4 POSICIO', 810.00),
	('RADIOLOGIA', 'BRAZO A.P. Y LAT.', 750.00),
	('RADIOLOGIA', 'BRAZO AP', 460.00),
	('RADIOLOGIA', 'CODO A.P. Y LAT.', 750.00),
	('RADIOLOGIA', 'CODOS AP', 630.00),
	('RADIOLOGIA', 'COLUMNA 1 POSICION', 460.00),
	('RADIOLOGIA', 'COLUMNA CERVICAL (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA CERVICAL( 4 POSICIONES)', 1100.00),
	('RADIOLOGIA', 'COLUMNA DORSAL (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA DORSAL (4 POSICIONES)', 1100.00),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR ( 4 POSICIONES)', 1100.00),
	('RADIOLOGIA', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA LUMBAR (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA LUMBAR (4 POSICIONES)', 1100.00),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA LUMBOSACRA (4 POSICIONES)', 1100.00),
	('RADIOLOGIA', 'COLUMNA SACROCOXIGEA (2 POSICIONES)', 750.00),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP', 1100.00),
	('RADIOLOGIA', 'COLUMNA VERTEBRAL TOTAL AP Y LATERAL', 1790.00),
	('RADIOLOGIA', 'COXIS AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'CRANEO 1 POSICION', 460.00),
	('RADIOLOGIA', 'CRANEO AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'CRANEO AP, LAT Y TOWNE', 800.00),
	('RADIOLOGIA', 'CUELLO A.P.', 460.00),
	('RADIOLOGIA', 'ESCANOMETRIA', 1100.00),
	('RADIOLOGIA', 'FEMUR 1 PLACA', 460.00),
	('RADIOLOGIA', 'FEMUR 2 PLACAS', 750.00),
	('RADIOLOGIA', 'HOMBRO AP', 460.00),
	('RADIOLOGIA', 'HOMBRO AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'HOMBROS AP', 750.00),
	('RADIOLOGIA', 'HOMBROS AP Y LATERAL', 810.00),
	('RADIOLOGIA', 'HUESOS PROPIOS DE LA NARIZ AP', 460.00),
	('RADIOLOGIA', 'LATERAL DE RINOFARINGE ( NASOFARINGE)', 460.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR', 460.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR AP, LATERAL Y OBLICUA', 750.00),
	('RADIOLOGIA', 'MANO DORSOPALMAR Y OBLICUA', 750.00),
	('RADIOLOGIA', 'MASTOIDES BILATERAL', 750.00),
	('RADIOLOGIA', 'MASTOIDES UNILATERAL', 460.00),
	('RADIOLOGIA', 'MUÑECA AP', 460.00),
	('RADIOLOGIA', 'MUÑECA AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'MUÑECAS AP', 750.00),
	('RADIOLOGIA', 'MUÑECAS AP Y LATERAL', 810.00),
	('RADIOLOGIA', 'PELVICEFALOMETRIA 2 PLACAS', 750.00),
	('RADIOLOGIA', 'PELVIS 1 PLACA', 460.00),
	('RADIOLOGIA', 'PELVIS 2 PLACAS', 750.00),
	('RADIOLOGIA', 'PERFILOGRAMA', 460.00),
	('RADIOLOGIA', 'PIE 1 POSICION', 460.00),
	('RADIOLOGIA', 'PIE 2 POSICIONES', 750.00),
	('RADIOLOGIA', 'PIE AP, LAT Y OBLICUA', 800.00),
	('RADIOLOGIA', 'PIERNA AP', 460.00),
	('RADIOLOGIA', 'PIERNA AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'PIERNAS AP', 750.00),
	('RADIOLOGIA', 'PIERNAS AP Y LATERAL', 810.00),
	('RADIOLOGIA', 'RODILLA A.P', 460.00),
	('RADIOLOGIA', 'RODILLA AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'RODILLAS AP', 750.00),
	('RADIOLOGIA', 'RODILLAS COMPARATIVAS AP Y LATERAL', 810.00),
	('RADIOLOGIA', 'ROTULAS AXIALES A 30°,60° Y 90° (UN LADO)', 810.00),
	('RADIOLOGIA', 'SENOS PARANASALES 1 POSICION', 460.00),
	('RADIOLOGIA', 'SENOS PARANASALES 2 POSICIONES', 750.00),
	('RADIOLOGIA', 'SENOS PARANASALES 3 POSICIONES', 800.00),
	('RADIOLOGIA', 'SERIE OSEA METASTASICA', 3060.00),
	('RADIOLOGIA', 'SHULLER BILATERAL', 800.00),
	('RADIOLOGIA', 'SHULLER UNILATERAL', 460.00),
	('RADIOLOGIA', 'TOBILLO A.P.', 460.00),
	('RADIOLOGIA', 'TOBILLO AP Y LATERAL', 750.00),
	('RADIOLOGIA', 'TOBILLOS AP', 460.00),
	('RADIOLOGIA', 'TOBILLOS AP Y LATERAL', 810.00),
	('RADIOLOGIA', 'TORAX (1 POSICION)', 460.00),
	('RADIOLOGIA', 'TORAX (2 POSICIONES)', 810.00),
	('RADIOLOGIA', 'TORAX OSEO Y OBLICUA', 810.00),
	('RADIOLOGIA', 'WATERS Y LATERAL DE CRANEO', 750.00),
	('RESONANCIA MAGNETICA', 'ANGIO-RESONANCIA CONTRASTADA DE CUALQUIER REGION', 6550.00),
	('RESONANCIA MAGNETICA', 'ANGIO-RESONANCIA SIMPLE DE CUALQUIER REGION', 6550.00),
	('RESONANCIA MAGNETICA', 'COLANGIO-RESONANCIA', 6550.00),
	('RESONANCIA MAGNETICA', 'RM ABDOMEN CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM ABDOMEN SIMPLE', 4490.00),
	('RESONANCIA MAGNETICA', 'RM ARTICULACION MANDIBULAR', 4280.00),
	('RESONANCIA MAGNETICA', 'RM CODO SIMPLE', 4270.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL CONTRASTADA', 4910.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA CERVICAL SIMPLE', 3360.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL CONTRASTADA', 4910.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA DORSAL SIMPLE', 3360.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR CONTRASTADA', 4910.00),
	('RESONANCIA MAGNETICA', 'RM COLUMNA LUMBAR SIMPLE', 3360.00),
	('RESONANCIA MAGNETICA', 'RM CRANEO CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM CRANEO SIMPLE', 3860.00),
	('RESONANCIA MAGNETICA', 'RM CUELLO CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM CUELLO SIMPLE', 3860.00),
	('RESONANCIA MAGNETICA', 'RM DE CORAZON CONTRASTADA', 12600.00),
	('RESONANCIA MAGNETICA', 'RM DE CORAZON SIMPLE', 10080.00),
	('RESONANCIA MAGNETICA', 'RM FEMUR - MUSLO SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM HIPOFISIS (CONTRASTADA)', 5670.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO CONTRASTADO', 5670.00),
	('RESONANCIA MAGNETICA', 'RM HOMBRO SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM MAMARIO CONTRASTADO', 5670.00),
	('RESONANCIA MAGNETICA', 'RM MAMARIO SIMPLE', 1340.00),
	('RESONANCIA MAGNETICA', 'RM MUSCULO ESQUELETICO 1 REGION SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM MUÑECA - MANO SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM NARIZ / SENOS PARANASALES', 3860.00),
	('RESONANCIA MAGNETICA', 'RM OIDO SIMPLE', 3860.00),
	('RESONANCIA MAGNETICA', 'RM PANORAMICA SIMPLE (CON 5 NIVELES)', 3910.00),
	('RESONANCIA MAGNETICA', 'RM PELVIS CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM PELVIS SIMPLE', 4450.00),
	('RESONANCIA MAGNETICA', 'RM PROSTATA CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM PROSTATA SIMPLE', 3860.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA CONTRASTADA', 5670.00),
	('RESONANCIA MAGNETICA', 'RM RODILLA - PIERNA SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM TOBILLO - PIE SIMPLE', 4280.00),
	('RESONANCIA MAGNETICA', 'RM TORAX SIMPLE', 4450.00),
	('TOMOGRAFIA', 'ANGIOTOMOGRAFIA UNA REGION', 6760.00),
	('TOMOGRAFIA', 'TAC ABDOMINO-PELVICO DOBLE CONTRASTE', 3930.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICA CONTRASTADA', 4160.00),
	('TOMOGRAFIA', 'TAC ABDOMINOPELVICO SIMPLE', 3890.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN CONTRASTADA', 3990.00),
	('TOMOGRAFIA', 'TAC DE ABDOMEN SIMPLE', 2600.00),
	('TOMOGRAFIA', 'TAC DE CADERA', 2840.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA CERVICAL', 2840.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA DORSAL', 2840.00),
	('TOMOGRAFIA', 'TAC DE COLUMNA LUMBAR', 2840.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CON VENTANA OSEA', 2780.00),
	('TOMOGRAFIA', 'TAC DE CRANEO CONTRASTADA', 2730.00),
	('TOMOGRAFIA', 'TAC DE CRANEO SIMPLE', 2600.00),
	('TOMOGRAFIA', 'TAC DE CUELLO CON CONTRASTE', 3000.00),
	('TOMOGRAFIA', 'TAC DE CUELLO SIMPLE', 2710.00),
	('TOMOGRAFIA', 'TAC DE FEMUR', 2780.00),
	('TOMOGRAFIA', 'TAC DE HOMBROS', 2770.00),
	('TOMOGRAFIA', 'TAC DE MACIZO FACIAL', 2940.00),
	('TOMOGRAFIA', 'TAC DE MASTOIDES', 2360.00),
	('TOMOGRAFIA', 'TAC DE MIEMBROS PELVICOS', 2940.00),
	('TOMOGRAFIA', 'TAC DE OIDO', 2940.00),
	('TOMOGRAFIA', 'TAC DE ORBITA', 2940.00),
	('TOMOGRAFIA', 'TAC DE PELVIS', 2990.00),
	('TOMOGRAFIA', 'TAC DE PELVIS CONTRASTADA', 3050.00),
	('TOMOGRAFIA', 'TAC DE RODILLAS', 2990.00),
	('TOMOGRAFIA', 'TAC DE SENOS PARANASALES', 2990.00),
	('TOMOGRAFIA', 'TAC DE SILLA TURCA', 2990.00),
	('TOMOGRAFIA', 'TAC DE TORAX CONTRASTADA', 3680.00),
	('TOMOGRAFIA', 'TAC DE TORAX SIMPLE', 2990.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL CONTRASTADA', 4960.00),
	('TOMOGRAFIA', 'TAC TORACOABDOMINAL SIMPLE', 3890.00),
	('TOMOGRAFIA', 'TAC TRIDIMENSIONAL CUALQUIER REGION', 4460.00),
	('ULTRASONIDOS', 'U.S. ABDOMEN 2 REGIONES', 980.00),
	('ULTRASONIDOS', 'U.S. AORTA ABDOMINAL', 1730.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 2710.00),
	('ULTRASONIDOS', 'U.S. CAROTIDEO UNILAERAL CON DOPPLER COLOR', 1730.00),
	('ULTRASONIDOS', 'U.S. DE CUELLO', 980.00),
	('ULTRASONIDOS', 'U.S. DE TIROIDES', 980.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL BILATERAL', 3230.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL UNILATERAL', 2310.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 5880.00),
	('ULTRASONIDOS', 'U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 4410.00),
	('ULTRASONIDOS', 'U.S. DOPPLER DE PENE', 2840.00),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO', 1370.00),
	('ULTRASONIDOS', 'U.S. DOPPLER OBSTETRICO GEMELAR', 2600.00),
	('ULTRASONIDOS', 'U.S. DOPPLER RENAL', 2840.00),
	('ULTRASONIDOS', 'U.S. DOPPLER TESTICULAR', 1370.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO BILATERAL', 3230.00),
	('ULTRASONIDOS', 'U.S. DOPPLER VENOSO UNILATERAL', 2310.00),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR', 750.00),
	('ULTRASONIDOS', 'U.S. HEPATO VESICULAR CON PRUEBA DE BOYDEN', 980.00),
	('ULTRASONIDOS', 'U.S. INGUINAL', 750.00),
	('ULTRASONIDOS', 'U.S. INGUINO-ESCROTAL', 1500.00),
	('ULTRASONIDOS', 'U.S. MAMARIO', 750.00),
	('ULTRASONIDOS', 'U.S. MUSCULO ESQUELETICO', 980.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO', 750.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 3A DIMENSION', 1160.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO 5TA. DIMENSION CON CD Y FOTO', 1270.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 1420.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO ESTRUCTURAL', 1260.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO GEMELAR', 1500.00),
	('ULTRASONIDOS', 'U.S. OBSTETRICO PERFIL BIOFISICO', 1160.00),
	('ULTRASONIDOS', 'U.S. PELVICO / UTERO Y ANEXOS', 750.00),
	('ULTRASONIDOS', 'U.S. PROSTATICO', 750.00),
	('ULTRASONIDOS', 'U.S. PROSTATICO ENDORECTAL', 980.00),
	('ULTRASONIDOS', 'U.S. RENAL', 750.00),
	('ULTRASONIDOS', 'U.S. SEGUIMIENTO FOLICULAR', 2080.00),
	('ULTRASONIDOS', 'U.S. SONOHISTERO', 2140.00),
	('ULTRASONIDOS', 'U.S. TEJIDOS BLANDOS', 980.00),
	('ULTRASONIDOS', 'U.S. TESTICULAR', 750.00),
	('ULTRASONIDOS', 'U.S. TRANSFONTANELAR', 980.00),
	('ULTRASONIDOS', 'U.S. TRANSVAGINAL/ENDOVAGINAL', 980.00),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION ESTUDIO CONTRASTADO', 740.00),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION PLACA RX', 420.00),
	('URGENCIAS Y OTROS', 'URGENCIA INTERPRETACION TOMOGRAFIA', 1000.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO ESTUDIO CONTRASTADO', 630.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO RADIOLOGO RX', 530.00),
	('URGENCIAS Y OTROS', 'URGENCIA TECNICO TOMOGRAFIA', 790.00),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO CONVENCIONAL', 740.00),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO DOPPLER', 1260.00),
	('URGENCIAS Y OTROS', 'URGENCIA ULTRASONIDO ENDOCAVITARIO', 950.00);

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
select 'Estudio', t.clave, t.descripcion_catalogo, 'Medisim', t.precio, now()
from tmp_lista_imagen_claves t
where t.clave is not null
	and not exists (
		select 1
		from public.precios_estudios pe
		where upper(btrim(pe.cliente)) = upper('Medisim')
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
		raise notice 'ATENCION: % estudios de Medisim no quedaron en el catálogo', v_sin_clave;
	end if;
end
$$;

drop table tmp_lista_imagen_claves;
drop table tmp_lista_imagen_cat;
drop table tmp_lista_imagen;

NOTIFY pgrst, 'reload schema';
