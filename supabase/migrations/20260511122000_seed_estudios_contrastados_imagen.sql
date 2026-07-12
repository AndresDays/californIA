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
	('EC-ARTERIOGRAFIA-FEMORAL-BILATERAL', 'ARTERIOGRAFIA FEMORAL BILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Femoral bilateral', true, true, 1, true),
	('EC-ARTERIOGRAFIA-FEMORAL-UNILATERAL', 'ARTERIOGRAFIA FEMORAL UNILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Femoral unilateral', true, true, 1, true),
	('EC-COLANGIOGRAFIA-SONDA-T', 'COLANGIOGRAFIA POR SONDA EN T', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Via biliar', true, true, 1, true),
	('EC-COLON-ENEMA-DOBLE-CONTRASTE', 'COLON POR ENEMA DOBLE CONTRASTE', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Colon', true, true, 1, true),
	('EC-COLON-ENEMA-COLOSTOMIA', 'COLON POR ENEMA POR COLOSTOMIA', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Colon', true, true, 1, true),
	('EC-FISTULOGRAFIA-AP-LATERAL-OBLICUAS', 'FISTULOGRAFIA (AP, LATERAL Y OBLICUAS)', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Fistula', true, true, 1, true),
	('EC-FLEBOGRAFIA-BILATERAL', 'FLEBOGRAFIA BILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Venoso bilateral', true, true, 1, true),
	('EC-FLEBOGRAFIA-UNILATERAL', 'FLEBOGRAFIA UNILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Venoso unilateral', true, true, 1, true),
	('EC-HISTEROSALPINGOSGRAFIA', 'HISTEROSALPINGOSGRAFIA', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Utero y trompas', true, true, 1, true),
	('EC-SERIE-EGD-HIDROSOLUBLE', 'SERIE EGD HIDROSOLUBLE', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Esofago gastroduodenal', true, true, 1, true),
	('EC-SERIE-EGD', 'SERIE ESOFAGO GASTRODUODENAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Esofago gastroduodenal', true, true, 1, true),
	('EC-SERIE-GASTRODUODENAL-BEBES-MENORES-1', 'SERIE GASTRODUODENAL BEBES MENORES 1', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Gastroduodenal', true, true, 1, true),
	('EC-SERIE-GASTRODUODENAL-CONTRASTE-HIDROSOLUBLE', 'SERIE GASTRODUODENAL/CONTRASTE HIDROSOLUBLE', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Gastroduodenal', true, true, 1, true),
	('EC-SIALOGRAFIA-BILATERAL', 'SIALOGRAFIA BILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Glandulas salivales bilateral', true, true, 1, true),
	('EC-SIALOGRAFIA-UNILATERAL', 'SIALOGRAFIA UNILATERAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Glandulas salivales unilateral', true, true, 1, true),
	('EC-TRANSITO-INTESTINAL', 'TRANSITO INTESTINAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Intestino', true, true, 1, true),
	('EC-URETROCISTOGRAMA-RETROGRADA-MICCIONAL', 'URETROCISTOGRAMA RETROGRADA Y MICCIONAL', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Uretra y vejiga', true, true, 1, true),
	('EC-UROGRAFIA-EXCRETORA', 'UROGRAFIA EXCRETORA', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Sistema urinario', true, true, 1, true),
	('EC-UROGRAFIA-EXCRETORA-MAXWELL-ARATA', 'UROGRAFIA EXCRETORA (MAXWELL O ARATA)', 'CDI', 'estudios_contrastados', 'Estudios contrastados', 'Sistema urinario', true, true, 1, true)
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
