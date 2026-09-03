-- Los avisos de cancelación ya emitidos se marcan como tales.
--
-- La migración anterior cambió la entidad del aviso a `venta_cancelada` para que
-- la campana supiera cuál abre el detalle de la orden, pero dejó los avisos ya
-- entregados con `venta`. La idea era no reescribir algo que ya estaba en la
-- bandeja de alguien; en la práctica el efecto fue que esos avisos -que son los
-- que la gente tiene a la vista- siguen llevando a Editar solicitud, que es
-- justo la pantalla donde la orden cancelada no aparece.
--
-- Se corrigen. Lo que se toca es una etiqueta interna que decide a dónde lleva
-- el clic: el título, el mensaje y el estado de leído se quedan igual, así que
-- para quien mira la campana no cambia nada salvo que el aviso por fin abre lo
-- que tiene que abrir.
--
-- El filtro es estrecho a propósito. `entidad_tipo = 'venta'` lo comparten los
-- avisos de captura y de venta nueva, así que además se exige el título que
-- escribe el disparador y que haya una venta a la que apuntar: sin id no habría
-- detalle que abrir y el aviso quedaría peor que antes, con el clic sin hacer
-- nada.

do $$
declare
	v_corregidos integer;
begin
	update public.notificaciones
	set entidad_tipo = 'venta_cancelada'
	where entidad_tipo = 'venta'
		and coalesce(id_venta, entidad_id) is not null
		and titulo ilike 'Solicitud cancelada%';

	get diagnostics v_corregidos = row_count;
	raise notice 'Avisos de cancelacion corregidos: %', v_corregidos;
end
$$;

NOTIFY pgrst, 'reload schema';
