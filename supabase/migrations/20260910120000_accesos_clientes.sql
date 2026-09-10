-- Accesos de los clientes de convenio.
--
-- Un convenio -IMSS, Medisim, una empresa- manda pacientes y hoy tiene que
-- pedir por teléfono cómo van sus estudios. Se le da entrada propia a la
-- plataforma, con dos accesos separados porque son dos áreas distintas y casi
-- nunca las ve la misma persona:
--
--   imagen      → entra a radiología, como el médico externo, y sólo ve los
--                 estudios de las órdenes que se capturaron a su nombre.
--   laboratorio → entra a una pantalla propia con las órdenes de laboratorio de
--                 su convenio, filtrables por fecha, para ver y descargar los
--                 resultados.
--
-- La asignación no se captura en ningún lado: la orden ya guarda el convenio
-- que recepción eligió en Nuevo Paciente (`ventas.id_cliente`), y de ahí sale
-- todo lo que el cliente puede ver.

create table if not exists public.clientes_accesos (
	id bigint generated always as identity primary key,
	id_cliente integer not null references public.clientes (id_cliente) on delete cascade,
	modulo text not null,
	usuario text not null,
	email text not null,
	auth_uuid uuid unique,
	activo boolean not null default true,
	created_at timestamp with time zone not null default now(),
	updated_at timestamp with time zone not null default now(),
	constraint clientes_accesos_modulo_check check (modulo in ('imagen', 'laboratorio')),
	-- Un acceso por área y por convenio: dos cuentas de imagen para el mismo
	-- cliente sólo servirían para no saber cuál dar de baja.
	constraint clientes_accesos_unico unique (id_cliente, modulo)
);

comment on table public.clientes_accesos is 'Cuentas con las que un cliente de convenio entra a la plataforma: una para imagen y otra para laboratorio.';
comment on column public.clientes_accesos.modulo is 'imagen entra a radiología; laboratorio a la pantalla de resultados del convenio.';

create unique index if not exists idx_clientes_accesos_email on public.clientes_accesos (lower(email));
create index if not exists idx_clientes_accesos_cliente on public.clientes_accesos (id_cliente);

-- El estudio de imagen se marca con el convenio de su orden. Se guarda en el
-- propio estudio -en vez de resolverlo por la venta en cada consulta- porque de
-- esto depende lo que el cliente puede ver, y una regla de seguridad que
-- atraviesa tres tablas es más fácil de equivocar.
alter table public.estudios_radiologia
	add column if not exists id_cliente integer references public.clientes (id_cliente) on delete set null;

create index if not exists idx_estudios_radiologia_cliente
	on public.estudios_radiologia (id_cliente)
	where id_cliente is not null;

create or replace function public.estudios_radiologia_hereda_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	-- Sólo cuando la orden lo dice y el estudio no lo trae ya: si alguien lo
	-- corrige a mano, la corrección manda.
	if new.id_cliente is null and new.id_venta is not null then
		select v.id_cliente into new.id_cliente
		from public.ventas v
		where v.id_venta = new.id_venta;
	end if;
	return new;
end;
$$;

drop trigger if exists estudios_radiologia_cliente on public.estudios_radiologia;
create trigger estudios_radiologia_cliente
before insert or update of id_venta on public.estudios_radiologia
for each row execute function public.estudios_radiologia_hereda_cliente();

-- Los estudios ya capturados también se marcan: si no, el cliente entraría a
-- una pantalla vacía hasta que le llegara una orden nueva.
update public.estudios_radiologia er
set id_cliente = v.id_cliente
from public.ventas v
where er.id_venta = v.id_venta
	and er.id_cliente is null
	and v.id_cliente is not null;

-- Quién es el cliente que está consultando. Devuelve nulo para cualquier otro
-- usuario, así que las políticas que la usan no abren nada a los empleados.
create or replace function public.cliente_acceso_actual()
returns table (id_cliente integer, modulo text)
language sql
stable
security definer
set search_path = public
as $$
	select ca.id_cliente, ca.modulo
	from public.clientes_accesos ca
	join public.clientes c on c.id_cliente = ca.id_cliente
	where ca.auth_uuid = auth.uid()
		and ca.activo
		and coalesce(c.activo, true)
	limit 1;
$$;

grant execute on function public.cliente_acceso_actual() to authenticated;

create or replace function public.es_cliente_modulo(p_modulo text, p_id_cliente integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.cliente_acceso_actual() ca
		where ca.modulo = p_modulo
			and (p_id_cliente is null or ca.id_cliente = p_id_cliente)
	);
$$;

grant execute on function public.es_cliente_modulo(text, integer) to authenticated;

-- ── Quién administra los accesos ────────────────────────────────────────────
-- Dirección y desarrollo. El radiólogo director se guarda con rol `radiologo`.
create or replace function public.es_admin_accesos_cliente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true)
			and regexp_replace(
				translate(lower(btrim(coalesce(e.rol, ''))), 'áéíóúü', 'aeiouu'),
				'[^a-z0-9]+', '_', 'g'
			) in ('admin', 'administrador', 'desarrollador', 'radiologo', 'radiologo_director')
	);
$$;

grant execute on function public.es_admin_accesos_cliente() to authenticated;

alter table public.clientes_accesos enable row level security;

drop policy if exists clientes_accesos_admin on public.clientes_accesos;
create policy clientes_accesos_admin on public.clientes_accesos
for all to authenticated
using (public.es_admin_accesos_cliente())
with check (public.es_admin_accesos_cliente());

-- El cliente lee su propio acceso: es de donde la aplicación saca su nombre y
-- a qué módulo entra.
drop policy if exists clientes_accesos_propio on public.clientes_accesos
;
create policy clientes_accesos_propio on public.clientes_accesos
for select to authenticated
using (auth_uuid = auth.uid());

-- El cliente necesita ver el nombre de su convenio y nada más de la tabla.
drop policy if exists clientes_select_cliente_acceso on public.clientes;
create policy clientes_select_cliente_acceso on public.clientes
for select to authenticated
using (
	exists (
		select 1 from public.cliente_acceso_actual() ca
		where ca.id_cliente = clientes.id_cliente
	)
);

-- ── Lo que ve el acceso de imagen ───────────────────────────────────────────
drop policy if exists estudios_radiologia_select_cliente on public.estudios_radiologia;
create policy estudios_radiologia_select_cliente on public.estudios_radiologia
for select to authenticated
using (public.es_cliente_modulo('imagen', estudios_radiologia.id_cliente));

drop policy if exists estudio_dicom_imagenes_select_cliente on public.estudio_dicom_imagenes;
create policy estudio_dicom_imagenes_select_cliente on public.estudio_dicom_imagenes
for select to authenticated
using (
	exists (
		select 1
		from public.estudios_radiologia er
		where er.id_estudio = estudio_dicom_imagenes.id_estudio
			and public.es_cliente_modulo('imagen', er.id_cliente)
	)
);

drop policy if exists pacientes_select_cliente_acceso on public.pacientes;
create policy pacientes_select_cliente_acceso on public.pacientes
for select to authenticated
using (
	exists (
		select 1
		from public.estudios_radiologia er
		where er.id_paciente = pacientes.id_paciente
			and public.es_cliente_modulo('imagen', er.id_cliente)
	)
	or exists (
		select 1
		from public.ventas v
		where v.id_paciente = pacientes.id_paciente
			and public.es_cliente_modulo('laboratorio', v.id_cliente)
	)
);

-- Las imágenes del estudio, en el bucket. Mismo criterio que la tabla: sólo las
-- de los estudios de su convenio.
drop policy if exists radiologia_storage_select_cliente on storage.objects;
create policy radiologia_storage_select_cliente on storage.objects
for select to authenticated
using (
	bucket_id = 'radiologia'
	and exists (
		select 1
		from public.estudios_radiologia er
		where public.es_cliente_modulo('imagen', er.id_cliente)
			and (
				er.storage_path = storage.objects.name
				or exists (
					select 1
					from public.estudio_dicom_imagenes edi
					where edi.id_estudio = er.id_estudio
						and edi.storage_path = storage.objects.name
				)
			)
	)
);

-- ── Lo que ve el acceso de laboratorio ──────────────────────────────────────
-- Las órdenes de laboratorio del convenio, para la pantalla de resultados. Va
-- como función y no como política sobre `ventas` porque la pantalla necesita el
-- paciente, los estudios y su estado en una sola consulta, y así el cliente no
-- recibe nunca columnas de dinero que no le tocan.
create or replace function public.ventas_laboratorio_cliente(
	p_desde date default null,
	p_hasta date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_id_cliente integer;
	v_resultado jsonb;
begin
	select ca.id_cliente into v_id_cliente
	from public.cliente_acceso_actual() ca
	where ca.modulo = 'laboratorio';

	if v_id_cliente is null then
		return '[]'::jsonb;
	end if;

	select coalesce(jsonb_agg(fila order by fila->>'fecha_venta' desc), '[]'::jsonb)
	into v_resultado
	from (
		select jsonb_build_object(
			'id_venta', v.id_venta,
			'folio', v.folio,
			'fecha_venta', v.fecha_venta,
			'paciente', coalesce(p.nombre, 'Sin paciente'),
			'estudios', coalesce((
				select jsonb_agg(jsonb_build_object(
					'id', ev.id_estudio_venta,
					'clave', ev.clave_estudio,
					'descripcion', ev.descripcion_estudio,
					'estado', ev.estado_validacion,
					'entregado', ev.entregado
				) order by ev.descripcion_estudio)
				from public.estudios_venta ev
				where ev.id_venta = v.id_venta
					and coalesce(lower(ev.area), '') <> 'imagen'
			), '[]'::jsonb)
		) as fila
		from public.ventas v
		left join public.pacientes p on p.id_paciente = v.id_paciente
		where v.id_cliente = v_id_cliente
			and v.estado = 'activo'
			and (p_desde is null or (v.fecha_venta at time zone 'America/Mexico_City')::date >= p_desde)
			and (p_hasta is null or (v.fecha_venta at time zone 'America/Mexico_City')::date <= p_hasta)
			and exists (
				select 1 from public.estudios_venta ev
				where ev.id_venta = v.id_venta
					and coalesce(lower(ev.area), '') <> 'imagen'
			)
		order by v.fecha_venta desc
		limit 500
	) filas;

	return v_resultado;
end;
$$;

grant execute on function public.ventas_laboratorio_cliente(date, date) to authenticated;

-- Los resultados de una orden, en la misma forma que ya consume el PDF del
-- portal. Autoriza por convenio: la orden tiene que ser de quien consulta.
create or replace function public.resultados_venta_cliente(p_id_venta integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_id_cliente integer;
	v_venta record;
begin
	select ca.id_cliente into v_id_cliente
	from public.cliente_acceso_actual() ca
	where ca.modulo = 'laboratorio';

	if v_id_cliente is null then
		return jsonb_build_object('encontrado', false, 'mensaje', 'Acceso no autorizado.');
	end if;

	select v.id_venta, v.folio, v.fecha_venta, v.id_sucursal, v.sucursal,
		p.nombre as paciente_nombre, p.fecha_nacimiento, p.sexo, c.nombre as cliente_nombre
	into v_venta
	from public.ventas v
	left join public.pacientes p on p.id_paciente = v.id_paciente
	left join public.clientes c on c.id_cliente = v.id_cliente
	where v.id_venta = p_id_venta
		and v.id_cliente = v_id_cliente
		and v.estado = 'activo'
	limit 1;

	if v_venta.id_venta is null then
		return jsonb_build_object('encontrado', false, 'mensaje', 'La orden no es de este convenio.');
	end if;

	return jsonb_build_object(
		'encontrado', true,
		'venta', jsonb_build_object(
			'id_venta', v_venta.id_venta,
			'folio', v_venta.folio,
			'fecha_venta', v_venta.fecha_venta,
			'paciente', coalesce(v_venta.paciente_nombre, 'Sin paciente'),
			'fecha_nacimiento', v_venta.fecha_nacimiento,
			'sexo', v_venta.sexo,
			'id_sucursal', v_venta.id_sucursal,
			'sucursal', v_venta.sucursal,
			'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
		),
		-- Los analitos salen igual que en el portal del paciente: los
		-- resultados viven como JSON en `estudios_venta.resultados` y el orden
		-- lo pone el catálogo del estudio. Sólo lo validado, misma regla que
		-- para el paciente: un resultado sin validar no se entrega.
		'estudios', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', ev.id_estudio_venta,
					'tipo', 'laboratorio',
					'clave', ev.clave_estudio,
					'descripcion', ev.descripcion_estudio,
					'estado', ev.estado_validacion,
					'fecha_entrega', ev.fecha_entrega,
					'analitos', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'clave', r.clave,
								'descripcion', coalesce(a.descripcion, r.clave),
								'resultado', r.valor,
								'unidades', coalesce(a.unidad, ''),
								'referencia',
									case
										when a.tipo_resultado = 'Subtitulo' then ''
										when a.vr_bajo is not null and a.vr_alto is not null then concat(a.vr_bajo, ' - ', a.vr_alto)
										when a.vr_bajo is not null then concat('>', a.vr_bajo)
										else coalesce(a.referencia, '')
									end
							)
							order by coalesce(ea.orden, 9999), r.clave
						)
						from jsonb_each_text(
							case
								when coalesce(btrim(ev.resultados), '') = '' then '{}'::jsonb
								else ev.resultados::jsonb
							end
						) as r(clave, valor)
						left join public.analitos a on a.clave = r.clave
						left join public.estudio_analitos ea
							on ea.clave_estudio = ev.clave_estudio
							and ea.id_analito = a.id_analito
					), '[]'::jsonb)
				)
				order by ev.descripcion_estudio
			)
			from public.estudios_venta ev
			where ev.id_venta = v_venta.id_venta
				and coalesce(lower(ev.area), '') <> 'imagen'
				and ev.estado_validacion = 'validado'
				and coalesce(ev.muestra_pendiente, false) = false
				and coalesce(btrim(ev.resultados), '') not in ('', '{}')
		), '[]'::jsonb)
	);
end;
$$;

grant execute on function public.resultados_venta_cliente(integer) to authenticated;

notify pgrst, 'reload schema';
