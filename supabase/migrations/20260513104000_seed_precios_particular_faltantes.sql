delete from public.precios_estudios
where cliente = 'Particular'
	and clave in (
		'OT-PAQ-BASICO-FEM-2-MENORES-40',
		'OT-PAQ-BASICO-MAS-1-MAYORES-40',
		'OT-PAQ-BASICO-MAS-2-MAYORES-40',
		'OT-PRUEBAS-ESFUERZO',
		'RM-MUNECA-MANO-CONTRASTADA'
	);

insert into public.precios_estudios (
	tipo,
	clave,
	descripcion,
	cliente,
	precio,
	fecha
)
values
	('Estudio', 'OT-PAQ-BASICO-FEM-2-MENORES-40', 'PAQ. BASICO FEM 2 ( MENORES DE 40 ANOS)', 'Particular', 2550.00, now()),
	('Estudio', 'OT-PAQ-BASICO-MAS-1-MAYORES-40', 'PAQ. BASICO MAS 1 ( APARTIR DE LOS 40 ANOS)', 'Particular', 1270.00, now()),
	('Estudio', 'OT-PAQ-BASICO-MAS-2-MAYORES-40', 'PAQ. BASICO MAS 2 ( APARTIR DE LOS 40 ANOS)', 'Particular', 2550.00, now()),
	('Estudio', 'OT-PRUEBAS-ESFUERZO', 'PRUEBAS DE ESFUERZO', 'Particular', 4380.00, now()),
	('Estudio', 'RM-MUNECA-MANO-CONTRASTADA', 'RM MUNECA - MANO CONTRASTADA', 'Particular', 7290.00, now());
