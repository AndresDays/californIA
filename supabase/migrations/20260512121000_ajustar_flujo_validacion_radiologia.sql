update public.estudios_radiologia
set
	listo_entrega = false,
	updated_at = now()
where estado = 'COMPLETADO'
	and listo_entrega = true;

update public.estudios_venta ev
set
	estado_captura = 'completado',
	estado_validacion = 'guardado',
	updated_at = now()
from public.estudios_radiologia er
where er.id_estudio_venta = ev.id_estudio_venta
	and er.estado = 'COMPLETADO'
	and er.listo_entrega = false;
