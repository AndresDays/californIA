alter table public.doctores
add column if not exists tipo_doctor text not null default 'particular',
add column if not exists institucion text,
add column if not exists auth_uuid uuid references auth.users(id) on delete set null,
add column if not exists activo boolean not null default true;

alter table public.doctores
alter column tipo_doctor set default 'particular';

alter table public.empleados
add column if not exists id_doctor integer references public.doctores(id_doctor) on delete set null;

alter table public.estudios_radiologia
add column if not exists id_doctor integer references public.doctores(id_doctor) on delete set null;

create index if not exists idx_doctores_auth_uuid
on public.doctores (auth_uuid)
where auth_uuid is not null;

create index if not exists idx_doctores_tipo_doctor
on public.doctores (tipo_doctor);

create index if not exists idx_empleados_id_doctor
on public.empleados (id_doctor)
where id_doctor is not null;

create index if not exists idx_estudios_radiologia_id_doctor
on public.estudios_radiologia (id_doctor)
where id_doctor is not null;

do $$
begin
	if not exists (
		select 1
		from information_schema.table_constraints
		where constraint_schema = 'public'
			and table_name = 'doctores'
			and constraint_name = 'doctores_tipo_doctor_check'
	) then
		alter table public.doctores
		add constraint doctores_tipo_doctor_check
		check (tipo_doctor in ('interno', 'particular', 'institucion'));
	end if;
end $$;

notify pgrst, 'reload schema';
