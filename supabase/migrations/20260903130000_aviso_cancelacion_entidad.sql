-- El aviso de cancelación se marca como tal.
--
-- La campana ahora abre el detalle de la orden cancelada en un modal en vez de
-- llevar a Editar solicitud, que sólo lista órdenes activas: la orden cancelada
-- no aparecía ahí, así que el clic dejaba a quien recibía el aviso mirando una
-- lista sin lo que venía a ver.
--
-- Para saber qué aviso abre ese modal hace falta distinguirlo, y `entidad_tipo`
-- decía `venta`, que es lo que ya usan los avisos de captura y de venta nueva.
-- Pasa a `venta_cancelada`, que es sólo de estos.
--
-- Se rehace la función completa porque `create or replace` no admite parches: el
-- resto del cuerpo es idéntico al de 20260903120000. `action_path` se conserva
-- como respaldo: si un aviso llegara sin id de venta, el clic sigue llevando a
-- alguna parte en vez de no hacer nada.
--
-- Los avisos ya emitidos se quedan con `venta`. No se tocan a propósito: son un
-- puñado, ya están leídos, y reescribir avisos entregados para que cambien de
-- comportamiento al abrirlos es peor que dejarlos llevando a la pantalla de
-- siempre.

create or replace function public.avisar_solicitud_cancelada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_actor uuid := auth.uid();
	v_quien text;
	v_paciente text;
	v_motivo text;
	v_total text;
	v_cuando text;
	v_titulo text;
	v_mensaje text;
	v_asunto text;
	v_texto text;
	v_html text;
	v_destinatario record;
	v_id_notificacion bigint;
begin
	select coalesce(nullif(btrim(e.nombre), ''), 'un usuario')
	into v_quien
	from public.empleados e
	where e.auth_uuid = v_actor
	limit 1;
	v_quien := coalesce(v_quien, 'un usuario');

	select coalesce(nullif(btrim(p.nombre), ''), 'Sin paciente')
	into v_paciente
	from public.pacientes p
	where p.id_paciente = new.id_paciente;
	v_paciente := coalesce(v_paciente, 'Sin paciente');

	v_motivo := coalesce(nullif(btrim(new.motivo_cancelacion), ''), 'Sin motivo capturado');
	v_total := to_char(coalesce(new.total, 0), 'FM999G999G990D00');
	v_cuando := to_char(
		coalesce(new.cancelada_en, now()) at time zone 'America/Mexico_City',
		'DD/MM/YYYY HH24:MI'
	);

	v_titulo := 'Solicitud cancelada · ' || coalesce(new.folio, 's/folio');
	v_mensaje := v_paciente || ' — ' || v_motivo || ' (canceló ' || v_quien || ')';

	v_asunto := 'Solicitud cancelada ' || coalesce(new.folio, 's/folio') || ' — ' || v_paciente;
	v_texto :=
		'Se canceló una solicitud.' || chr(10) || chr(10) ||
		'Folio: ' || coalesce(new.folio, 's/folio') || chr(10) ||
		'Paciente: ' || v_paciente || chr(10) ||
		'Motivo: ' || v_motivo || chr(10) ||
		'Total de la orden: $' || v_total || chr(10) ||
		'Canceló: ' || v_quien || chr(10) ||
		'Fecha: ' || v_cuando || chr(10) || chr(10) ||
		'Este aviso es automático. El detalle completo queda en la auditoría de la orden.';

	-- El correo va con las partes escapadas: el motivo lo escribe una persona a
	-- mano y un `<` suelto rompería el cuerpo del mensaje.
	v_html :=
		'<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#12293d;line-height:1.55">' ||
		'<h2 style="margin:0 0 4px;font-size:18px">Solicitud cancelada</h2>' ||
		'<p style="margin:0 0 16px;color:#5a7186;font-size:14px">Centro Diagnóstico California</p>' ||
		'<table cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse">' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Folio</td><td style="padding:4px 0"><strong>' || replace(replace(coalesce(new.folio, 's/folio'), '&', '&amp;'), '<', '&lt;') || '</strong></td></tr>' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Paciente</td><td style="padding:4px 0">' || replace(replace(v_paciente, '&', '&amp;'), '<', '&lt;') || '</td></tr>' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Motivo</td><td style="padding:4px 0">' || replace(replace(v_motivo, '&', '&amp;'), '<', '&lt;') || '</td></tr>' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Total</td><td style="padding:4px 0">$' || v_total || '</td></tr>' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Canceló</td><td style="padding:4px 0">' || replace(replace(v_quien, '&', '&amp;'), '<', '&lt;') || '</td></tr>' ||
		'<tr><td style="padding:4px 16px 4px 0;color:#5a7186">Fecha</td><td style="padding:4px 0">' || v_cuando || '</td></tr>' ||
		'</table>' ||
		'<p style="margin:20px 0 0;color:#5a7186;font-size:12px">Aviso automático. El detalle completo queda en la auditoría de la orden.</p>' ||
		'</div>';

	for v_destinatario in select * from public.destinatarios_alerta_direccion() loop
		-- Quien canceló no se avisa a sí mismo: acaba de hacerlo y ya lo sabe.
		continue when v_actor is not null and v_destinatario.auth_uuid = v_actor;

		-- Un renglón por persona en vez de uno solo para el grupo: así el
		-- `read_at` de la campana es de cada quien, y que administración lo lea
		-- no le apaga el aviso a dirección.
		insert into public.notificaciones (
			titulo, mensaje, tipo, canal_destino, usuario_destino,
			entidad_tipo, entidad_id, id_venta, action_path
		)
		values (
			v_titulo, v_mensaje, 'advertencia', 'usuario', v_destinatario.auth_uuid,
			'venta_cancelada', new.id_venta, new.id_venta, '/editar-solicitud'
		)
		returning id into v_id_notificacion;

		if v_destinatario.email is not null then
			insert into public.notificaciones_correo (
				id_notificacion, destinatario, nombre_destinatario,
				asunto, cuerpo_texto, cuerpo_html
			)
			values (
				v_id_notificacion, v_destinatario.email, v_destinatario.nombre,
				v_asunto, v_texto, v_html
			);
		end if;
	end loop;

	return new;
end;
$$;

NOTIFY pgrst, 'reload schema';
