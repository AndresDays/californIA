-- Otros estudios: catálogo y precios de particular.
--
-- Son los servicios que no caen en ninguna modalidad de imagen ni en el
-- laboratorio -audiometría, espirometría, biopsias, consultas, paquetes de
-- chequeo- y que hoy se cobran a mano porque no están en el catálogo. Entran
-- bajo el tipo de estudio "Otros estudios", con su precio de particular tomado
-- de la lista vigente al 01/08/2026.
--
-- Varios ya existen en el catálogo, dados de alta en su propia modalidad -la
-- mastografía, la densitometría-. Esos NO se reclasifican: moverlos a "otros"
-- los sacaría de su columna en el calendario y de los filtros del reporte. De
-- ellos sólo se actualiza el precio, y se reconocen por su descripción, que es
-- lo único que comparten las dos listas.

-- La lista, una sola vez: se usa para dar de alta lo que falta y para fijar los
-- precios. La tabla temporal muere con la sesión de la migración.
create temporary table tmp_otros_estudios (
	descripcion text not null,
	precio numeric(10,2) not null
);

insert into tmp_otros_estudios (descripcion, precio)
values
	('AGUDEZA VISUAL', 430),
	('AUDIOMETRIA', 760),
	('BIOPSIA DE HIGADO AGUJA TRU CUT con estudio histop', 7560),
	('BIOPSIA DE MAMA CON ESTUDIO PATOLOGICO', 4180),
	('BIOPSIA DE MAMA SIN ESTUDIO PATOLOGICO', 3450),
	('BIOPSIA DE TIROIDES CON EST. PATOLOGICO', 3800),
	('BIOPSIA MAMA  AGUJA TRU CUT con estudio histo', 6270),
	('BIOPSIA MAMA AGUJA TRU CUT sin estudio histop', 5180),
	('BIOPSIA POR TAC', 6530),
	('BIOPSIA PROSTATA AGUJA TRU CUT con estudio histop', 7560),
	('CERTIFICADO MEDICO', 760),
	('COLONOSCOPIA', 6800),
	('COLPOSCOPIA', 940),
	('CONSULTA CARDIOLGO', 1010),
	('CONSULTA DR CERVANTES', 760),
	('DENSITOMETRIA  DE COLUMNA Y CADERA', 1240),
	('DENSITOMETRIA COMPLETA', 1890),
	('ECOCARDIOGRAMA', 3560),
	('ELECTROCARDIOGRAMA', 1010),
	('ELECTROENCEFALOGRAMA', 3670),
	('ELECTROENCEFALOGRAMA CON MAPEO', 4160),
	('ENDOSCOPIA', 5940),
	('ESPIROMETRIA', 1130),
	('ESPIROMETRIA (CXC ODILE)', 1420),
	('ESPIROMETRIA BD', 1400),
	('EXAMEN CLINICO MEDICO', 860),
	('HOLTER CARDIOLOGO', 3020),
	('MAMOGRAFIA DIGITAL / RASTREO MAMARIO', 1160),
	('MAMOGRAFIA DIGITAL CON ULTRASONIDO', 1760),
	('MAPA', 3020),
	('PAQ DENSITO, MASTOGRAFIA (RASTREO MAMARIO)', 1900),
	('PAQ FEMENINO (CXC ODILE)', 10960),
	('PAQ MASCULINO (CXC ODILE)', 10550),
	('PAQ. BASICO FEM 1 ( APARTIR DE LOS 40 AÑOS)', 2260),
	('PAQ. BASICO FEM 1 ( MENORES DE 40 AÑOS)', 1600),
	('PAQ. BASICO FEM 2 ( APARTIR DE LOS 40 AÑOS)', 3740),
	('PAQ. BASICO FEM 2 ( MENORES DE 40 AÑOS)', 2550),
	('PAQ. BASICO MAS 1 ( APARTIR DE LOS 40 AÑOS)', 1270),
	('PAQ. BASICO MAS 2 ( APARTIR DE LOS 40 AÑOS)', 2550),
	('PRUEBAS DE ESFUERZO', 4380);

-- Comparar descripciones capturadas por distintas manos: sin acentos, sin
-- espacios de sobra y en mayúsculas.
create or replace function pg_temp.llave_otros_estudios(p_texto text)
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

-- ── El tipo de estudio ──────────────────────────────────────────────────────
insert into public.tipos_estudio (nombre)
select 'Otros estudios'
where not exists (
	select 1 from public.tipos_estudio where lower(btrim(nombre)) = 'otros estudios'
);

-- Se ofrece por las dos empresas: la lista trae servicios que factura cada una
-- -consultas y densitometría por California, biopsias y endoscopía por Imagen-
-- y quién factura cada orden lo decide después la matriz del convenio.
insert into public.empresa_tipos_estudio (id_empresa, id_tipo_estudio)
select empresa.id_empresa, tipo.id_tipo_estudio
from public.empresas empresa
join public.tipos_estudio tipo on lower(btrim(tipo.nombre)) = 'otros estudios'
where upper(empresa.nombre) in (
	'CENTRAL DIAGNOSTICA CALIFORNIA',
	'CENTRO DE DIAGNOSTICO POR IMAGEN PVR'
)
on conflict (id_empresa, id_tipo_estudio) do nothing;

-- ── Los estudios que faltan ─────────────────────────────────────────────────
-- La clave se arma de la descripción, con el prefijo OE para reconocerlos de un
-- vistazo en la lista de precios y en los reportes.
insert into public.estudios_imagen_catalogo (
	clave, descripcion, empresa_operativa, modalidad, area,
	region_anatomica, requiere_contraste, requiere_interpretacion, dias_proceso, activo
)
select
	left('OE-' || regexp_replace(pg_temp.llave_otros_estudios(t.descripcion), '[^A-Z0-9]+', '-', 'g'), 50),
	t.descripcion,
	'CDI',
	'otro',
	'Otros estudios',
	'Servicio',
	false,
	false,
	1,
	true
from tmp_otros_estudios t
where not exists (
	select 1 from public.estudios_imagen_catalogo e
	where pg_temp.llave_otros_estudios(e.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
)
	-- Un servicio que ya vive en laboratorio o como paquete tampoco se duplica
	-- aquí: sólo se le fija el precio.
	and not exists (
		select 1 from public.estudios_lab_catalogo l
		where pg_temp.llave_otros_estudios(l.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
	)
	and not exists (
		select 1 from public.paquetes p
		where pg_temp.llave_otros_estudios(p.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
	)
on conflict (clave) do nothing;

-- ── Los precios de particular ───────────────────────────────────────────────
-- La clave con la que se cobra es la que ya tiene el estudio en el catálogo
-- -la nueva OE-, o la que traía de antes-, para que el precio se encuentre al
-- buscarlo por clave y no sólo por descripción.
create temporary table tmp_otros_estudios_precios as
select
	coalesce(
		(select e.clave from public.estudios_imagen_catalogo e
		 where pg_temp.llave_otros_estudios(e.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
		 order by e.clave limit 1),
		(select l.clave from public.estudios_lab_catalogo l
		 where pg_temp.llave_otros_estudios(l.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
		 order by l.clave limit 1),
		(select p.clave from public.paquetes p
		 where pg_temp.llave_otros_estudios(p.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
		 order by p.clave limit 1)
	) as clave,
	t.descripcion,
	t.precio
from tmp_otros_estudios t;

-- Se borra lo que hubiera de esas claves para particular y se vuelve a
-- insertar: la lista de precios trae renglones repetidos de capturas viejas, y
-- así la migración queda re-ejecutable y de paso los limpia.
delete from public.precios_estudios pe
using tmp_otros_estudios_precios t
where pe.cliente = 'Particular'
	and (
		pe.clave = t.clave
		or pg_temp.llave_otros_estudios(pe.descripcion) = pg_temp.llave_otros_estudios(t.descripcion)
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio)
select 'Estudio', t.clave, t.descripcion, 'Particular', t.precio
from tmp_otros_estudios_precios t
where t.clave is not null;

do $$
declare
	v_altas integer;
	v_precios integer;
	v_sin_clave integer;
begin
	select count(*) into v_altas
	from public.estudios_imagen_catalogo
	where modalidad = 'otro' and area = 'Otros estudios';

	select count(*) into v_precios
	from public.precios_estudios pe
	where pe.cliente = 'Particular'
		and exists (select 1 from tmp_otros_estudios_precios t where t.clave = pe.clave);

	select count(*) into v_sin_clave from tmp_otros_estudios_precios where clave is null;

	raise notice 'Otros estudios en el catalogo: %; precios de particular fijados: %', v_altas, v_precios;
	if v_sin_clave > 0 then
		raise notice 'Servicios sin clave resuelta: % (no se les fijo precio)', v_sin_clave;
	end if;
end
$$;

drop table tmp_otros_estudios_precios;
drop table tmp_otros_estudios;

NOTIFY pgrst, 'reload schema';
