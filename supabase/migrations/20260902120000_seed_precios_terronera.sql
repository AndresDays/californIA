-- Precios pactados con TERRONERA PRECIOUS METALS, tomados de su lista vigente.
--
-- Son los estudios de la vigilancia médica de la mina -metales pesados y la
-- batería de ingreso- más los dos paquetes de ingreso. Sin estos renglones el
-- convenio no tiene tarifario, y entonces la búsqueda de estudios le ofrece el
-- catálogo completo y cada estudio se cobra al precio por defecto.
--
-- Igual que las siembras de ISSSTE y SSA: primero se borra lo que haya de esas
-- claves para ese cliente y se vuelve a insertar. Así la migración es
-- re-ejecutable y de paso corrige un importe que estuviera desactualizado, que
-- es lo que no permitiría un insert a secas -la tabla no tiene índice único
-- sobre (clave, cliente), así que insertar sin borrar dejaría duplicados y el
-- precio que se aplicaría sería el primero que devolviera la consulta-.
--
-- El nombre del cliente va exactamente como está dado de alta: la búsqueda del
-- tarifario compara la columna con `ilike` sin comodines, así que no distingue
-- mayúsculas pero sí cualquier diferencia de texto.

delete from public.precios_estudios
where cliente = 'TERRONERA PRECIOUS METALS'
	and clave in (
		'BHC',
		'CAD',
		'EGO',
		'GPO',
		'HBA1C',
		'MERC',
		'PIM1',
		'PIM8',
		'PLO',
		'QS6'
	);

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha) values
	('Estudio', 'BHC', 'BIOMETRIA HEMATICA COMPLETA (BHC)', 'TERRONERA PRECIOUS METALS', 115.00, now()),
	('Estudio', 'CAD', 'CADMIO', 'TERRONERA PRECIOUS METALS', 1350.00, now()),
	('Estudio', 'EGO', 'EXAMEN GENERAL DE ORINA', 'TERRONERA PRECIOUS METALS', 115.00, now()),
	('Estudio', 'GPO', 'GRUPO SANGUINEO', 'TERRONERA PRECIOUS METALS', 115.00, now()),
	('Estudio', 'HBA1C', 'HEMOGLOBINA GLICOSILADA (HbA1c)', 'TERRONERA PRECIOUS METALS', 325.00, now()),
	('Estudio', 'MERC', 'MERCURIO EN SANGRE', 'TERRONERA PRECIOUS METALS', 1350.00, now()),
	('Paquete', 'PIM1', 'PAQ INGRESOS MINAS 1', 'TERRONERA PRECIOUS METALS', 4686.98, now()),
	('Paquete', 'PIM8', 'PAQ INGRESOS MINAS 8', 'TERRONERA PRECIOUS METALS', 8736.98, now()),
	('Estudio', 'PLO', 'PLOMO EN SANGRE', 'TERRONERA PRECIOUS METALS', 1350.00, now()),
	('Estudio', 'QS6', 'QUIMICA SANGUINEA DE 6 ELEMENTOS', 'TERRONERA PRECIOUS METALS', 435.00, now());

NOTIFY pgrst, 'reload schema';
