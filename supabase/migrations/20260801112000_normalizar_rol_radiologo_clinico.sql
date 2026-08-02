-- La UI acepta el rol con acentos; RLS debe reconocer la misma normalización.
create or replace function public.es_radiologo_clinico_activo()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) is true
			and translate(
				lower(replace(trim(coalesce(e.rol, '')), ' ', '_')),
				'áéíóúü',
				'aeiouu'
			) = 'radiologo_clinico'
	);
$$;

create or replace function public.es_empleado_interno_activo()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) is true
			and translate(
				lower(replace(trim(coalesce(e.rol, '')), ' ', '_')),
				'áéíóúü',
				'aeiouu'
			) <> 'radiologo_clinico'
	);
$$;

notify pgrst, 'reload schema';
