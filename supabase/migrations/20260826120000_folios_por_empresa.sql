-- Fiscalmente son dos empresas, CDC (California) y CDI (Imagen), y el folio
-- tiene que decir a cuál se factura la orden sin abrirla. Como el laboratorio
-- de CDC se controla aparte de su imagen, quedan tres series corridas:
--
--   A → CDI, imagen (convenios ISSSTE, SSA, Medisim)
--   B → CDC, imagen (convenios IMSS y Odile/Anamaya, y la resonancia particular)
--   C → CDC, laboratorio
--
-- El consecutivo se calculaba en el navegador leyendo el último folio, así que
-- dos cajas capturando al mismo tiempo podían generar el mismo número y la
-- venta chocaba contra la restricción de único. Aquí queda del lado de la base,
-- donde el incremento es atómico.

create table if not exists public.folios_series (
	serie text primary key,
	empresa text not null,
	descripcion text,
	ultimo integer not null default 0,
	updated_at timestamp with time zone not null default now(),
	constraint folios_series_serie_check check (serie ~ '^[A-Z]$'),
	constraint folios_series_empresa_check check (empresa in ('CDC', 'CDI'))
);

comment on table public.folios_series is 'Consecutivo corrido de folios por serie (A: imagen CDI, B: imagen CDC, C: laboratorio CDC).';

insert into public.folios_series (serie, empresa, descripcion)
values
	('A', 'CDI', 'Imagen facturada por CDI'),
	('B', 'CDC', 'Imagen facturada por CDC'),
	('C', 'CDC', 'Laboratorio facturado por CDC')
on conflict (serie) do nothing;

-- Las series arrancan en 0 a propósito: los folios anteriores al cambio son
-- DDMMYY + consecutivo, de puros dígitos, así que A0001 no choca con ninguno.
update public.folios_series fs
set ultimo = greatest(fs.ultimo, coalesce((
	select max(substring(v.folio from '^[A-Z](\d+)$')::integer)
	from public.ventas v
	where v.folio ~ ('^' || fs.serie || '\d+$')
), 0));

-- Devuelve el folio completo ya reservado. El update con returning incrementa en
-- una sola sentencia, así que dos llamadas simultáneas nunca reciben el mismo
-- número.
create or replace function public.siguiente_folio(p_serie text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_serie text := upper(btrim(coalesce(p_serie, '')));
	v_consecutivo integer;
begin
	update public.folios_series
	set ultimo = ultimo + 1,
		updated_at = now()
	where serie = v_serie
	returning ultimo into v_consecutivo;

	if v_consecutivo is null then
		raise exception 'Serie de folio desconocida: %', p_serie;
	end if;

	return v_serie || lpad(v_consecutivo::text, 4, '0');
end;
$$;

comment on function public.siguiente_folio(text) is 'Reserva y devuelve el siguiente folio de la serie indicada.';

grant execute on function public.siguiente_folio(text) to authenticated;

alter table public.folios_series enable row level security;

drop policy if exists folios_series_lectura on public.folios_series;
create policy folios_series_lectura
on public.folios_series
for select
to authenticated
using (true);

-- Qué empresa factura una imagen no lo decide solo el convenio ni solo el
-- estudio, sino los dos: Medisim y SSA mandan su resonancia a CDC y el resto de
-- su imagen a CDI, e IMSS sólo lleva ultrasonido cuando es doppler. La matriz se
-- guarda aquí para que dar de alta un convenio nuevo no requiera tocar código.
create table if not exists public.convenios_facturacion (
	id bigint generated always as identity primary key,
	id_cliente bigint not null references public.clientes(id_cliente) on delete cascade,
	modalidad text not null default '*',
	criterio text not null default '',
	empresa text not null,
	created_at timestamp with time zone not null default now(),
	constraint convenios_facturacion_empresa_check check (empresa in ('CDC', 'CDI')),
	constraint convenios_facturacion_criterio_check check (criterio in ('', 'doppler')),
	unique (id_cliente, modalidad, criterio)
);

comment on table public.convenios_facturacion is 'Empresa que factura la imagen de cada convenio por modalidad. modalidad = * aplica a todas; sin regla se usa la empresa del catálogo.';
comment on column public.convenios_facturacion.criterio is 'Restringe la regla dentro de la modalidad; vacío aplica a toda la modalidad y doppler sólo a los ultrasonidos doppler.';

create index if not exists idx_convenios_facturacion_cliente
	on public.convenios_facturacion (id_cliente);

alter table public.convenios_facturacion enable row level security;

drop policy if exists convenios_facturacion_lectura on public.convenios_facturacion;
create policy convenios_facturacion_lectura
on public.convenios_facturacion
for select
to authenticated
using (true);

drop policy if exists convenios_facturacion_escritura on public.convenios_facturacion;
create policy convenios_facturacion_escritura
on public.convenios_facturacion
for all
to authenticated
using (true)
with check (true);

-- Matriz actual de convenios.
--   California (CDC): IMSS (tomografía, resonancia y ultrasonido doppler),
--   Odile/Anamaya (toda su imagen), y la resonancia de Medisim y SSA.
--   Imagen (CDI): ISSSTE, Medisim y SSA en el resto de su imagen.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select c.id_cliente, m.modalidad, m.criterio, m.empresa
from public.clientes c
join (
	values
		('IMSS', 'tomografia', '', 'CDC'),
		('IMSS', 'resonancia', '', 'CDC'),
		('IMSS', 'ultrasonido', 'doppler', 'CDC'),
		('ODILE', '*', '', 'CDC'),
		('ANAMAYA', '*', '', 'CDC'),
		('ODILE / ANAMAYA', '*', '', 'CDC'),
		('ODILE/ANAMAYA', '*', '', 'CDC'),
		('ISSSTE', '*', '', 'CDI'),
		('MEDISIM', '*', '', 'CDI'),
		('MEDISIM', 'resonancia', '', 'CDC'),
		('SSA', '*', '', 'CDI'),
		('SSA', 'resonancia', '', 'CDC')
) as m(convenio, modalidad, criterio, empresa)
	on upper(btrim(c.nombre)) = m.convenio
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

NOTIFY pgrst, 'reload schema';
