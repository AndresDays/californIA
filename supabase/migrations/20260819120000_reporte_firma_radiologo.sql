-- El reporte lo firma quien lo interpreta: al guardar desde el visor se sella
-- el estudio con el empleado que hizo la interpretación, para que el visor del
-- paciente y el PDF muestren su firma, especialidad y cédula.

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
declare
	v_id_empleado integer;
begin
	if not public.es_radiologo_clinico_activo() then
		raise exception 'No autorizado para interpretar estudios';
	end if;

	if p_id_estudio is null or p_estado not in ('EN PROCESO', 'COMPLETADO') then
		raise exception 'Actualización clínica inválida';
	end if;

	select id_empleado into v_id_empleado
	from public.empleados
	where auth_uuid = auth.uid()
	limit 1;

	update public.estudios_radiologia
	set reporte = coalesce(p_reporte, ''),
		reporte_encabezado = coalesce(p_reporte_encabezado, '{}'::jsonb),
		estado = p_estado,
		id_radiologo = coalesce(v_id_empleado, id_radiologo),
		updated_at = now()
	where id_estudio = p_id_estudio;

	if not found then
		raise exception 'Estudio no encontrado';
	end if;
end;
$$;

grant execute on function public.actualizar_reporte_radiologo_clinico(integer, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
