insert into public.estudios_imagen_catalogo (
	clave,
	descripcion,
	empresa_operativa,
	modalidad,
	area,
	region_anatomica,
	requiere_contraste,
	requiere_interpretacion,
	dias_proceso,
	activo
)
values
	('OT-AUDIOMETRIA-TONAL-PAQUETE', 'AUDIOMETRIA TONAL PAQUETE', 'CDI', 'otro', 'Otros estudios', 'Auditivo', false, false, 1, true),
	('RX-COLUMNA-DORSOLUMBAR-2-POSICIONES', 'COLUMNA DORSOLUMBAR (2 POSICIONES)', 'CDI', 'radiografia', 'Radiologia', 'Columna dorsolumbar', false, true, 1, true),
	('RX-PLACA-EXTRA', 'PLACA EXTRA', 'CDI', 'radiografia', 'Radiologia', 'Cualquier region', false, true, 1, true);
