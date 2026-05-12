alter table public.estudios_imagen_catalogo
	drop constraint if exists estudios_imagen_catalogo_modalidad_check;

alter table public.estudios_imagen_catalogo
	add constraint estudios_imagen_catalogo_modalidad_check
	check (modalidad in (
		'resonancia',
		'radiografia',
		'tomografia',
		'ultrasonido',
		'mastografia',
		'estudios_contrastados',
		'urgencias_otros',
		'otro'
	));

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
	('UO-REIMPRESION-CDS-USB', 'REIMPRESION DE CDS / USB', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Servicio', false, false, 0, true),
	('UO-REIMPRESION-PLACA', 'REIMPRESION DE PLACA', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Servicio', false, false, 0, true),
	('UO-URGENCIA-INTERPRETACION-ESTUDIO-CONTRASTADO', 'URGENCIA INTERPRETACION ESTUDIO CONTRASTADO', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia interpretacion', true, true, 0, true),
	('UO-URGENCIA-INTERPRETACION-PLACA-RX', 'URGENCIA INTERPRETACION PLACA RX', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia interpretacion', false, true, 0, true),
	('UO-URGENCIA-INTERPRETACION-TOMOGRAFIA', 'URGENCIA INTERPRETACION TOMOGRAFIA', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia interpretacion', false, true, 0, true),
	('UO-URGENCIA-TECNICO-ESTUDIO-CONTRASTADO', 'URGENCIA TECNICO ESTUDIO CONTRASTADO', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia tecnico', true, false, 0, true),
	('UO-URGENCIA-TECNICO-RADIOLOGO-RX', 'URGENCIA TECNICO RADIOLOGO RX', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia tecnico', false, false, 0, true),
	('UO-URGENCIA-TECNICO-TOMOGRAFIA', 'URGENCIA TECNICO TOMOGRAFIA', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia tecnico', false, false, 0, true),
	('UO-URGENCIA-ULTRASONIDO-CONVENCIONAL', 'URGENCIA ULTRASONIDO CONVENCIONAL', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia ultrasonido', false, true, 0, true),
	('UO-URGENCIA-ULTRASONIDO-DOPPLER', 'URGENCIA ULTRASONIDO DOPPLER', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia ultrasonido', false, true, 0, true),
	('UO-URGENCIA-ULTRASONIDO-ENDOCAVITARIO', 'URGENCIA ULTRASONIDO ENDOCAVITARIO', 'CDI', 'urgencias_otros', 'Urgencias y otros', 'Urgencia ultrasonido', false, true, 0, true)
on conflict (clave) do update set
	descripcion = excluded.descripcion,
	empresa_operativa = excluded.empresa_operativa,
	modalidad = excluded.modalidad,
	area = excluded.area,
	region_anatomica = excluded.region_anatomica,
	requiere_contraste = excluded.requiere_contraste,
	requiere_interpretacion = excluded.requiere_interpretacion,
	dias_proceso = excluded.dias_proceso,
	activo = excluded.activo,
	updated_at = now();
