alter table public.estudios_radiologia
	add column if not exists reporte_encabezado jsonb not null default '{}'::jsonb;

drop function if exists public.actualizar_reporte_radiologo_clinico(integer, text, text);

create or replace function public.actualizar_reporte_radiologo_clinico(
	p_id_estudio integer,
	p_reporte text,
	p_estado text default 'COMPLETADO',
	p_reporte_encabezado jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if not public.es_radiologo_clinico_activo() then
		raise exception 'No autorizado para interpretar estudios';
	end if;

	if p_id_estudio is null or p_estado not in ('EN PROCESO', 'COMPLETADO') then
		raise exception 'Actualización clínica inválida';
	end if;

	update public.estudios_radiologia
	set reporte = coalesce(p_reporte, ''),
		reporte_encabezado = coalesce(p_reporte_encabezado, '{}'::jsonb),
		estado = p_estado,
		updated_at = now()
	where id_estudio = p_id_estudio;

	if not found then
		raise exception 'Estudio no encontrado';
	end if;
end;
$$;

grant execute on function public.actualizar_reporte_radiologo_clinico(integer, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
