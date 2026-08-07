create table if not exists public.resultados_cultivo_adjuntos (
	id uuid primary key default gen_random_uuid(),
	id_estudio_venta integer not null unique references public.estudios_venta(id_estudio_venta) on delete cascade,
	nombre_archivo text not null,
	archivo_path text not null,
	mime_type text not null check (mime_type = 'application/pdf'),
	size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 25 * 1024 * 1024),
	creado_por uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.resultados_cultivo_adjuntos
	drop column if exists archivo_url;

do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conname = 'resultados_cultivo_adjuntos_archivo_path_check'
			and conrelid = 'public.resultados_cultivo_adjuntos'::regclass
	) then
		alter table public.resultados_cultivo_adjuntos
			add constraint resultados_cultivo_adjuntos_archivo_path_check
			check (archivo_path = id_estudio_venta::text || '/cultivo.pdf');
	end if;

end;
$$;

create or replace function public.es_usuario_resultados_cultivo_activo()
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
			) in ('quimico', 'tecnico', 'administrador', 'admin', 'desarrollador')
	);
$$;

grant execute on function public.es_usuario_resultados_cultivo_activo() to authenticated;

create or replace function public.resultados_cultivo_adjuntos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists resultados_cultivo_adjuntos_updated_at on public.resultados_cultivo_adjuntos;
create trigger resultados_cultivo_adjuntos_updated_at
before update on public.resultados_cultivo_adjuntos
for each row
execute function public.resultados_cultivo_adjuntos_set_updated_at();

alter table public.resultados_cultivo_adjuntos enable row level security;

drop policy if exists resultados_cultivo_adjuntos_select_roles on public.resultados_cultivo_adjuntos;
create policy resultados_cultivo_adjuntos_select_roles
on public.resultados_cultivo_adjuntos
for select to authenticated
using (
	public.es_usuario_resultados_cultivo_activo()
	and exists (
		select 1 from public.estudios_venta ev
		where ev.id_estudio_venta = resultados_cultivo_adjuntos.id_estudio_venta
			and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
	)
);

drop policy if exists resultados_cultivo_adjuntos_insert_roles on public.resultados_cultivo_adjuntos;
create policy resultados_cultivo_adjuntos_insert_roles
on public.resultados_cultivo_adjuntos
for insert to authenticated
with check (
	public.es_usuario_resultados_cultivo_activo()
	and exists (
		select 1 from public.estudios_venta ev
		where ev.id_estudio_venta = resultados_cultivo_adjuntos.id_estudio_venta
			and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
	)
);

drop policy if exists resultados_cultivo_adjuntos_update_roles on public.resultados_cultivo_adjuntos;
create policy resultados_cultivo_adjuntos_update_roles
on public.resultados_cultivo_adjuntos
for update to authenticated
using (
	public.es_usuario_resultados_cultivo_activo()
	and exists (
		select 1 from public.estudios_venta ev
		where ev.id_estudio_venta = resultados_cultivo_adjuntos.id_estudio_venta
			and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
	)
)
with check (
	public.es_usuario_resultados_cultivo_activo()
	and exists (
		select 1 from public.estudios_venta ev
		where ev.id_estudio_venta = resultados_cultivo_adjuntos.id_estudio_venta
			and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
	)
);

drop policy if exists resultados_cultivo_adjuntos_delete_roles on public.resultados_cultivo_adjuntos;
create policy resultados_cultivo_adjuntos_delete_roles
on public.resultados_cultivo_adjuntos
for delete to authenticated
using (
	public.es_usuario_resultados_cultivo_activo()
	and exists (
		select 1 from public.estudios_venta ev
		where ev.id_estudio_venta = resultados_cultivo_adjuntos.id_estudio_venta
			and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
	)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'resultados-cultivo-adjuntos',
	'resultados-cultivo-adjuntos',
	true,
	25 * 1024 * 1024,
	array['application/pdf']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists resultados_cultivo_adjuntos_storage_select on storage.objects;
create policy resultados_cultivo_adjuntos_storage_select
on storage.objects
for select to authenticated
	using (
		bucket_id = 'resultados-cultivo-adjuntos'
		and public.es_usuario_resultados_cultivo_activo()
		and exists (
			select 1 from public.estudios_venta ev
			where ev.id_estudio_venta::text || '/cultivo.pdf' = storage.objects.name
				and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
		)
	);

drop policy if exists resultados_cultivo_adjuntos_storage_insert on storage.objects;
create policy resultados_cultivo_adjuntos_storage_insert
on storage.objects
for insert to authenticated
	with check (
		bucket_id = 'resultados-cultivo-adjuntos'
		and public.es_usuario_resultados_cultivo_activo()
		and exists (
			select 1 from public.estudios_venta ev
			where ev.id_estudio_venta::text || '/cultivo.pdf' = storage.objects.name
				and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
		)
	);

drop policy if exists resultados_cultivo_adjuntos_storage_update on storage.objects;
create policy resultados_cultivo_adjuntos_storage_update
on storage.objects
for update to authenticated
	using (
		bucket_id = 'resultados-cultivo-adjuntos'
		and public.es_usuario_resultados_cultivo_activo()
		and exists (
			select 1 from public.estudios_venta ev
			where ev.id_estudio_venta::text || '/cultivo.pdf' = storage.objects.name
				and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
		)
	)
	with check (
		bucket_id = 'resultados-cultivo-adjuntos'
		and public.es_usuario_resultados_cultivo_activo()
		and exists (
			select 1 from public.estudios_venta ev
			where ev.id_estudio_venta::text || '/cultivo.pdf' = storage.objects.name
				and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
		)
	);

drop policy if exists resultados_cultivo_adjuntos_storage_delete on storage.objects;
create policy resultados_cultivo_adjuntos_storage_delete
on storage.objects
for delete to authenticated
	using (
		bucket_id = 'resultados-cultivo-adjuntos'
		and public.es_usuario_resultados_cultivo_activo()
		and exists (
			select 1 from public.estudios_venta ev
			where ev.id_estudio_venta::text || '/cultivo.pdf' = storage.objects.name
				and lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
		)
	);

create or replace function public.buscar_resultados_portal(
	p_folio text,
	p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_venta record;
	v_telefono text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
	v_saldo numeric := 0;
	v_laboratorio jsonb := '[]'::jsonb;
	v_radiologia jsonb := '[]'::jsonb;
begin
	select
		v.id_venta,
		v.folio,
		v.fecha_venta,
		coalesce(v.total, 0) as total,
		coalesce(v.pago_recibido, 0) as pago_recibido,
		p.id_paciente,
		p.nombre as paciente_nombre,
		p.fecha_nacimiento,
		p.sexo,
		p.telefono,
		p.email,
		c.nombre as cliente_nombre
	into v_venta
	from public.ventas v
	join public.pacientes p on p.id_paciente = v.id_paciente
	left join public.clientes c on c.id_cliente = v.id_cliente
	where v.estado = 'activo'
		and v.folio = btrim(coalesce(p_folio, ''))
		and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') = v_telefono
	limit 1;

	if v_venta.id_venta is null then
		return jsonb_build_object(
			'encontrado', false,
			'mensaje', 'No encontramos resultados con ese folio y telefono.'
		);
	end if;

	v_saldo := greatest(coalesce(v_venta.total, 0) - coalesce(v_venta.pago_recibido, 0), 0);
	if v_saldo > 0 then
		return jsonb_build_object(
			'encontrado', true,
			'autorizado', false,
			'mensaje', 'La solicitud tiene adeudo pendiente. Favor de pasar a recepcion.',
			'saldo', v_saldo,
			'venta', jsonb_build_object(
				'id_venta', v_venta.id_venta,
				'folio', v_venta.folio,
				'fecha_venta', v_venta.fecha_venta,
				'paciente', v_venta.paciente_nombre,
				'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
			)
		);
	end if;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_laboratorio
	from (
		select jsonb_build_object(
			'id', ev.id_estudio_venta,
			'tipo', 'laboratorio',
			'clave', ev.clave_estudio,
			'descripcion', ev.descripcion_estudio,
			'estado', ev.estado_validacion,
			'fecha_entrega', ev.fecha_entrega,
			'archivo_cultivo_path', case
				when lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
					and rca.archivo_path = ev.id_estudio_venta::text || '/cultivo.pdf'
				then rca.archivo_path
				else null
			end,
			'analitos', coalesce((
				select jsonb_agg(
					jsonb_build_object(
						'clave', r.clave,
						'descripcion', coalesce(a.descripcion, r.clave),
						'resultado', r.valor,
						'unidades', coalesce(a.unidad, ''),
						'referencia', case
							when a.tipo_resultado = 'Subtitulo' then ''
							when a.vr_bajo is not null and a.vr_alto is not null then concat(a.vr_bajo, ' - ', a.vr_alto)
							when a.vr_bajo is not null then concat('>', a.vr_bajo)
							else coalesce(a.referencia, '')
						end
					)
					order by coalesce(ea.orden, 9999), r.clave
				)
				from jsonb_each_text(case
					when coalesce(btrim(ev.resultados), '') = '' then '{}'::jsonb
					else ev.resultados::jsonb
				end) as r(clave, valor)
				left join public.analitos a on a.clave = r.clave
				left join public.estudio_analitos ea
					on ea.clave_estudio = ev.clave_estudio
					and ea.id_analito = a.id_analito
			), '[]'::jsonb)
		) as estudio
		from public.estudios_venta ev
		left join public.resultados_cultivo_adjuntos rca
			on rca.id_estudio_venta = ev.id_estudio_venta
		where ev.id_venta = v_venta.id_venta
			and ev.estado_validacion = 'validado'
			and coalesce(ev.muestra_pendiente, false) = false
			and (
				coalesce(btrim(ev.resultados), '') not in ('', '{}')
				or (
					lower(coalesce(ev.descripcion_estudio, '')) like '%cultivo%'
					and rca.archivo_path = ev.id_estudio_venta::text || '/cultivo.pdf'
				)
			)
	) estudios;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_radiologia
	from (
		select jsonb_build_object(
			'id', er.id_estudio,
			'tipo', 'imagen',
			'clave', concat('IMG-', er.id_estudio),
			'descripcion', coalesce(er.descripcion, er.tipo_estudio),
			'estado', case when er.entregado then 'entregado' else 'interpretado' end,
			'fecha_estudio', er.fecha_estudio,
			'fecha_entrega', er.fecha_entrega,
			'reporte', er.reporte
		) as estudio
		from public.estudios_radiologia er
		where er.id_venta = v_venta.id_venta
			and (coalesce(er.listo_entrega, false) = true or coalesce(er.entregado, false) = true)
			and coalesce(btrim(er.reporte), '') <> ''
	) estudios;

	return jsonb_build_object(
		'encontrado', true,
		'autorizado', true,
		'saldo', 0,
		'venta', jsonb_build_object(
			'id_venta', v_venta.id_venta,
			'folio', v_venta.folio,
			'fecha_venta', v_venta.fecha_venta,
			'paciente', v_venta.paciente_nombre,
			'fecha_nacimiento', v_venta.fecha_nacimiento,
			'sexo', v_venta.sexo,
			'telefono', v_venta.telefono,
			'email', v_venta.email,
			'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
		),
		'estudios', v_laboratorio || v_radiologia
	);
end;
$$;

revoke all on function public.buscar_resultados_portal(text, text) from public;
revoke all on function public.buscar_resultados_portal(text, text) from anon, authenticated;

notify pgrst, 'reload schema';
