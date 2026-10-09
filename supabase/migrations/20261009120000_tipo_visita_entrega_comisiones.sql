-- La visitadora también sale a entregar comisiones a los médicos y no había
-- tipo de visita para registrarlo. El informe (visitas_medicas) no restringe
-- el tipo; la agenda sí, así que se amplía su lista.
alter table public.agenda_visitas
	drop constraint if exists agenda_visitas_tipo_visita_check;

alter table public.agenda_visitas
	add constraint agenda_visitas_tipo_visita_check
	check (tipo_visita in (
		'seguimiento', 'prospeccion', 'entrega_ordenes', 'entrega_comisiones',
		'reactivacion_convenio', 'presentacion_servicios', 'cobranza', 'otro'
	));
