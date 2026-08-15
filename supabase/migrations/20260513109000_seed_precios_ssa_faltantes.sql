delete from public.precios_estudios
where cliente = 'SSA'
	and clave in (
		'OT-AUDIOMETRIA-TONAL-PAQUETE',
		'RX-COLUMNA-DORSOLUMBAR-2-POSICIONES',
		'RX-PLACA-EXTRA'
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
	('Estudio', 'OT-AUDIOMETRIA-TONAL-PAQUETE', 'AUDIOMETRIA TONAL PAQUETE', 'SSA', 570.00, now()),
	('Estudio', 'RX-COLUMNA-DORSOLUMBAR-2-POSICIONES', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 'SSA', 730.00, now()),
	('Estudio', 'RX-PLACA-EXTRA', 'PLACA EXTRA', 'SSA', 390.00, now());
