alter table public.citas
add column if not exists whatsapp_recordatorio_enviado_at timestamptz,
add column if not exists whatsapp_confirmacion_estado text default 'pendiente',
add column if not exists whatsapp_confirmacion_respuesta text,
add column if not exists whatsapp_confirmacion_at timestamptz;

create index if not exists idx_citas_whatsapp_recordatorio
on public.citas (fecha_estudio, whatsapp_recordatorio_enviado_at)
where whatsapp_recordatorio_enviado_at is null;

do $$
begin
	if not exists (
		select 1
		from information_schema.table_constraints
		where constraint_schema = 'public'
			and table_name = 'citas'
			and constraint_name = 'citas_whatsapp_confirmacion_estado_check'
	) then
		alter table public.citas
		add constraint citas_whatsapp_confirmacion_estado_check
		check (whatsapp_confirmacion_estado in ('pendiente', 'confirmada', 'cancelada', 'sin_telefono', 'error_envio'));
	end if;
end $$;

notify pgrst, 'reload schema';
