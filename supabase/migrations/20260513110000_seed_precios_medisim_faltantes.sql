delete from public.precios_estudios
where cliente = 'Medisim'
	and clave in (
		'RX-COLUMNA-DORSOLUMBAR-2-POSICIONES'
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
	('Estudio', 'RX-COLUMNA-DORSOLUMBAR-2-POSICIONES', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 'Medisim', 750.00, now());
