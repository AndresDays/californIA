-- Precios pactados con CENTRO MEDICO ANAMAYA, de su lista nueva 2026-2027.
--
-- La lista viene con el precio de venta al público y la comisión del 20% que
-- se queda Anamaya; lo que CDC le factura es el neto -precio de venta menos la
-- comisión-, y ese es el que se siembra aquí. Sin tarifario propio, la captura
-- le ofrecía el catálogo completo al precio por defecto.
--
-- Igual que la siembra de veterinaria: la clave con la que se cobra es la que
-- el estudio ya tiene en el catálogo de imagen. No se da de alta ningún
-- estudio; si alguno de la lista no cruza se avisa al final, porque inventarle
-- una clave dejaría un renglón que nadie encuentra al cobrar.
--
-- Seis descripciones van con la ortografía del catálogo y no con la de la
-- lista -"UNILAERAL", "4 POSICIO", "HISTEROSALPINGOGRAFIA"-: si no, no
-- cruzarían con ningún estudio.
--
-- El nombre del cliente va exactamente como está dado de alta: la búsqueda del
-- tarifario compara la columna sin comodines.

create temporary table tmp_precios_anamaya (
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_precios_anamaya (descripcion, precio)
values
	('RM CRANEO SIMPLE', 3976.00),
	('RM CRANEO CONTRASTADA', 5832.00),
	('RM CUELLO SIMPLE', 3976.00),
	('RM CUELLO CONTRASTADA', 5832.00),
	('RM HOMBRO SIMPLE', 4408.00),
	('RM CODO SIMPLE', 4392.00),
	('RM MUÑECA - MANO SIMPLE', 4408.00),
	('RM RODILLA - PIERNA SIMPLE', 4408.00),
	('RM TOBILLO - PIE SIMPLE', 4408.00),
	('RM ABDOMEN SIMPLE', 4624.00),
	('RM ABDOMEN CONTRASTADA', 5832.00),
	('RM PELVIS SIMPLE', 4576.00),
	('RM PELVIS CONTRASTADA', 5832.00),
	('ANGIO-RESONANCIA CONTRASTADA DE CUALQUIER REGION', 6736.00),
	('COLANGIO-RESONANCIA', 6736.00),
	('RM COLUMNA CERVICAL SIMPLE', 3456.00),
	('RM COLUMNA DORSAL SIMPLE', 3456.00),
	('RM COLUMNA LUMBAR SIMPLE', 3456.00),
	('RM COLUMNA CERVICAL CONTRASTADA', 5056.00),
	('RM COLUMNA DORSAL CONTRASTADA', 5056.00),
	('RM COLUMNA LUMBAR CONTRASTADA', 5056.00),
	('RM RODILLA - PIERNA CONTRASTADA', 5832.00),
	('RM MUSCULO ESQUELETICO 2 REGIONES SIMPLE', 8296.00),
	('RM MUSCULO ESQUELETICO 3 REGIONES SIMPLE', 10976.00),
	('RM MUSCULO ESQUELETICO 1 REGION SIMPLE', 4408.00),
	('ANGIO-RESONANCIA SIMPLE DE CUALQUIER REGION', 6736.00),
	('RM COLUMNA 2 REGIONES', 5960.00),
	('RM COLUMNA 2 REGIONES CONTRASTADA', 8032.00),
	('RM COLUMNA 3 REGIONES', 9112.00),
	('RM COLUMNA 3 REGIONES CONTRASTADA', 12400.00),
	('RM TORAX SIMPLE', 4576.00),
	('RM OIDO SIMPLE', 3976.00),
	('RM HIPOFISIS (CONTRASTADA)', 5832.00),
	('RM PANORAMICA SIMPLE (CON 5 NIVELES)', 4016.00),
	('RM DE CORAZON SIMPLE', 10368.00),
	('RM DE CORAZON CONTRASTADA', 12960.00),
	('RM HOMBRO CONTRASTADO', 5832.00),
	('RM PROSTATA SIMPLE', 3976.00),
	('RM PROSTATA CONTRASTADA', 5832.00),
	('RM MAMARIO SIMPLE', 4624.00),
	('RM MAMARIO CONTRASTADO', 5832.00),
	('RM ARTICULACION MANDIBULAR', 4408.00),
	('RM NARIZ / SENOS PARANASALES', 3976.00),
	('RM NARIZ / SENOS PARANASALES CONTRASTADA', 5832.00),
	('RM FEMUR - MUSLO SIMPLE', 4408.00),
	('RM MUÑECA - MANO CONTRASTADA', 5832.00),
	('ANGIOTOMOGRAFIA UNA REGION', 6952.00),
	('TAC ABDOMINOPELVICO SIMPLE', 3608.00),
	('TAC ABDOMINOPELVICA CONTRASTADA', 3960.00),
	('TAC DE ABDOMEN SIMPLE', 3360.00),
	('TAC DE ABDOMEN CONTRASTADA', 3760.00),
	('TAC DE CADERA', 3080.00),
	('TAC DE COLUMNA CERVICAL', 3344.00),
	('TAC DE COLUMNA DORSAL', 3344.00),
	('TAC DE COLUMNA LUMBAR', 3344.00),
	('TAC DE CRANEO CON VENTANA OSEA', 2904.00),
	('TAC DE CRANEO SIMPLE', 2596.00),
	('TAC DE CRANEO CONTRASTADA', 3120.00),
	('TAC DE CUELLO SIMPLE', 2992.00),
	('TAC DE CUELLO CON CONTRASTE', 3256.00),
	('TAC DE FEMUR', 3256.00),
	('TAC DE HOMBROS', 3256.00),
	('TAC DE MACIZO FACIAL', 3256.00),
	('TAC DE MIEMBROS PELVICOS', 3256.00),
	('TAC DE OIDO', 3256.00),
	('TAC DE ORBITA', 3256.00),
	('TAC DE PELVIS', 3080.00),
	('TAC DE RODILLAS', 3432.00),
	('TAC DE SENOS PARANASALES', 3432.00),
	('TAC DE SILLA TURCA', 3608.00),
	('TAC DE TORAX SIMPLE', 3608.00),
	('TAC DE TORAX CONTRASTADA', 3960.00),
	('TAC TORACOABDOMINAL SIMPLE', 4576.00),
	('TAC TORACOABDOMINAL CONTRASTADA', 5016.00),
	('TAC TRIDIMENSIONAL CUALQUIER REGION', 3880.00),
	('TAC DE PELVIS CONTRASTADA', 3760.00),
	('TAC DE CADERA CONTRASTADA', 3760.00),
	('TAC DE COLUMNA CERVICAL CONTRASTADA', 3760.00),
	('TAC DE COLUMNA DORSAL CONTRASTADA', 3760.00),
	('TAC DE COLUMNA LUMBAR CONTRASTADA', 3760.00),
	('TAC DE FEMUR CONTRASTADA', 3760.00),
	('TAC DE HOMBROS CONTRASTADA', 3760.00),
	('TAC DE MACIZO FACIAL CONTRASTADA', 3760.00),
	('TAC DE MIEMBROS PELVICOS CONTRASTADA', 3760.00),
	('TAC DE OIDO CONTRASTADA', 3760.00),
	('TAC DE ORBITA CONTRASTADA', 3760.00),
	('TAC DE RODILLAS CONTRASTADA', 3760.00),
	('TAC DE SENOS PARANASALES CONTRASTADA', 3760.00),
	('UROTOMOGRAFIA SIMPLE', 2840.00),
	('UROTOMOGRAFIA CONTRASTADA', 3480.00),
	('TAC ABDOMINO-PELVICO DOBLE CONTRASTE', 3704.00),
	('TAC DE MASTOIDES', 2048.00),
	('TAC ABDOMINOPELVICA CON VALSALVA', 3704.00),
	('TAC TRIFASICA', 3480.00),
	('U.S. ABDOMEN 2 REGIONES', 1000.00),
	('U.S. AORTA ABDOMINAL', 1808.00),
	('U.S. CAROTIDEO BILATERAL CON DOPPLER COLOR', 2760.00),
	('U.S. CAROTIDEO UNILATERAL CON DOPPLER COLOR', 1424.00),
	('U.S. DE CUELLO', 1000.00),
	('U.S. DE PENE', 1000.00),
	('U.S. DOPPLER RENAL', 2944.00),
	('U.S. HEPATO VESICULAR', 832.00),
	('U.S. HEPATO VESICULAR CON PRUEBA DE BOYDEN', 1000.00),
	('U.S. MAMARIO', 832.00),
	('U.S. MUSCULO ESQUELETICO', 1000.00),
	('U.S. OBSTETRICO', 832.00),
	('U.S. OBSTETRICO 3A DIMENSION', 1192.00),
	('U.S. OBSTETRICO 5TA. DIMENSION CON CD Y FOTO', 1312.00),
	('U.S. OBSTETRICO ENDOVAGINAL CON DOPPLER COLOR', 1192.00),
	('U.S. TRANSVAGINAL/ENDOVAGINAL', 1000.00),
	('U.S. RENAL', 832.00),
	('U.S. SEGUIMIENTO FOLICULAR', 2376.00),
	('U.S. SONOHISTERO', 2328.00),
	('U.S. TEJIDOS BLANDOS', 1000.00),
	('U.S. TESTICULAR', 832.00),
	('U.S. TRANSFONTANELAR', 1000.00),
	('U.S OBSTETRICO GEMELAR', 1512.00),
	('U.S. INGUINO-ESCROTAL', 1576.00),
	('U.S. DOPPLER ARTERIAL UNILATERAL', 2280.00),
	('U.S. DOPPLER VENOSO UNILATERAL', 2280.00),
	('U.S. DOPPLER ARTERIAL BILATERAL', 3328.00),
	('U.S. DOPPLER VENOSO BILATERAL', 3328.00),
	('U.S. DOPPLER ARTERIAL Y VENOSO UNILATERAL', 4144.00),
	('U.S. DOPPLER ARTERIAL Y VENOSO BILATERAL', 6048.00),
	('U.S. DOPPLER DE PENE', 2944.00),
	('U.S. DOPPLER OBSTETRICO GEMELAR', 2944.00),
	('U.S. OBSTETRICO ESTRUCTURAL', 1192.00),
	('U.S. INGUINAL', 832.00),
	('U.S. DOPPLER OBSTETRICO', 1192.00),
	('U.S. PELVICO / UTERO Y ANEXOS', 832.00),
	('U.S. OBSTETRICO PERFIL BIOFISICO', 1192.00),
	('U.S. PROSTATICO', 832.00),
	('U.S. PROSTATICO ENDORECTAL', 1000.00),
	('U.S. DOPPLER TESTICULAR', 1192.00),
	('U.S. DOPPLER TRANSVAGINAL / ENDOVAGINAL', 1192.00),
	('U.S. DOPPLER HEPATICO CON ELASTOGRAFIA', 1600.00),
	('U.S. DOPPLER TEJIDOS BLANDOS', 1192.00),
	('U.S. DOPPLER MAMARIO', 1192.00),
	('U.S. DOPPLER HEPATO VESICULAR', 2944.00),
	('U.S. DOPPLER TIROIDEO', 1192.00),
	('U.S. DE TIROIDES', 1000.00),
	('ABDOMEN 1 PLACA', 528.00),
	('ABDOMEN 2 PLACAS', 848.00),
	('AMBAS MANOS AP, LATERAL Y OBLICUAS', 1192.00),
	('AMBAS MANOS DORSOPALMAR', 848.00),
	('AMBAS MANOS DORSOPALMAR Y OBLICUAS', 944.00),
	('AMBOS CODOS A.P. Y LAT.', 944.00),
	('AMBOS PIES 1 POSICION', 848.00),
	('AMBOS PIES 2 POSICIONES', 944.00),
	('ANTEBRAZO A.P. Y LAT.', 848.00),
	('ANTEBRAZO AP', 528.00),
	('ARTICULACION TEMPOROMANDIBULAR', 528.00),
	('ARTICULACION TEMPOROMANDIBULAR 4 POSICIONES', 1192.00),
	('BRAZO A.P. Y LAT.', 848.00),
	('BRAZO AP', 528.00),
	('CODO A.P.', 304.00),
	('CODO A.P. Y LAT.', 848.00),
	('CODOS AP', 560.00),
	('COLUMNA 1 POSICION', 528.00),
	('COLUMNA CERVICAL (2 POSICIONES)', 848.00),
	('COLUMNA CERVICAL( 4 POSICIONES)', 1192.00),
	('COLUMNA DORSAL (2 POSICIONES)', 848.00),
	('COLUMNA DORSAL (4 POSICIONES)', 1192.00),
	('COLUMNA DORSOLUMBAR ( 4 POSICIONES)', 1192.00),
	('COLUMNA LUMBAR (2 POSICIONES)', 848.00),
	('COLUMNA LUMBAR (4 POSICIONES)', 1192.00),
	('COLUMNA LUMBOSACRA (2 POSICIONES)', 848.00),
	('COLUMNA LUMBOSACRA (4 POSICIONES)', 1192.00),
	('COLUMNA SACROCOXIGEA (2 POSICIONES)', 848.00),
	('COLUMNA VERTEBRAL TOTAL AP', 1192.00),
	('COLUMNA VERTEBRAL TOTAL AP Y LATERAL', 1992.00),
	('COXIS AP Y LATERAL', 848.00),
	('CRANEO 1 POSICION', 528.00),
	('CRANEO AP Y LATERAL', 848.00),
	('CRANEO AP, LAT Y TOWNE', 944.00),
	('CUELLO A.P', 528.00),
	('ESCANOMETRIA', 1192.00),
	('FEMUR 1 PLACA', 528.00),
	('FEMUR 2 PLACAS', 848.00),
	('HOMBRO AP', 528.00),
	('HOMBRO AP Y LATERAL', 848.00),
	('HOMBROS AP', 848.00),
	('HOMBROS AP Y LATERAL', 1192.00),
	('HUESOS PROPIOS DE LA NARIZ AP', 528.00),
	('LATERAL DE RINOFARINGE ( NASOFARINGE)', 528.00),
	('MANO DORSOPALMAR', 528.00),
	('MANO DORSOPALMAR Y OBLICUA', 848.00),
	('MANO DORSOPALMAR AP, LATERAL Y OBLICUA', 944.00),
	('MASTOIDES BILATERAL', 944.00),
	('MASTOIDES UNILATERAL', 528.00),
	('MUÑECA AP', 528.00),
	('MUÑECA AP Y LATERAL', 848.00),
	('MUÑECAS AP', 848.00),
	('MUÑECAS AP Y LATERAL', 1192.00),
	('PELVICEFALOMETRIA 2 PLACAS', 848.00),
	('PELVIS 1 PLACA', 528.00),
	('PELVIS 2 PLACAS', 848.00),
	('PERFILOGRAMA', 528.00),
	('PIE 1 POSICION', 528.00),
	('PIE 2 POSICIONES', 848.00),
	('PIE AP, LAT Y OBLICUA', 944.00),
	('PIERNA AP', 528.00),
	('PIERNA AP Y LATERAL', 848.00),
	('PIERNAS AP', 848.00),
	('PIERNAS AP Y LATERAL', 944.00),
	('PLACA CUALQUIER REGION', 304.00),
	('RODILLA A.P', 528.00),
	('RODILLA AP Y LATERAL', 848.00),
	('RODILLAS AP', 848.00),
	('RODILLAS COMPARATIVAS AP Y LATERAL', 944.00),
	('ROTULAS AXIALES A 30, 60 Y 90 GRADOS (UN LADO)', 848.00),
	('SENOS PARANASALES 1 POSICION', 528.00),
	('SENOS PARANASALES 2 POSICIONES', 848.00),
	('SENOS PARANASALES 3 POSICIONES', 944.00),
	('SERIE CARDIACA', 1880.00),
	('SERIE OSEA METASTASICA', 3040.00),
	('SHULLER BILATERAL', 848.00),
	('SHULLER UNILATERAL', 528.00),
	('TOBILLO A.P.', 528.00),
	('TOBILLO AP Y LATERAL', 848.00),
	('TOBILLOS AP', 528.00),
	('TOBILLOS AP Y LATERAL', 944.00),
	('TORAX OSEO Y OBLICUA', 848.00),
	('TORAX (1 POSICION)', 536.00),
	('TORAX (2 POSICIONES)', 848.00),
	('WATERS Y LATERAL DE CRANEO', 848.00),
	('AP LATERAL Y OBLICUA DE TOBILLO', 856.00),
	('ELECTROCARDIOGRAMA', 808.00),
	('DENSITOMETRIA DE COLUMNA Y CADERA', 992.00),
	('MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 928.00),
	('MAMOGRAFIA DIGITAL CON ULTRASONIDO', 1408.00),
	('BIOPSIA MAMA AGUJA TRU CUT con estudio histo', 5016.00),
	('BIOPSIA DE MAMA CON ESTUDIO PATOLOGICO', 3344.00),
	('BIOPSIA DE TIROIDES CON EST. PATOLOGICO', 3040.00),
	('ELECTROENCEFALOGRAMA', 2936.00),
	('ECOCARDIOGRAMA', 2848.00),
	('HOLTER CARDIOLOGO', 2416.00),
	('DENSITOMETRIA COMPLETA', 1512.00),
	('ELECTROENCEFALOGRAMA CON MAPEO', 3328.00),
	('ARTERIOGRAFIA FEMORAL BILATERAL', 7792.00),
	('ARTERIOGRAFIA FEMORAL UNILATERAL', 5224.00),
	('COLANGIOGRAFIA POR SONDA EN T', 1808.00),
	('COLON POR ENEMA DOBLE CONTRASTE', 2376.00),
	('COLON POR ENEMA POR COLOSTOMIA', 2568.00),
	('FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 2088.00),
	('FLEBOGRAFIA BILATERAL', 3232.00),
	('FLEBOGRAFIA UNILATERAL', 2760.00),
	('HISTEROSALPINGOSGRAFIA', 2232.00),
	('SERIE ESOFAGO GASTRODUODENAL', 2088.00),
	('SIALOGRAFIA BILATERAL', 3136.00),
	('SIALOGRAFIA UNILATERAL', 2184.00),
	('TRANSITO INTESTINAL', 2472.00),
	('URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 2280.00),
	('UROGRAFIA EXCRETORA', 2376.00),
	('UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 2568.00),
	('SERIE GASTRODUODENAL/CONTRASTE HIDROSOLUBLE', 2336.00);

-- Las descripciones se comparan sin acentos, sin signos de puntuación, sin
-- espacios de sobra y en mayúsculas: la lista y el catálogo escriben igual el
-- estudio pero no siempre los puntos -"CUELLO A.P." contra "CUELLO A.P"-.
create or replace function pg_temp.llave_anamaya(p_texto text)
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
create temporary table tmp_precios_anamaya_claves as
select
	t.descripcion,
	t.precio,
	(
		select e.clave
		from public.estudios_imagen_catalogo e
		where e.modalidad <> 'veterinaria'
			and pg_temp.llave_anamaya(e.descripcion) = pg_temp.llave_anamaya(t.descripcion)
		order by e.clave
		limit 1
	) as clave
from tmp_precios_anamaya t;

-- Se borra lo que hubiera de esas claves para el cliente y se vuelve a
-- insertar: así la migración es re-ejecutable, actualiza un importe viejo y de
-- paso limpia los renglones repetidos -la tabla no tiene índice único sobre
-- (clave, cliente), así que insertar sin borrar dejaría duplicados y se
-- aplicaría el primero que devolviera la consulta-.
delete from public.precios_estudios pe
using tmp_precios_anamaya_claves t
where pe.cliente = 'CENTRO MEDICO ANAMAYA'
	and t.clave is not null
	and (
		pe.clave = t.clave
		or pg_temp.llave_anamaya(pe.descripcion) = pg_temp.llave_anamaya(t.descripcion)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select 'Estudio', t.clave, t.descripcion, 'CENTRO MEDICO ANAMAYA', t.precio, now()
from tmp_precios_anamaya_claves t
where t.clave is not null;

do $$
declare
	v_fila record;
	v_fijados integer;
	v_faltantes integer := 0;
begin
	select count(*) into v_fijados from tmp_precios_anamaya_claves where clave is not null;
	raise notice 'Precios de CENTRO MEDICO ANAMAYA fijados: % de %', v_fijados, (
		select count(*) from tmp_precios_anamaya
	);

	for v_fila in
		select descripcion from tmp_precios_anamaya_claves where clave is null order by descripcion
	loop
		v_faltantes := v_faltantes + 1;
		raise notice 'ATENCION: "%" no esta en el catalogo; su precio no se fijo', v_fila.descripcion;
	end loop;

	if v_faltantes = 0 then
		raise notice 'Todos los estudios de la lista cruzaron con su estudio del catalogo.';
	end if;
end
$$;

drop table tmp_precios_anamaya_claves;
drop table tmp_precios_anamaya;

NOTIFY pgrst, 'reload schema';
