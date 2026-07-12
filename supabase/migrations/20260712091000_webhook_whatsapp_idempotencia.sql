alter table public.citas
	add column if not exists whatsapp_recordatorio_sid text,
	add column if not exists whatsapp_respuesta_sid text;

create unique index if not exists uq_citas_whatsapp_respuesta_sid
on public.citas (whatsapp_respuesta_sid)
where whatsapp_respuesta_sid is not null;
