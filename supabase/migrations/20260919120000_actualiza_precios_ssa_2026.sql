-- Precios de SSA actualizados a su lista 2026-2027.
--
-- La hoja trae el precio vigente y el nuevo, que es ese más 8%; se siembra el
-- nuevo. La lista repite cada estudio dos veces con el mismo importe, así que
-- aquí va una sola vez: 245 estudios, los 242 que ya tenía el convenio más
-- AUDIOMETRIA TONAL PAQUETE, COLUMNA DORSOLUMBAR (2 POSICIONES) y PLACA EXTRA,
-- que antes no estaban en su tarifario.
--
-- Cuatro descripciones van con la ortografía del catálogo y no con la de la
-- hoja -"HISTEROSALPINGOGRAFIA", "4 POSICIO", "30°,60° Y 90°", "UNILAERAL"-:
-- si no, no cruzarían con ningún estudio y se quedarían con el precio viejo.
--
-- La clave con la que se cobra es la que el estudio ya tiene en el catálogo de
-- imagen. No se da de alta ningún estudio; si alguno no cruza se avisa al
-- final, porque inventarle una clave dejaría un renglón que nadie encuentra al
-- cobrar.

create temporary table tmp_precios_ssa (
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_precios_ssa (descripcion, precio)
values
	('ARTERIOGRAFIA FEMORAL BILATERAL', 5886.00),
	('ARTERIOGRAFIA FEMORAL UNILATERAL', 4179.60),
	('COLANGIOGRAFIA POR SONDA EN T', 1371.60),
	('COLON POR ENEMA DOBLE CONTRASTE', 1890.00),
	('COLON POR ENEMA POR COLOSTOMIA', 2203.20),
	('FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 1371.60),
	('FLEBOGRAFIA BILATERAL', 2030.40),
	('FLEBOGRAFIA UNILATERAL', 1404.00),
	('HISTEROSALPINGOSGRAFIA', 1771.20),
	('SERIE ESOFAGO GASTRODUODENAL', 1566.00),
	('SERIE GASTRODUODENAL BEBES MENORES 1', 1177.20),
	('SIALOGRAFIA BILATERAL', 2354.40),
	('SIALOGRAFIA UNILATERAL', 1771.20),
	('TRANSITO INTESTINAL', 2030.40),
	('URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 1630.80),
	('UROGRAFIA EXCRETORA', 1825.20),
	('UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 2160.00),
	('SERIE GASTRODUODENAL/CONTRASTE HIDROSOLUBLE', 2257.20),
	('ELECTROCARDIOGRAMA', 777.60),
	('DENSITOMETRIA DE COLUMNA Y CADERA', 896.40),
	('MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 777.60),
	('BIOPSIA MAMA AGUJA TRU CUT con estudio histo', 5864.40),
	('BIOPSIA POR TAC', 7117.20),
	('ELECTROENCEFALOGRAMA', 3391.20),
	('ECOCARDIOGRAMA', 2548.80),
	('HOLTER CARDIOLOGO', 2138.40),
	('PRUEBAS DE ESFUERZO', 3682.80),
	('AGUDEZA VISUAL', 118.80),
	('EXAMEN CLINICO MEDICO', 540.00),
	('AUDIOMETRIA TONAL PAQUETE', 615.60),
	('DENSITOMETRIA COMPLETA', 1609.20),
	('MAPA', 2138.40),
	('ELECTROENCEFALOGRAMA CON MAPEO', 3888.00),
	('ABDOMEN 1 PLACA', 421.20),
	('ABDOMEN 2 PLACAS', 637.20),
	('AMBAS MANOS AP, LATERAL Y OBLICUAS', 918.00),
	('AMBAS MANOS DORSOPALMAR', 637.20),
	('AMBAS MANOS DORSOPALMAR Y OBLICUAS', 788.40),
	('AMBOS CODOS A.P. Y LAT.', 788.40),
	('AMBOS PIES 1 POSICION', 637.20),
	('AMBOS PIES 2 POSICIONES', 788.40),
	('ANTEBRAZO A.P. Y LAT.', 583.20),
	('ANTEBRAZO AP', 421.20),
	('ARTICULACION TEMPOROMANDIBULAR', 637.20),
	('ARTICULACION TEMPOROMANDIBULAR 4 POSICIONES', 788.40),
	('BRAZO A.P. Y LAT.', 637.20),
	('BRAZO AP', 421.20),
	('CODO A.P. Y LAT.', 637.20),
	('CODOS AP', 637.20),
	('COLUMNA 1 POSICION', 421.20),
	('COLUMNA CERVICAL (2 POSICIONES)', 637.20),
	('COLUMNA CERVICAL( 4 POSICIONES)', 907.20),
	('COLUMNA DORSAL (2 POSICIONES)', 637.20),
	('COLUMNA DORSAL (4 POSICIONES)', 907.20),
	('COLUMNA DORSOLUMBAR (2 POSICIONES)', 788.40),
	('COLUMNA DORSOLUMBAR ( 4 POSICIONES)', 907.20),
	('COLUMNA LUMBAR (2 POSICIONES)', 637.20),
	('COLUMNA LUMBAR (4 POSICIONES)', 907.20),
	('COLUMNA LUMBOSACRA (2 POSICIONES)', 637.20),
	('COLUMNA LUMBOSACRA (4 POSICIONES)', 907.20),
	('COLUMNA SACROCOXIGEA (2 POSICIONES)', 637.20),
	('COLUMNA VERTEBRAL TOTAL AP', 1015.20),
	('COLUMNA VERTEBRAL TOTAL AP Y LATERAL', 1630.80),
	('COXIS AP Y LATERAL', 637.20),
	('CRANEO 1 POSICION', 421.20),
	('CRANEO AP Y LATERAL', 637.20),
	('CRANEO AP, LAT Y TOWNE', 788.40),
	('CUELLO A.P.', 421.20),
	('ESCANOMETRIA', 1015.20),
	('FEMUR 1 PLACA', 421.20),
	('FEMUR 2 PLACAS', 637.20),
	('HOMBRO AP', 421.20),
	('HOMBRO AP Y LATERAL', 637.20),
	('HOMBROS AP', 637.20),
	('HOMBROS AP Y LATERAL', 907.20),
	('HUESOS PROPIOS DE LA NARIZ AP', 421.20),
	('LATERAL DE RINOFARINGE ( NASOFARINGE)', 421.20),
	('MANO DORSOPALMAR', 421.20),
	('MANO DORSOPALMAR Y OBLICUA', 637.20),
	('MANO DORSOPALMAR AP, LATERAL Y OBLICUA', 788.40),
	('MASTOIDES BILATERAL', 788.40),
	('MASTOIDES UNILATERAL', 421.20),
	('MUÑECA AP', 421.20),
	('MUÑECA AP Y LATERAL', 637.20),
	('MUÑECAS AP', 637.20),
	('MUÑECAS AP Y LATERAL', 788.40),
	('PELVICEFALOMETRIA 2 PLACAS', 788.40),
	('PELVIS 1 PLACA', 421.20),
	('PELVIS 2 PLACAS', 637.20),
	('PERFILOGRAMA', 421.20),
	('PIE 1 POSICION', 421.20),
	('PIE 2 POSICIONES', 637.20),
	('PIE AP, LAT Y OBLICUA', 788.40),
	('PIERNA AP', 421.20),
	('PIERNA AP Y LATERAL', 637.20),
	('PIERNAS AP', 637.20),
	('PIERNAS AP Y LATERAL', 788.40),
	('PLACA CUALQUIER REGION', 421.20),
	('PLACA EXTRA', 421.20),
	('RODILLA A.P', 421.20),
	('RODILLA AP Y LATERAL', 680.40),
	('RODILLAS AP', 637.20),
	('RODILLAS COMPARATIVAS AP Y LATERAL', 907.20),
	('ROTULAS AXIALES A 30, 60 Y 90 GRADOS (UN LADO)', 788.40),
	('SENOS PARANASALES 1 POSICION', 421.20),
	('SENOS PARANASALES 2 POSICIONES', 637.20),
	('SENOS PARANASALES 3 POSICIONES', 788.40),
	('SERIE CARDIACA', 1231.20),
	('SERIE OSEA METASTASICA', 2592.00),
	('SHULLER BILATERAL', 907.20),
	('SHULLER UNILATERAL', 637.20),
	('TOBILLO A.P.', 421.20),
	('TOBILLO AP Y LATERAL', 637.20),
	('TOBILLOS AP', 421.20),
	('TOBILLOS AP Y LATERAL', 788.40),
	('TORAX OSEO Y OBLICUA', 788.40),
	('TORAX (1 POSICION)', 421.20),
	('TORAX (2 POSICIONES)', 788.40),
	('WATERS Y LATERAL DE CRANEO', 788.40),
	('RM CRANEO SIMPLE', 4222.80),
	('RM CRANEO CONTRASTADA', 5108.40),
	('RM CUELLO SIMPLE', 3520.80),
	('RM CUELLO CONTRASTADA', 5108.40),
	('RM HOMBRO SIMPLE', 3909.60),
	('RM CODO SIMPLE', 3909.60),
	('RM MUÑECA - MANO SIMPLE', 3909.60),
	('RM RODILLA - PIERNA SIMPLE', 3909.60),
	('RM TOBILLO - PIE SIMPLE', 3909.60),
	('RM ABDOMEN SIMPLE', 4125.60),
	('RM ABDOMEN CONTRASTADA', 5292.00),
	('RM PELVIS SIMPLE', 4125.60),
	('RM PELVIS CONTRASTADA', 5292.00),
	('ANGIO-RESONANCIA CONTRASTADA DE CUALQUIER REGION', 6361.20),
	('COLANGIO-RESONANCIA', 6361.20),
	('RM COLUMNA CERVICAL SIMPLE', 3056.40),
	('RM COLUMNA DORSAL SIMPLE', 3056.40),
	('RM COLUMNA LUMBAR SIMPLE', 3056.40),
	('RM COLUMNA CERVICAL CONTRASTADA', 4579.20),
	('RM COLUMNA DORSAL CONTRASTADA', 4579.20),
	('RM COLUMNA LUMBAR CONTRASTADA', 4579.20),
	('RM RODILLA - PIERNA CONTRASTADA', 5292.00),
	('RM MUSCULO ESQUELETICO 1 REGION SIMPLE', 4104.00),
	('RM TORAX SIMPLE', 4125.60),
	('RM OIDO SIMPLE', 3520.80),
	('RM HIPOFISIS (CONTRASTADA)', 5108.40),
	('RM PANORAMICA SIMPLE (CON 5 NIVELES)', 3682.80),
	('RM DE CORAZON SIMPLE', 9806.40),
	('RM DE CORAZON CONTRASTADA', 12063.60),
	('RM HOMBRO CONTRASTADO', 5292.00),
	('RM PROSTATA SIMPLE', 4222.80),
	('RM PROSTATA CONTRASTADA', 5108.40),
	('RM MAMARIO SIMPLE', 4125.60),
	('RM MAMARIO CONTRASTADO', 5292.00),
	('RM ARTICULACION MANDIBULAR', 3909.60),
	('RM NARIZ / SENOS PARANASALES', 4222.80),
	('RM FEMUR - MUSLO SIMPLE', 3909.60),
	('ANGIOTOMOGRAFIA UNA REGION', 6793.20),
	('TAC ABDOMINOPELVICO SIMPLE', 2160.00),
	('TAC ABDOMINOPELVICA CONTRASTADA', 2494.80),
	('TAC DE ABDOMEN SIMPLE', 2160.00),
	('TAC DE ABDOMEN CONTRASTADA', 2494.80),
	('TAC DE CADERA', 2160.00),
	('TAC DE COLUMNA CERVICAL', 2160.00),
	('TAC DE COLUMNA DORSAL', 2160.00),
	('TAC DE COLUMNA LUMBAR', 2160.00),
	('TAC DE CRANEO CON VENTANA OSEA', 2322.00),
	('TAC DE CRANEO SIMPLE', 2041.20),
	('TAC DE CRANEO CONTRASTADA', 2440.80),
	('TAC DE CUELLO SIMPLE', 2160.00),
	('TAC DE CUELLO CON CONTRASTE', 2278.80),
	('TAC DE FEMUR', 2160.00),
	('TAC DE HOMBROS', 2278.80),
	('TAC DE MACIZO FACIAL', 2278.80),
	('TAC DE MIEMBROS PELVICOS', 2278.80),
	('TAC DE OIDO', 2278.80),
	('TAC DE ORBITA', 2278.80),
	('TAC DE PELVIS', 2160.00),
	('TAC DE RODILLAS', 2278.80),
	('TAC DE SENOS PARANASALES', 2322.00),
	('TAC DE SILLA TURCA', 2322.00),
	('TAC DE TORAX SIMPLE', 2278.80),
	('TAC DE TORAX CONTRASTADA', 2440.80),
	('TAC TORACOABDOMINAL SIMPLE', 3790.80),
	('TAC TORACOABDOMINAL CONTRASTADA', 4104.00),
	('TAC TRIDIMENSIONAL CUALQUIER REGION', 4158.00),
	('TAC DE PELVIS CONTRASTADA', 2559.60),
	('TAC DE CADERA CONTRASTADA', 2084.40),
	('TAC DE COLUMNA CERVICAL CONTRASTADA', 2440.80),
	('TAC DE COLUMNA DORSAL CONTRASTADA', 2440.80),
	('TAC DE COLUMNA LUMBAR CONTRASTADA', 2084.40),
	('TAC DE OIDO CONTRASTADA', 2084.40),
	('UROTOMOGRAFIA SIMPLE', 2559.60),
	('UROTOMOGRAFIA CONTRASTADA', 2916.00),
	('TAC ABDOMINO-PELVICO DOBLE CONTRASTE', 3272.40),
	('TAC DE MASTOIDES', 1965.60),
	('TAC ABDOMINOPELVICA CON VALSALVA', 4158.00),
	('U.S. ABDOMEN 2 REGIONES', 896.40),
	('U.S. AORTA ABDOMINAL', 1436.40),
	('U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 3153.60),
	('U.S. CAROTIDEO UNILATERAL CON DOPPLER COLOR', 1965.60),
	('U.S. DE CUELLO', 896.40),
	('U.S. DOPPLER RENAL', 2948.40),
	('U.S. HEPATO VESICULAR', 702.00),
	('U.S. HEPATO VESICULAR CON PRUEBA DE BOYDEN', 896.40),
	('U.S. MAMARIO', 702.00),
	('U.S. MUSCULO ESQUELETICO', 896.40),
	('U.S. OBSTETRICO', 702.00),
	('U.S. OBSTETRICO 3A DIMENSION', 1177.20),
	('U.S. OBSTETRICO 5TA. DIMENSION CON CD Y FOTO', 1285.20),
	('U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 1609.20),
	('U.S. TRANSVAGINAL/ENDOVAGINAL', 896.40),
	('U.S. RENAL', 702.00),
	('U.S. SEGUIMIENTO FOLICULAR', 1825.20),
	('U.S. SONOHISTERO', 1760.40),
	('U.S. TEJIDOS BLANDOS', 896.40),
	('U.S. TESTICULAR', 702.00),
	('U.S. TRANSFONTANELAR', 896.40),
	('U.S. OBSTETRICO GEMELAR', 1306.80),
	('U.S. INGUINO-ESCROTAL', 896.40),
	('U.S. DOPPLER ARTERIAL UNILATERAL', 2559.60),
	('U.S. DOPPLER VENOSO UNILATERAL', 2559.60),
	('U.S. DOPPLER ARTERIAL BILATERAL', 3628.80),
	('U.S. DOPPLER VENOSO BILATERAL', 3315.60),
	('U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 4039.20),
	('U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 6123.60),
	('U.S. DOPPLER DE PENE', 2970.00),
	('U.S. DOPPLER OBSTETRICO GEMELAR', 2797.20),
	('U.S. OBSTETRICO ESTRUCTURAL', 1371.60),
	('U.S. INGUINAL', 896.40),
	('U.S. DOPPLER OBSTETRICO', 1544.40),
	('U.S. PELVICO / UTERO Y ANEXOS', 702.00),
	('U.S. OBSTETRICO PERFIL BIOFISICO', 1242.00),
	('U.S. PROSTATICO', 702.00),
	('U.S. PROSTATICO ENDORECTAL', 896.40),
	('U.S. DOPPLER TESTICULAR', 1544.40),
	('U.S. DE TIROIDES', 896.40),
	('URGENCIA TECNICO RADIOLOGO RX', 594.00),
	('URGENCIA TECNICO TOMOGRAFIA', 896.40),
	('URGENCIA TECNICO ESTUDIO CONTRASTADO', 594.00),
	('URGENCIA ULTRASONIDO CONVENCIONAL', 831.60),
	('URGENCIA ULTRASONIDO DOPPLER', 1306.80),
	('URGENCIA ULTRASONIDO ENDOCAVITARIO', 831.60),
	('URGENCIA INTERPRETACION PLACA RX', 421.20),
	('URGENCIA INTERPRETACION ESTUDIO CONTRASTADO', 712.80),
	('URGENCIA INTERPRETACION TOMOGRAFIA', 1134.00);

-- Las descripciones se comparan sin acentos, sin signos de puntuación, sin
-- espacios de sobra y en mayúsculas: la hoja y el catálogo no siempre escriben
-- igual los puntos o las diagonales.
create or replace function pg_temp.llave_ssa(p_texto text)
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

-- Se descartan los estudios de veterinaria: hay nombres parecidos y el precio
-- de la mascota no es el de la persona.
create temporary table tmp_precios_ssa_claves as
select
	t.descripcion,
	t.precio,
	(
		select e.clave
		from public.estudios_imagen_catalogo e
		where e.modalidad <> 'veterinaria'
			and pg_temp.llave_ssa(e.descripcion) = pg_temp.llave_ssa(t.descripcion)
		order by e.clave
		limit 1
	) as clave
from tmp_precios_ssa t;

-- Se borra lo que hubiera de esas claves para SSA y se vuelve a insertar: así
-- la migración es re-ejecutable, sustituye el precio viejo y de paso limpia los
-- renglones repetidos -la tabla no tiene índice único sobre (clave, cliente),
-- así que insertar sin borrar dejaría duplicados y se aplicaría el primero que
-- devolviera la consulta-.
delete from public.precios_estudios pe
using tmp_precios_ssa_claves t
where pe.cliente = 'SSA'
	and t.clave is not null
	and (
		pe.clave = t.clave
		or pg_temp.llave_ssa(pe.descripcion) = pg_temp.llave_ssa(t.descripcion)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select 'Estudio', t.clave, t.descripcion, 'SSA', t.precio, now()
from tmp_precios_ssa_claves t
where t.clave is not null;

do $$
declare
	v_fila record;
	v_fijados integer;
	v_faltantes integer := 0;
begin
	select count(*) into v_fijados from tmp_precios_ssa_claves where clave is not null;
	raise notice 'Precios de SSA actualizados: % de %', v_fijados, (
		select count(*) from tmp_precios_ssa
	);

	for v_fila in
		select descripcion from tmp_precios_ssa_claves where clave is null order by descripcion
	loop
		v_faltantes := v_faltantes + 1;
		raise notice 'ATENCION: "%" no esta en el catalogo; su precio no se actualizo', v_fila.descripcion;
	end loop;

	-- Un estudio que SSA tenía en su tarifario y que la lista nueva ya no trae
	-- se queda con el precio viejo: se avisa para que no pase inadvertido.
	for v_fila in
		select pe.descripcion
		from public.precios_estudios pe
		where pe.cliente = 'SSA'
			and not exists (
				select 1 from tmp_precios_ssa_claves t
				where t.clave = pe.clave
			)
		order by pe.descripcion
	loop
		raise notice 'ATENCION: "%" no viene en la lista nueva; conserva su precio anterior', v_fila.descripcion;
	end loop;

	if v_faltantes = 0 then
		raise notice 'Todos los estudios de la lista cruzaron con su estudio del catalogo.';
	end if;
end
$$;

drop table tmp_precios_ssa_claves;
drop table tmp_precios_ssa;

NOTIFY pgrst, 'reload schema';
