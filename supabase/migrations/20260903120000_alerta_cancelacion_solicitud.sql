-- Aviso a dirección cuando se cancela una solicitud.
--
-- Cancelar una orden mueve dinero y borra trabajo, y hasta ahora sólo quedaba
-- registrado en la auditoría: para enterarse había que ir a buscarlo. Ahora
-- cada cancelación avisa sola a administración, dirección y desarrollo, por la
-- campana de la aplicación y por correo.
--
-- El aviso se dispara desde la base, no desde la pantalla, por dos razones. La
-- primera es que si el navegador se queda sin red justo después de cancelar, el
-- aviso se perdería sin que nadie lo supiera. La segunda es que hoy sólo se
-- cancela desde Editar solicitud, pero cualquier pantalla futura que ponga el
-- estado en `cancelado` queda cubierta sin acordarse de avisar.
--
-- El correo no se manda desde aquí: el disparador deja el mensaje ya redactado
-- en `notificaciones_correo` y una función de borde lo recoge y lo envía. Esa
-- tabla intermedia es lo que hace que un fallo del proveedor no pierda el
-- aviso: el renglón se queda pendiente y se reintenta. Además el texto se
-- redacta en un solo lugar -aquí-, así que el correo y la campana nunca dicen
-- cosas distintas.

-- ── La bandeja de salida del correo ──────────────────────────────────────
create table if not exists public.notificaciones_correo (
	id bigint generated always as identity primary key,
	id_notificacion bigint references public.notificaciones (id) on delete cascade,
	destinatario text not null,
	nombre_destinatario text,
	asunto text not null,
	cuerpo_texto text not null,
	cuerpo_html text not null,
	estado text not null default 'pendiente',
	intentos integer not null default 0,
	error text,
	enviado_at timestamptz,
	created_at timestamptz not null default now(),
	constraint notificaciones_correo_estado_check
		check (estado in ('pendiente', 'enviado', 'error'))
);

comment on table public.notificaciones_correo is 'Bandeja de salida de los avisos por correo. La función de borde la vacía; un renglón pendiente es un correo que todavía no sale.';
comment on column public.notificaciones_correo.intentos is 'Envíos fallidos acumulados. La función de borde deja de reintentar a partir de cierto número para no golpear al proveedor eternamente.';

-- El índice es el que usa la función de borde en cada corrida: los pendientes
-- más viejos primero.
create index if not exists idx_notificaciones_correo_pendientes
	on public.notificaciones_correo (created_at)
	where estado = 'pendiente';

-- Nadie de la aplicación tiene por qué leer ni escribir esta tabla: lleva
-- direcciones de correo del personal y la maneja sólo la función de borde con
-- la llave de servicio. Con RLS encendida y sin políticas, `authenticated` no
-- ve nada; `service_role` se salta RLS por definición.
alter table public.notificaciones_correo enable row level security;

-- ── Quién recibe el aviso ────────────────────────────────────────────────
-- Los mismos roles que ya autorizan comisiones. Ojo con un detalle que no es
-- obvio: `radiologo` es el "Radiólogo - Director" -así lo normaliza
-- normalizarRolUsuario en el front, y así lo etiqueta la interfaz-, mientras
-- que el radiólogo de a pie se guarda como `radiologo_clinico`. Por eso la
-- lista incluye `radiologo` sin que eso alcance a los radiólogos que no son
-- directores.
create or replace function public.destinatarios_alerta_direccion()
returns table (auth_uuid uuid, nombre text, email text)
language sql
stable
security definer
set search_path = public
as $$
	select e.auth_uuid, e.nombre::text, nullif(btrim(e.email), '')::text
	from public.empleados e
	where coalesce(e.activo, true) = true
		and e.auth_uuid is not null
		and regexp_replace(
			translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu'),
			'[[:space:]]+',
			'_',
			'g'
		) in (
			'admin',
			'administrador',
			'desarrollador',
			'radiologo',
			'radiologo_director'
		);
$$;

-- ── El disparador ────────────────────────────────────────────────────────
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
			'venta', new.id_venta, new.id_venta, '/editar-solicitud'
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

drop trigger if exists ventas_avisar_cancelacion on public.ventas;

create trigger ventas_avisar_cancelacion
	after update on public.ventas
	for each row
	when (
		new.estado is distinct from old.estado
		and lower(coalesce(new.estado, '')) = 'cancelado'
	)
	execute function public.avisar_solicitud_cancelada();

NOTIFY pgrst, 'reload schema';
