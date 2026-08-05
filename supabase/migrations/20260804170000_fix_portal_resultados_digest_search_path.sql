create extension if not exists pgcrypto with schema extensions;

create or replace function public.buscar_resultados_portal_seguro(
	p_folio text,
	p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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
		return jsonb_build_object('encontrado', false, 'autorizado', false, 'mensaje', 'Demasiados intentos. Espera unos minutos antes de volver a intentar.');
	end if;

	v_resultado := public.buscar_resultados_portal(p_folio, p_telefono);
	insert into public.portal_resultados_accesos (origen_hash, exitoso)
	values (v_origen_hash, coalesce((v_resultado->>'autorizado')::boolean, false));
	return v_resultado;
end;
$$;
