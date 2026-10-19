-- Precios de laboratorio de SSA, tomados de la lista de precios vigente
-- (223 estudios y 10 paquetes).
--
-- Había estudios con precio que no aparecían al cotizar ni al capturar la orden
-- -prolactina, entre otros- porque no estaban en el catálogo de laboratorio:
-- el buscador sólo ofrece lo que está en el catálogo. Primero se da de alta lo
-- que falte y luego se fija el precio.
--
-- Cuando la lista repite una clave se toma el renglón con la fecha más
-- reciente. Los importes con tres decimales se cierran a centavos, que es lo
-- que guarda la columna.

create temporary table tmp_lista_lab (
	tipo text not null,
	clave text not null,
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_lista_lab (tipo, clave, descripcion, precio)
values
	('Estudio', '17ALFA', '17 ALFA HIDROXIPROGESTERONA EN SUERO', 731.50),
	('Estudio', 'AAC', 'ANTICUERPOS ANTI-CENTROMERO', 891.00),
	('Estudio', 'AACLA', 'ANTICUERPOS ANTI-CARDIOLIPINAS IgA', 1093.50),
	('Estudio', 'AACLG', 'ANTICUERPOS ANTI-CARDIOLIPINAS IgG', 608.00),
	('Estudio', 'AACLM', 'ANTICUERPOS ANTI-CARDIOLIPINAS IgM', 702.00),
	('Estudio', 'AAN18', 'INMUNOESPECIFICIDAD DE AAN 18 DETERM', 6075.00),
	('Estudio', 'ACC', 'AC ANTI CISTICERCO EN LCR', 632.50),
	('Estudio', 'ACL', 'ANTICOAGULANTE LUPICO', 1012.00),
	('Estudio', 'ACLY', 'ANTICUERPOS ANTI-BORRELIA BURGDORFERI IgG e IgM', 1998.00),
	('Estudio', 'ACSMITH', 'AC. ANTI-SMITH', 677.00),
	('Estudio', 'ACT', 'ANTICUERPOS ANTI-TIROGLOBULINA', 632.50),
	('Estudio', 'ACTA', 'ANTICUERPOS ANTI-CHLAMYDIA TRACHOMATIS IgA', 764.50),
	('Estudio', 'ACTG', 'ANTICUERPOS ANTI-CHLAMYDIA TRACHOMATIS IgG', 764.50),
	('Estudio', 'ACTH', 'HORMONA ADRENOCORTICOTROFICA ACTH', 665.50),
	('Estudio', 'ACTM', 'ANTICUERPOS ANTI-CHLAMYDIA TRACHOMATIS IgM', 764.50),
	('Estudio', 'ADNA', 'ANTICUERPOS ANTI-DNA DOBLE CADENA', 774.00),
	('Estudio', 'ADST', 'ALDOSTERONA', 1053.00),
	('Estudio', 'ADT', 'ANDROSTENEDIONA', 544.50),
	('Estudio', 'AELO1', 'ANTI-ESTREPTOLISINA "O"', 186.34),
	('Estudio', 'AFOL', 'ACIDO FOLICO (FOLATOS)', 890.00),
	('Estudio', 'AFP', 'ALFAFETOPROTEINAS', 392.00),
	('Estudio', 'AGCOVID', 'PRUEBA DE ANTIGENO DE SARS-CoV-2 (COVID-19)', 495.00),
	('Estudio', 'AGG', 'ANTIGENO GIARDIA LAMBLIA', 1330.00),
	('Estudio', 'ALB', 'ALBUMINA SERICA', 107.80),
	('Estudio', 'AMI', 'AMILASA SERICA', 177.10),
	('Estudio', 'AMIF', 'AMIBA EN FRESCO', 107.80),
	('Estudio', 'AMON', 'AMONIO EN PLASMA', 355.30),
	('Estudio', 'ANA', 'ANTICUERPOS ANTINUCLEARES', 700.00),
	('Estudio', 'ANCA', 'ANTICUERPOS ANTI-CITOPLASMA C-ANCA', 1566.00),
	('Estudio', 'ARRTSH', 'ANTICUERPOS ANTI RECEPTORES DE TSH', 2090.00),
	('Estudio', 'AT3', 'ANTITROMBINA III', 1204.50),
	('Estudio', 'AU', 'ACIDO URICO', 107.80),
	('Estudio', 'AcEHB', 'ANTICUERPOS CONTRA EL  ANTIGENO E DE HEPATITIS B', 486.00),
	('Estudio', 'AcHepC', 'ANTICUERPOS ANTI-HEPATITIS C (CUALITATIVO)', 342.65),
	('Estudio', 'AcI', 'ANTICUERPOS ANTI-INSULINA', 735.90),
	('Estudio', 'BAAR', 'BACILOSCOPIA DE 1 MUESTRA (BAAR)', 226.27),
	('Estudio', 'BAAR3', 'BACILOSCOPIA DE 3 MUESTRAS (BAAR)', 671.00),
	('Estudio', 'BCRABL', 'CROMOSOMA FILADELFIA ( BCR/ABL)', 8000.00),
	('Estudio', 'BHC', 'BIOMETRIA HEMATICA COMPLETA (BHC)', 115.50),
	('Estudio', 'BILIS', 'BILIRRUBINAS', 216.70),
	('Estudio', 'BNP', 'PEPTIDO NATRIURETICO (BNP)', 2200.00),
	('Estudio', 'C3', 'COMPLEMENTO C3', 430.10),
	('Estudio', 'C4', 'COMPLEMENTO C4', 430.10),
	('Estudio', 'CA125', 'AG. CARCINOMA OVARICO CA-125', 590.92),
	('Estudio', 'CA153', 'AG. CARCINOMA DE MAMA CA 15-3', 617.11),
	('Estudio', 'CA199', 'AG. CARCINOMA DE PANCREAS Y COLON CA 19-9', 726.00),
	('Estudio', 'CAL', 'CALCIO SERICO', 154.00),
	('Estudio', 'CALACT', 'CALPROTECTINA Y LACTOFERRINA HUMANA', 1342.00),
	('Estudio', 'CALCI', 'CALCITONINA', 627.00),
	('Estudio', 'CCP', 'ANTI-PEPTIDO CICLICO CITRULINADO', 1517.51),
	('Estudio', 'CD', 'COOMBS DIRECTO', 258.06),
	('Estudio', 'CEA', 'ANTIGENO CARCINOEMBRIONARIO', 376.81),
	('Estudio', 'CEXP', 'CULTIVO DE EXPECTORACION', 600.00),
	('Estudio', 'CFE', 'CINETICA DE HIERRO', 1413.50),
	('Estudio', 'CI', 'COOMBS INDIRECTO', 273.96),
	('Estudio', 'CISTATINA', 'CISTATINA C', 946.00),
	('Estudio', 'CITOLI', 'CITOLOGICO DE LIQUIDOS', 652.00),
	('Estudio', 'CITOS', 'CITOQUIMICO DE LIQUIDO', 672.00),
	('Estudio', 'CKMB', 'CREATIN-FOSFOQUINASA MB (CK-MB)', 280.50),
	('Estudio', 'CLAMY', 'ANTIGENO CHLAMYDIA  TRACHOMATIS  POR PCR', 4700.00),
	('Estudio', 'CLCR', 'CULTIVO DE LIQUIDO CEFALORRAQUIDEO', 813.45),
	('Estudio', 'CMV', 'ANTICUERPOS ANTI-CITOMEGALOVIRUS IgG', 621.00),
	('Estudio', 'CMVM', 'ANTICUERPOS ANTI-CITOMEGALOVIRUS IgM', 621.00),
	('Estudio', 'COL', 'COLESTEROL', 107.00),
	('Estudio', 'COLHDL', 'COLESTEROL HDL', 107.00),
	('Estudio', 'COLI', 'COLINESTERASA EN SUERO', 473.11),
	('Estudio', 'COP1', 'COPROPARASITOSCOPICO (1 MUESTRA)', 88.55),
	('Estudio', 'COP2', 'COPROPARASITOSCOPICO (2 MUESTRAS)', 177.10),
	('Estudio', 'COP3', 'COPROPARASITOSCOPICO (3 MUESTRAS)', 246.40),
	('Estudio', 'COPCUL', 'COPROCULTIVO - CULTIVO DE HECES', 792.00),
	('Estudio', 'COPROL', 'COPROLOGICO GENERAL', 177.10),
	('Estudio', 'CORT', 'CORTISOL SERICO', 255.64),
	('Estudio', 'CORVES', 'CORTISOL VESPERTINO', 255.64),
	('Estudio', 'CPK', 'CREATIN-FOSFOQUINASA (CPK)', 233.75),
	('Estudio', 'CRE', 'CREATININA', 107.80),
	('Estudio', 'CTG', 'CURVA DE TOLERANCIA A LA GLUCOSA 2 HORAS', 514.25),
	('Estudio', 'CUCH', 'CULTIVO DE EXUADO URETRAL C/CHLAMYDIA', 820.00),
	('Estudio', 'CUSE', 'CULTIVO DE SECRECION', 572.00),
	('Estudio', 'CVAG', 'CULTIVO DE EXUDADO CERVICO VAGINAL', 572.00),
	('Estudio', 'DENG', 'DENGUE DUO', 486.20),
	('Estudio', 'DEPU', 'DEPURACION DE CREATININA EN ORINA DE 24 HORAS', 307.62),
	('Estudio', 'DHEAS', 'DHEA-S DEHIDROEPIANDROSTERONA SULFATO', 451.61),
	('Estudio', 'DHL', 'DESHIDROGENASA LACTICA DHL', 204.05),
	('Estudio', 'DHT', 'DIHIDROTESTOSTERONA', 743.00),
	('Estudio', 'DIM', 'DIMERO D', 678.81),
	('Estudio', 'DNAN', 'ANTICUERPOS ANTI-DNA', 1148.00),
	('Estudio', 'DOP3', 'ANTIDOPING DE 3 PARAMETROS', 299.20),
	('Estudio', 'DOP6', 'ANTIDOPING DE 6 PARAMETROS', 627.00),
	('Estudio', 'EGO', 'EXAMEN GENERAL DE ORINA', 115.50),
	('Estudio', 'EOS', 'EOSINOFILOS DE MOCO NASAL', 209.00),
	('Estudio', 'ES3', 'ELECTROLITOS SERICOS DE 3 PARAMETROS', 288.75),
	('Estudio', 'ES6', 'ELECTROLITOS SERICOS DE 6 PARAMETROS', 402.71),
	('Estudio', 'ESP', 'ESPERMATOBIOSCOPIA', 392.70),
	('Estudio', 'EST', 'ESTRADIOL', 275.00),
	('Estudio', 'ETOT', 'ESTROGENOS TOTALES', 495.00),
	('Estudio', 'FAC', 'FOSFATASA ALCALINA', 107.80),
	('Estudio', 'FAR', 'CULTIVO DE EXUDADO FARINGEO', 486.20),
	('Estudio', 'FEB', 'REACCIONES FEBRILES', 161.70),
	('Estudio', 'FERR', 'FERRITINA', 643.00),
	('Estudio', 'FIBRI', 'FIBRINOGENO', 359.98),
	('Estudio', 'FOSFORO', 'FOSFORO', 128.59),
	('Estudio', 'FR', 'FACTOR REUMATOIDE (LATEX)', 215.05),
	('Estudio', 'FRC', 'FACTOR REUMATOIDE CUANTITATIVO', 338.00),
	('Estudio', 'FSH', 'HORMONA FOLICULO ESTIMULANTE', 275.00),
	('Estudio', 'FTA', 'AC. ANTI-TREPONEMA PALLIDUM  (FTA-ABS)', 704.06),
	('Estudio', 'GASART', 'GASOMETRIA ARTERIAL', 1500.00),
	('Estudio', 'GASVEN', 'GASOMETRIA VENOSA', 1500.00),
	('Estudio', 'GGT', 'GAMA GLUTAMIL TRANSPEPTIDASA (GGT)', 107.80),
	('Estudio', 'GLU', 'GLUCOSA', 107.80),
	('Estudio', 'GLUPOS', 'GLUCOSA PRE Y POST PRANDIAL (2HRS)', 487.30),
	('Estudio', 'GPO', 'GRUPO SANGUINEO', 110.00),
	('Estudio', 'H1N1', 'PRUEBA PARA ANTIGENO DE LA INFLUENZA A, B, H1N1', 691.90),
	('Estudio', 'H2G', 'ANTICUERPOS ANTI-HERPES II IgG', 511.00),
	('Estudio', 'H2M', 'ANTICUERPOS ANTI-HERPES II IgM', 500.00),
	('Estudio', 'HBA1C', 'HEMOGLOBINA GLICOSILADA (HbA1c)', 350.63),
	('Estudio', 'HBsAg', 'ANTIGENO DE SUPERFICIE PARA HEPATITIS B (CUALITATIVO)', 342.65),
	('Estudio', 'HC', 'HORMONA DE CRECIMIENTO', 619.00),
	('Estudio', 'HCG', 'CUANTIFICACION DE FRAC. BETA GONADOTROPINA CORIONICA HUMANA (B-HCG)', 269.50),
	('Estudio', 'HEMO', 'CULTIVO DE SANGRE (HEMOCULTIVO)', 1215.00),
	('Estudio', 'HIERRO', 'HIERRO SERICO', 312.29),
	('Estudio', 'HIV1Y2', 'AC. ANTI HIV 1 Y HIV 2', 292.60),
	('Estudio', 'HLAB27', 'ANTIGENO HLA-B27', 1853.50),
	('Estudio', 'HOMIR', 'INDICE DE RESISTENCIA A LA INSULINA (HOMA-IR)', 500.00),
	('Estudio', 'HOMO', 'HOMOCISTEINA', 1168.20),
	('Estudio', 'HPYH', 'ANTIGENO DE HELICOBACTER PYLORI EN HECES', 813.45),
	('Estudio', 'HSEX', 'GLOBULINA FIJADORA DE HORMONAS SEXUALES', 1340.00),
	('Estudio', 'HepAIgM', 'ANTICUERPOS ANTI-HEPATITIS A IgM', 675.00),
	('Estudio', 'HepAT', 'ANTICUERPOS ANTI-HEPATITIS A TOTAL', 1148.00),
	('Estudio', 'HerpG', 'ANTICUERPOS ANTI-HERPES I IgG', 569.00),
	('Estudio', 'HerpM', 'ANTICUERPOS ANTI-HERPES I IgM', 569.00),
	('Estudio', 'INPOS', 'INSULINA POST PANDRIAL', 654.50),
	('Estudio', 'INS', 'INSULINA SERICA', 359.70),
	('Estudio', 'IgA', 'INMUNOGLOBULINA A IgA', 486.00),
	('Estudio', 'IgE', 'INMUNOGLOBULINA E SERICA (IgE)', 486.00),
	('Estudio', 'IgG', 'INMUNOGLOBULINA G IgG', 486.00),
	('Estudio', 'IgGGLIC', 'BETA 2 GLICOPROTEINA IgG', 1138.50),
	('Estudio', 'IgM', 'INMUNOGLOBULINA M  IgM', 486.00),
	('Estudio', 'K', 'POTASIO', 288.75),
	('Estudio', 'LAC', 'ACIDO LACTICO', 440.00),
	('Estudio', 'LE', 'CELULAS LE', 295.46),
	('Estudio', 'LH', 'HORMONA LUTEINIZANTE', 275.00),
	('Estudio', 'LIPA', 'LIPASA', 177.10),
	('Estudio', 'LIT', 'LITIO', 396.44),
	('Estudio', 'MG', 'MAGNESIO SERICO', 128.59),
	('Estudio', 'MICRO24', 'MICROALBUMINA EN ORINA DE 24 HORAS', 400.00),
	('Estudio', 'NA', 'SODIO SERICO', 288.75),
	('Estudio', 'OSULL', 'PRUEBA O''SULLIVAN', 514.00),
	('Estudio', 'PANCA', 'ANTICUERPOS ANTI-CITOPLASMA P-ANCA', 1566.00),
	('Estudio', 'PAP', 'PAPANICOLAOU', 440.00),
	('Estudio', 'PAPPCR', 'VIRUS DEL PAPILOMA HUMANO POR PCR', 2571.25),
	('Paquete', 'PBASICO', 'PERFIL BASICO', 1089.00),
	('Estudio', 'PCR', 'PROTEINA "C" REACTIVA (LATEX)', 186.34),
	('Estudio', 'PCRUL', 'PROTEINA "C" REACTIVA ULTRASENSIBLE', 440.00),
	('Estudio', 'PCT', 'PROCALCITONINA', 645.15),
	('Paquete', 'PDIAB', 'PERFIL DIABETICO', 980.10),
	('Paquete', 'PETS', 'PERFIL ETS', 1039.50),
	('Estudio', 'PFH', 'PRUEBAS DE FUNCIONAMIENTO HEPATICO', 792.00),
	('Estudio', 'PH', 'PARATHORMONA (MOLECULA INTACTA)', 5730.00),
	('Estudio', 'PIES', 'PRUEBA DE EMBARAZO EN SANGRE', 161.70),
	('Estudio', 'PLG', 'ANTICUERPOS ANTI-FOSFOLIPIDOS IgG', 695.20),
	('Estudio', 'PLIP', 'PERFIL DE LIPIDOS', 350.35),
	('Estudio', 'PLM', 'ANTICUERPOS ANTI-FOSFOLIPIDOS IgM', 695.20),
	('Estudio', 'POV5', 'PERFIL OVARICO 5', 1305.15),
	('Estudio', 'POV6', 'PERFIL OVARICO 6', 1548.80),
	('Estudio', 'PPD', 'PRUEBA CUTANEA DE TUBERCULINA', 1000.00),
	('Paquete', 'PPNAT', 'PERFIL PRENATAL', 962.50),
	('Paquete', 'PPRE', 'PERFIL PRENUPCIAL', 330.00),
	('Paquete', 'PREOP', 'PERFIL PREOPERATORIO (solo lab)', 803.00),
	('Paquete', 'PREUMA', 'PERFIL REUMATOLOGICO', 726.00),
	('Estudio', 'PROG', 'PROGESTERONA', 275.00),
	('Estudio', 'PROL', 'PROLACTINA', 275.00),
	('Estudio', 'PROTC', 'PROTEINA "C" DE LA COAGULACION', 2277.00),
	('Estudio', 'PROTS', 'PROTEINA "S" DE LA COAGULACION', 2541.00),
	('Estudio', 'PSAE', 'ANTIGENO PROSTATICO ESPECIFICO (PSA)', 412.50),
	('Estudio', 'PSAF', 'ANTIGENO PROSTATICO LIBRE', 370.26),
	('Paquete', 'PSCOMP', 'PERFIL SMAC/COMPLETO', 2904.00),
	('Paquete', 'PSELE', 'PERFIL SMAC/ELECTROLITOS', 2075.70),
	('Paquete', 'PSTIR', 'PERFIL SMAC/TIROIDEO', 2534.40),
	('Estudio', 'PTORINA', 'PROTEINAS EN ORINA DE 24 HRS', 392.70),
	('Estudio', 'PTOT', 'PROTEINAS TOTALES SERICAS', 138.60),
	('Estudio', 'PYIgA', 'ANTICUERPOS HELICOBACTER PYLORI IgA', 607.75),
	('Estudio', 'PYIgG', 'ANTICUERPOS HELICOBACTER PYLORI IgG', 607.75),
	('Estudio', 'PYIgM', 'ANTICUERPOS HELICOBACTER PYLORI IgM', 607.75),
	('Estudio', 'QS12', 'QUIMICA SANGUINEA DE 12 ELEMENTOS', 986.70),
	('Estudio', 'QS24', 'QUIMICA SANGUINEA DE 24 ELEMENTOS', 1639.00),
	('Estudio', 'QS3', 'QUIMICA SANGUINEA DE 3 ELEMENTOS', 265.65),
	('Estudio', 'QS30', 'QUIMICA SANGUINEA DE 30 ELEMENTOS', 2400.00),
	('Estudio', 'QS3ALT', 'QUIMICA SANGUINEA DE 3(COL,TRIG)', 265.65),
	('Estudio', 'QS4', 'QUIMICA  SANGUINEA DE 4 ELEMENTOS', 373.45),
	('Estudio', 'QS4ALT', 'QUIMICA SANGUINEA DE 4 ELEMENTOS (COL, TRIG)', 373.45),
	('Estudio', 'QS6', 'QUIMICA SANGUINEA DE 6 ELEMENTOS', 605.00),
	('Estudio', 'RALCR', 'RELACION ALBUMINA/CREATININA', 540.00),
	('Estudio', 'RETI', 'RETICULOCITOS', 115.50),
	('Estudio', 'RICKIgG', 'ANTICUERPOS ANTI-RICKETTSIA IgG', 2133.00),
	('Estudio', 'RICKIgM', 'ANTICUERPOS ANTI-RICKETTSIA IgM', 2133.00),
	('Estudio', 'ROSA', 'ROSA DE BENGALA', 572.00),
	('Estudio', 'SLC70', 'ANTICUERPOS ANTI-SCL-70', 945.00),
	('Estudio', 'SOH', 'SANGRE OCULTA EN HECES', 107.80),
	('Estudio', 'T3C', 'T3 CAPTACION', 333.80),
	('Estudio', 'T3L', 'TRIYODOTIRONINA LIBRE (T3 libre)', 274.89),
	('Estudio', 'T3T', 'TRIYODOTIRONINA (T3 total)', 275.00),
	('Estudio', 'T4L', 'TIROXINA LIBRE (T4 libre)', 274.89),
	('Estudio', 'T4T', 'TIROXINA (T4 total)', 275.00),
	('Estudio', 'TAM', 'TAMIZ METABOLICO AMPLIADO', 1424.50),
	('Estudio', 'TC', 'TIEMPO DE COAGULACION', 154.00),
	('Estudio', 'TESTO', 'TESTOSTERONA TOTAL', 304.92),
	('Estudio', 'TGO', 'TRANSAMINASA GLUTAMICO OXALOACETICA (TGO)', 146.30),
	('Estudio', 'TGP', 'TRANSAMINASA GLUTAMICO PIRUVICA (TGP)', 146.30),
	('Estudio', 'TIRO', 'PERFIL TIROIDEO', 957.00),
	('Estudio', 'TIROG', 'TIROGLOBULINA', 466.40),
	('Estudio', 'TOMDOM', 'SERVICIO A DOMICILIO', 495.00),
	('Estudio', 'TORCHIII', 'PERFIL DE TORCH III IgM E IgG CUANTITATIVO', 3020.00),
	('Estudio', 'TP', 'TIEMPO DE PROTROMBINA TP', 177.10),
	('Estudio', 'TRANS', 'TRANSFERRINA', 385.00),
	('Estudio', 'TRIG', 'TRIGLICERIDOS', 107.80),
	('Estudio', 'TRIP', 'ANTICUERPOS ANTI-TRIPANOSOMA (CHAGAS)', 762.30),
	('Estudio', 'TROI', 'TROPONINA I', 1870.00),
	('Estudio', 'TS', 'TIEMPO DE SANGRADO', 154.00),
	('Estudio', 'TSH', 'HORMONA ESTIMULANTE DE LA TIROIDES', 275.00),
	('Estudio', 'TTP', 'TIEMPO DE TROMBOPLASTINA PARCIAL TTP', 177.10),
	('Estudio', 'TUBIgG', 'AC. ANTI MYCOBACTERIUM TUBERCULOSIS (IgG)', 940.00),
	('Estudio', 'TUBIgM', 'AC ANTI MYCOBACTERIUM TUBERCULOSIS IgM', 713.00),
	('Estudio', 'URE', 'UREA SERICA', 107.80),
	('Estudio', 'UREAO', 'DEPURACION DE UREA EN ORINA DE 24 HORAS', 300.00),
	('Estudio', 'URO', 'UROCULTIVO', 486.20),
	('Estudio', 'VB12', 'VITAMINA B12', 764.50),
	('Estudio', 'VDRL', 'VDRL', 115.50),
	('Estudio', 'VITD25', 'VITAMINA D 25-OH', 850.00),
	('Estudio', 'VITD3', 'VITAMINA D3', 2570.00),
	('Estudio', 'VSG', 'VELOCIDAD DE SEDIMENTACION GLOBULAR VSG', 100.10),
	('Estudio', 'ZINC', 'ZINC', 979.00),
	('Estudio', 'aTPO', 'AC. ANTI PEROXIDASA  TIROIDEA (a-TPO)', 632.50),
	('Estudio', 'testlibre2', 'TESTOSTERONA LIBRE', 544.50);

create or replace function pg_temp.llave_lab(texto text)
returns text
language sql
immutable
as $$
	select upper(btrim(regexp_replace(coalesce(texto, ''), '\s+', ' ', 'g')))
$$;

-- ── Catálogo ────────────────────────────────────────────────────────────────
-- Se da de alta el estudio que no esté ni por clave ni por descripción: uno que
-- ya vive con otra clave no se duplica, su precio se encuentra por descripción.
-- Los paquetes no se dan de alta aquí -hay que armarlos con sus estudios desde
-- Configuración-; de ellos sólo se fija el precio. El área queda vacía para
-- asignarla desde Configuración > Estudios.
insert into public.estudios_lab_catalogo (key, clave, descripcion, dias_proceso)
select t.clave, t.clave, t.descripcion, 1
from tmp_lista_lab t
where t.tipo = 'Estudio'
	and not exists (
		select 1 from public.estudios_lab_catalogo l
		where pg_temp.llave_lab(l.clave) = pg_temp.llave_lab(t.clave)
			or pg_temp.llave_lab(l.descripcion) = pg_temp.llave_lab(t.descripcion)
	)
	and not exists (
		select 1 from public.estudios_imagen_catalogo i
		where pg_temp.llave_lab(i.clave) = pg_temp.llave_lab(t.clave)
	)
	and not exists (
		select 1 from public.paquetes p
		where pg_temp.llave_lab(p.clave) = pg_temp.llave_lab(t.clave)
	);

-- ── Precios ─────────────────────────────────────────────────────────────────
-- Se borra lo que haya de esas claves para SSA y se vuelve a insertar: así
-- queda re-ejecutable y de paso limpia renglones repetidos o con otro importe.
delete from public.precios_estudios pe
using tmp_lista_lab t
where pg_temp.llave_lab(pe.cliente) = pg_temp.llave_lab('SSA')
	and pg_temp.llave_lab(pe.clave) = pg_temp.llave_lab(t.clave);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select t.tipo, t.clave, t.descripcion, 'SSA', t.precio, now()
from tmp_lista_lab t;

drop table tmp_lista_lab;

NOTIFY pgrst, 'reload schema';
