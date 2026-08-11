-- Las plantillas nuevas son organizacionales. Los roles publicadores pueden
-- administrar las privadas históricas, pero el visor únicamente consulta las compartidas.
create or replace function public.es_publicador_plantillas_radiologia()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
			and regexp_replace(
				translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu'),
				'[[:space:]]+',
				'_',
				'g'
			) in (
				'radiologo',
				'radiologo_director',
				'admin',
				'administrador',
				'desarrollador'
			)
	);
$$;

grant execute on function public.es_publicador_plantillas_radiologia() to authenticated;

create or replace function public.es_doctor_externo_radiologo_activo()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.doctores d
		where d.auth_uuid = auth.uid()
			and coalesce(d.activo, true) = true
			and d.es_radiologo = true
	);
$$;

grant execute on function public.es_doctor_externo_radiologo_activo() to authenticated;

drop policy if exists plantillas_radiologia_select_roles on public.plantillas_radiologia;
drop policy if exists plantillas_radiologia_insert_roles on public.plantillas_radiologia;
drop policy if exists plantillas_radiologia_update_roles on public.plantillas_radiologia;
drop policy if exists plantillas_radiologia_delete_roles on public.plantillas_radiologia;

create policy plantillas_radiologia_select_compartidas_o_publicadores
on public.plantillas_radiologia
for select
to authenticated
using (
	(
		visibilidad = 'organizacion'
		and (
			public.es_empleado_interno_activo()
			or public.es_radiologo_clinico_activo()
			or public.es_doctor_externo_radiologo_activo()
		)
	)
	or public.es_publicador_plantillas_radiologia()
);

create policy plantillas_radiologia_insert_publicadores
on public.plantillas_radiologia
for insert
to authenticated
with check (public.es_publicador_plantillas_radiologia());

create policy plantillas_radiologia_update_publicadores
on public.plantillas_radiologia
for update
to authenticated
using (public.es_publicador_plantillas_radiologia())
with check (public.es_publicador_plantillas_radiologia());

create policy plantillas_radiologia_delete_publicadores
on public.plantillas_radiologia
for delete
to authenticated
using (public.es_publicador_plantillas_radiologia());

drop policy if exists plantillas_radiologia_storage_select on storage.objects;
drop policy if exists plantillas_radiologia_storage_insert on storage.objects;
drop policy if exists plantillas_radiologia_storage_update on storage.objects;
drop policy if exists plantillas_radiologia_storage_delete on storage.objects;

create policy plantillas_radiologia_storage_select_compartidas_o_publicadores
on storage.objects
for select
to authenticated
using (
	bucket_id = 'plantillas-radiologia'
	and (
		public.es_publicador_plantillas_radiologia()
		or (
			(
				public.es_empleado_interno_activo()
				or public.es_radiologo_clinico_activo()
				or public.es_doctor_externo_radiologo_activo()
			)
			and exists (
				select 1
				from public.plantillas_radiologia p
				where p.archivo_path = storage.objects.name
					and p.visibilidad = 'organizacion'
			)
		)
	)
);

create policy plantillas_radiologia_storage_insert_publicadores
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'plantillas-radiologia'
	and public.es_publicador_plantillas_radiologia()
);

create policy plantillas_radiologia_storage_update_publicadores
on storage.objects
for update
to authenticated
using (
	bucket_id = 'plantillas-radiologia'
	and public.es_publicador_plantillas_radiologia()
)
with check (
	bucket_id = 'plantillas-radiologia'
	and public.es_publicador_plantillas_radiologia()
);

create policy plantillas_radiologia_storage_delete_publicadores
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'plantillas-radiologia'
	and public.es_publicador_plantillas_radiologia()
);

notify pgrst, 'reload schema';
