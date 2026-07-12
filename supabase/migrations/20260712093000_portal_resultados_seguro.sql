create table if not exists public.portal_resultados_accesos (
	id bigint generated always as identity primary key,
	origen_hash text not null,
	exitoso boolean not null default false,
	bloqueado boolean not null default false,
	created_at timestamptz not null default now()
);

create index if not exists idx_portal_resultados_accesos_origen_created
on public.portal_resultados_accesos (origen_hash, created_at desc);

alter table public.portal_resultados_accesos enable row level security;

create or replace function public.buscar_resultados_portal_seguro(
	p_folio text,
	p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
	v_origen text;
	v_origen_hash text;
	v_intentos integer;
	v_resultado jsonb;
begin
	v_origen := coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', v_headers->>'x-client-info', 'sin_origen');
	v_origen_hash := encode(digest(v_origen, 'sha256'), 'hex');

	select count(*) into v_intentos
	from public.portal_resultados_accesos
	where origen_hash = v_origen_hash
		and created_at > now() - interval '15 minutes';

	if v_intentos >= 8 then
		insert into public.portal_resultados_accesos (origen_hash, bloqueado)
		values (v_origen_hash, true);
		return jsonb_build_object(
			'encontrado', false,
			'autorizado', false,
			'mensaje', 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
		);
	end if;

	v_resultado := public.buscar_resultados_portal(p_folio, p_telefono);
	insert into public.portal_resultados_accesos (origen_hash, exitoso)
	values (v_origen_hash, coalesce((v_resultado->>'autorizado')::boolean, false));
	return v_resultado;
end;
$$;

revoke all on function public.buscar_resultados_portal(text, text) from anon, authenticated;
revoke all on function public.buscar_resultados_portal_seguro(text, text) from public;
grant execute on function public.buscar_resultados_portal_seguro(text, text) to anon, authenticated;
