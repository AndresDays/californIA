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
		'veterinaria',
		'otro'
	)) not valid;

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
	('VET-RM-CERVICAL-CONTRASTADA', 'RM CERVICAL CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Cervical', true, true, 1, true),
	('VET-RM-CERVICAL-SIMPLE', 'RM CERVICAL SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Cervical', false, true, 1, true),
	('VET-RM-CRANEO-CONTRASTADA', 'RM CRANEO CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Craneo', true, true, 1, true),
	('VET-RM-CRANEO-SIMPLE', 'RM CRANEO SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-RM-DORSAL-SIMPLE', 'RM DORSAL SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Dorsal', false, true, 1, true),
	('VET-RM-LUMBAR-SIMPLE', 'RM LUMBAR SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Lumbar', false, true, 1, true),
	('VET-RM-LUMBOSACRA-CONTRASTADA', 'RM LUMBOSACRA CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Lumbosacra', true, true, 1, true),
	('VET-RM-RODILLA-SIMPLE', 'RM RODILLA SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Rodilla', false, true, 1, true),
	('VET-RM-TORACOABDOMINAL-CONTRASTADA', 'RM TORACOABDOMINAL CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Toracoabdominal', true, true, 1, true),
	('VET-RM-TORACOLUMBAR-CONTRASTADA', 'RM TORACOLUMBAR CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Toracolumbar', true, true, 1, true),
	('VET-RM-TORACOLUMBAR-SIMPLE', 'RM TORACOLUMBAR SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Toracolumbar', false, true, 1, true),
	('VET-RX-ABDOMEN', 'RX ABDOMEN', 'CDI', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-RX-COLUMNA', 'RX COLUMNA', 'CDI', 'veterinaria', 'Veterinaria', 'Columna', false, true, 1, true),
	('VET-RX-CRANEO', 'RX CRANEO', 'CDI', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-RX-EXTREMIDADES', 'RX EXTREMIDADES', 'CDI', 'veterinaria', 'Veterinaria', 'Extremidades', false, true, 1, true),
	('VET-RX-MANDIBULA', 'RX MANDIBULA', 'CDI', 'veterinaria', 'Veterinaria', 'Mandibula', false, true, 1, true),
	('VET-RX-PELVIS', 'RX PELVIS', 'CDI', 'veterinaria', 'Veterinaria', 'Pelvis', false, true, 1, true),
	('VET-RX-TORAX', 'RX TORAX', 'CDI', 'veterinaria', 'Veterinaria', 'Torax', false, true, 1, true),
	('VET-TAC-ABDOMEN', 'TAC ABDOMEN', 'CDI', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-TAC-ABDOMEN-CONTRASTADO', 'TAC ABDOMEN CONTRASTADO', 'CDI', 'veterinaria', 'Veterinaria', 'Abdomen', true, true, 1, true),
	('VET-TAC-COLUMNA', 'TAC COLUMNA', 'CDI', 'veterinaria', 'Veterinaria', 'Columna', false, true, 1, true),
	('VET-TAC-COLUMNA-CONTRASTADA', 'TAC COLUMNA CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Columna', true, true, 1, true),
	('VET-TAC-CRANEO', 'TAC CRANEO', 'CDI', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-TAC-CRANEO-CONTRASTADO', 'TAC CRANEO CONTRASTADO', 'CDI', 'veterinaria', 'Veterinaria', 'Craneo', true, true, 1, true),
	('VET-TAC-EXTREMIDADES', 'TAC EXTREMIDADES', 'CDI', 'veterinaria', 'Veterinaria', 'Extremidades', false, true, 1, true),
	('VET-TAC-EXTREMIDADES-CONTRASTADO', 'TAC EXTREMIDADES CONTRASTADO', 'CDI', 'veterinaria', 'Veterinaria', 'Extremidades', true, true, 1, true),
	('VET-TAC-MANDIBULA', 'TAC MANDIBULA', 'CDI', 'veterinaria', 'Veterinaria', 'Mandibula', false, true, 1, true),
	('VET-TAC-MANDIBULA-CONTRASTADA', 'TAC MANDIBULA CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Mandibula', true, true, 1, true),
	('VET-TAC-PELVIS', 'TAC PELVIS', 'CDI', 'veterinaria', 'Veterinaria', 'Pelvis', false, true, 1, true),
	('VET-TAC-PELVIS-CONTRASTADA', 'TAC PELVIS CONTRASTADA', 'CDI', 'veterinaria', 'Veterinaria', 'Pelvis', true, true, 1, true),
	('VET-TAC-TORAX-CONTRASTADO', 'TAC TORAX CONTRASTADO', 'CDI', 'veterinaria', 'Veterinaria', 'Torax', true, true, 1, true),
	('VET-TAC-TORAX-SIMPLE', 'TAC TORAX SIMPLE', 'CDI', 'veterinaria', 'Veterinaria', 'Torax', false, true, 1, true),
	('VET-US-ABDOMEN-COMPLETO', 'US ABDOMEN COMPLETO', 'CDI', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-US-HIGADO', 'US HIGADO', 'CDI', 'veterinaria', 'Veterinaria', 'Higado', false, true, 1, true),
	('VET-US-PELVICO-UTERO-GESTACION', 'US PELVICO (UTERO GESTACION)', 'CDI', 'veterinaria', 'Veterinaria', 'Pelvico / utero gestacion', false, true, 1, true),
	('VET-US-PROSTATA-TESTICULOS', 'US PROSTATA Y TESTICULOS', 'CDI', 'veterinaria', 'Veterinaria', 'Prostata y testiculos', false, true, 1, true),
	('VET-US-UTERO-OVARIOS', 'US UTERO Y OVARIOS', 'CDI', 'veterinaria', 'Veterinaria', 'Utero y ovarios', false, true, 1, true)
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
