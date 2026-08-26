-- El folio ahora dice de qué empresa es la orden: una letra al frente del
-- consecutivo de siempre (C2508260001 para CDC, I2508260001 para CDI). Cada
-- prefijo lleva su propia serie por día.
--
-- El consecutivo se calculaba en el navegador leyendo el último folio, así que
-- dos cajas capturando al mismo tiempo podían generar el mismo número y la
-- venta chocaba contra la restricción de único. Aquí queda del lado de la base,
-- donde el incremento es atómico.

create table if not exists public.folios_consecutivos (
	prefijo text not null,
	fecha text not null,
	ultimo integer not null default 0,
	updated_at timestamp with time zone not null default now(),
	primary key (prefijo, fecha),
	constraint folios_consecutivos_fecha_check check (fecha ~ '^[0-9]{6}$'),
	constraint folios_consecutivos_prefijo_check check (prefijo ~ '^[A-Z]{0,3}$')
);

comment on table public.folios_consecutivos is 'Consecutivo diario de folios por prefijo de empresa (C = CDC, I = CDI).';

-- La serie no se reinicia: se arranca de lo que ya existe en ventas. Los folios
-- anteriores al cambio no traen letra, así que cuentan para el prefijo vacío y
-- también para el de CDC, que es el que hereda esa numeración.
insert into public.folios_consecutivos (prefijo, fecha, ultimo)
select
	coalesce((regexp_match(folio, '^([A-Z]*)'))[1], '') as prefijo,
	substring(folio from '([0-9]{6})[0-9]+$') as fecha,
	max(substring(folio from '([0-9]+)$')::integer) as ultimo
from public.ventas
where folio ~ '^[A-Z]*[0-9]{10,}$'
group by 1, 2
on conflict (prefijo, fecha) do update
set ultimo = greatest(public.folios_consecutivos.ultimo, excluded.ultimo);

insert into public.folios_consecutivos (prefijo, fecha, ultimo)
select 'C', fecha, ultimo
from public.folios_consecutivos
where prefijo = ''
on conflict (prefijo, fecha) do update
set ultimo = greatest(public.folios_consecutivos.ultimo, excluded.ultimo);

-- Devuelve el folio completo ya reservado. El insert con on conflict incrementa
-- en una sola sentencia, así que dos llamadas simultáneas nunca reciben el
-- mismo número.
create or replace function public.siguiente_folio(
	p_prefijo text,
	p_fecha text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_prefijo text := upper(btrim(coalesce(p_prefijo, '')));
	v_fecha text := coalesce(
		nullif(btrim(coalesce(p_fecha, '')), ''),
		to_char(timezone('America/Mexico_City', now()), 'DDMMYY')
	);
	v_consecutivo integer;
begin
	if v_prefijo !~ '^[A-Z]{0,3}$' then
		raise exception 'Prefijo de folio invalido: %', p_prefijo;
	end if;
	if v_fecha !~ '^[0-9]{6}$' then
		raise exception 'Fecha de folio invalida: %', p_fecha;
	end if;

	insert into public.folios_consecutivos as fc (prefijo, fecha, ultimo)
	values (v_prefijo, v_fecha, 1)
	on conflict (prefijo, fecha) do update
	set ultimo = fc.ultimo + 1,
		updated_at = now()
	returning fc.ultimo into v_consecutivo;

	return v_prefijo || v_fecha || lpad(v_consecutivo::text, 4, '0');
end;
$$;

comment on function public.siguiente_folio(text, text) is 'Reserva y devuelve el siguiente folio del prefijo indicado.';

grant execute on function public.siguiente_folio(text, text) to authenticated;

alter table public.folios_consecutivos enable row level security;

drop policy if exists folios_consecutivos_lectura on public.folios_consecutivos;
create policy folios_consecutivos_lectura
on public.folios_consecutivos
for select
to authenticated
using (true);

NOTIFY pgrst, 'reload schema';
