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

-- La empresa que factura una imagen la decide el convenio del paciente: el
-- mismo ultrasonido es de CDC con IMSS y de CDI con ISSSTE. El dato vive en el
-- cliente para que dar de alta un convenio nuevo no requiera tocar código.
alter table public.clientes
	add column if not exists empresa_factura text;

alter table public.clientes
	drop constraint if exists clientes_empresa_factura_check;
alter table public.clientes
	add constraint clientes_empresa_factura_check
	check (empresa_factura is null or empresa_factura in ('CDC', 'CDI'));

comment on column public.clientes.empresa_factura is 'Empresa que factura la imagen de este convenio (CDC o CDI). Vacío = particular, se usa la empresa del catálogo.';

update public.clientes
set empresa_factura = 'CDC'
where empresa_factura is null
	and upper(btrim(nombre)) in ('IMSS', 'ODILE', 'ANAMAYA', 'ODILE / ANAMAYA', 'ODILE/ANAMAYA');

update public.clientes
set empresa_factura = 'CDI'
where empresa_factura is null
	and upper(btrim(nombre)) in ('ISSSTE', 'SSA', 'MEDISIM');

NOTIFY pgrst, 'reload schema';
