alter table public.doctores
add column if not exists auth_uuid uuid references auth.users(id) on delete set null,
add column if not exists activo boolean not null default true;

alter table public.estudios_radiologia
add column if not exists id_doctor integer references public.doctores(id_doctor) on delete set null;

create index if not exists idx_doctores_auth_uuid
on public.doctores (auth_uuid)
where auth_uuid is not null;

create index if not exists idx_estudios_radiologia_id_doctor
on public.estudios_radiologia (id_doctor)
where id_doctor is not null;

do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'doctores'
			and policyname = 'doctores_select_perfil_propio'
	) then
		create policy doctores_select_perfil_propio
		on public.doctores
		for select
		to authenticated
		using (auth_uuid = auth.uid());
	end if;

	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'estudios_radiologia'
			and policyname = 'estudios_radiologia_select_doctor_externo'
	) then
		create policy estudios_radiologia_select_doctor_externo
		on public.estudios_radiologia
		for select
		to authenticated
		using (
			exists (
				select 1
				from public.doctores d
				where d.id_doctor = estudios_radiologia.id_doctor
					and d.auth_uuid = auth.uid()
					and coalesce(d.activo, true) is true
			)
		);
	end if;
end $$;

notify pgrst, 'reload schema';
