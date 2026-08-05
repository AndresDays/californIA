-- La integración Swelab se ejecuta desde una Edge Function con el rol de
-- servicio. Este proyecto restringe privilegios SQL por tabla, por lo que
-- RLS no basta para permitir el acceso del backend.
grant usage on schema public to service_role;

grant select on table public.ventas to service_role;
grant select on table public.estudios_venta to service_role;
grant update (resultados, estado_captura, estado_validacion, updated_at)
	on table public.estudios_venta to service_role;

grant select on table public.estudio_analitos to service_role;
grant select on table public.analitos to service_role;
grant select, insert on table public.swelab_importaciones to service_role;
