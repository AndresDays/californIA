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
	('VET-RM-CERVICAL-CONTRASTADA', 'RM CERVICAL CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Cervical', true, true, 1, true),
	('VET-RM-CERVICAL-SIMPLE', 'RM CERVICAL SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Cervical', false, true, 1, true),
	('VET-RM-CRANEO-CONTRASTADA', 'RM CRANEO CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Craneo', true, true, 1, true),
	('VET-RM-CRANEO-SIMPLE', 'RM CRANEO SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-RM-DORSAL-SIMPLE', 'RM DORSAL SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Dorsal', false, true, 1, true),
	('VET-RM-LUMBAR-SIMPLE', 'RM LUMBAR SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Lumbar', false, true, 1, true),
	('VET-RM-LUMBOSACRA-CONTRASTADA', 'RM LUMBOSACRA CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Lumbosacra', true, true, 1, true),
	('VET-RM-RODILLA-SIMPLE', 'RM RODILLA SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Rodilla', false, true, 1, true),
	('VET-RM-TORACOABDOMINAL-CONTRASTADA', 'RM TORACOABDOMINAL CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Toracoabdominal', true, true, 1, true),
	('VET-RM-TORACOLUMBAR-CONTRASTADA', 'RM TORACOLUMBAR CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Toracolumbar', true, true, 1, true),
	('VET-RM-TORACOLUMBAR-SIMPLE', 'RM TORACOLUMBAR SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Toracolumbar', false, true, 1, true),
	('VET-RX-ABDOMEN', 'RX ABDOMEN', 'CDC', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-RX-COLUMNA', 'RX COLUMNA', 'CDC', 'veterinaria', 'Veterinaria', 'Columna', false, true, 1, true),
	('VET-RX-CRANEO', 'RX CRANEO', 'CDC', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-RX-EXTREMIDADES', 'RX EXTREMIDADES', 'CDC', 'veterinaria', 'Veterinaria', 'Extremidades', false, true, 1, true),
	('VET-RX-MANDIBULA', 'RX MANDIBULA', 'CDC', 'veterinaria', 'Veterinaria', 'Mandibula', false, true, 1, true),
	('VET-RX-PELVIS', 'RX PELVIS', 'CDC', 'veterinaria', 'Veterinaria', 'Pelvis', false, true, 1, true),
	('VET-RX-TORAX', 'RX TORAX', 'CDC', 'veterinaria', 'Veterinaria', 'Torax', false, true, 1, true),
	('VET-TAC-ABDOMEN', 'TAC ABDOMEN', 'CDC', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-TAC-ABDOMEN-CONTRASTADO', 'TAC ABDOMEN CONTRASTADO', 'CDC', 'veterinaria', 'Veterinaria', 'Abdomen', true, true, 1, true),
	('VET-TAC-COLUMNA', 'TAC COLUMNA', 'CDC', 'veterinaria', 'Veterinaria', 'Columna', false, true, 1, true),
	('VET-TAC-COLUMNA-CONTRASTADA', 'TAC COLUMNA CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Columna', true, true, 1, true),
	('VET-TAC-CRANEO', 'TAC CRANEO', 'CDC', 'veterinaria', 'Veterinaria', 'Craneo', false, true, 1, true),
	('VET-TAC-CRANEO-CONTRASTADO', 'TAC CRANEO CONTRASTADO', 'CDC', 'veterinaria', 'Veterinaria', 'Craneo', true, true, 1, true),
	('VET-TAC-EXTREMIDADES', 'TAC EXTREMIDADES', 'CDC', 'veterinaria', 'Veterinaria', 'Extremidades', false, true, 1, true),
	('VET-TAC-EXTREMIDADES-CONTRASTADO', 'TAC EXTREMIDADES CONTRASTADO', 'CDC', 'veterinaria', 'Veterinaria', 'Extremidades', true, true, 1, true),
	('VET-TAC-MANDIBULA', 'TAC MANDIBULA', 'CDC', 'veterinaria', 'Veterinaria', 'Mandibula', false, true, 1, true),
	('VET-TAC-MANDIBULA-CONTRASTADA', 'TAC MANDIBULA CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Mandibula', true, true, 1, true),
	('VET-TAC-PELVIS', 'TAC PELVIS', 'CDC', 'veterinaria', 'Veterinaria', 'Pelvis', false, true, 1, true),
	('VET-TAC-PELVIS-CONTRASTADA', 'TAC PELVIS CONTRASTADA', 'CDC', 'veterinaria', 'Veterinaria', 'Pelvis', true, true, 1, true),
	('VET-TAC-TORAX-CONTRASTADO', 'TAC TORAX CONTRASTADO', 'CDC', 'veterinaria', 'Veterinaria', 'Torax', true, true, 1, true),
	('VET-TAC-TORAX-SIMPLE', 'TAC TORAX SIMPLE', 'CDC', 'veterinaria', 'Veterinaria', 'Torax', false, true, 1, true),
	('VET-US-ABDOMEN-COMPLETO', 'US ABDOMEN COMPLETO', 'CDC', 'veterinaria', 'Veterinaria', 'Abdomen', false, true, 1, true),
	('VET-US-HIGADO', 'US HIGADO', 'CDC', 'veterinaria', 'Veterinaria', 'Higado', false, true, 1, true),
	('VET-US-PELVICO-UTERO-GESTACION', 'US PELVICO (UTERO GESTACION)', 'CDC', 'veterinaria', 'Veterinaria', 'Pelvico / utero gestacion', false, true, 1, true),
	('VET-US-PROSTATA-TESTICULOS', 'US PROSTATA Y TESTICULOS', 'CDC', 'veterinaria', 'Veterinaria', 'Prostata y testiculos', false, true, 1, true),
	('VET-US-UTERO-OVARIOS', 'US UTERO Y OVARIOS', 'CDC', 'veterinaria', 'Veterinaria', 'Utero y ovarios', false, true, 1, true)
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
