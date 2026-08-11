delete from public.precios_estudios
where cliente = 'ISSSTE'
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
	('Estudio', 'RX-COLUMNA-DORSOLUMBAR-2-POSICIONES', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 'ISSSTE', 400.00, now());
