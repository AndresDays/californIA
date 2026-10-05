-- El ticket de una cotización se manda por WhatsApp o por correo, y ni `wa.me`
-- ni `mailto:` admiten adjuntos: por ahí sólo viaja texto. En el celular el
-- menú de compartir del sistema sí manda el PDF, pero en el mostrador -Chrome
-- de escritorio- no existe, y el paciente acababa recibiendo sólo el resumen
-- escrito.
--
-- Aquí vive el PDF para poder mandar su enlace. El bucket es privado y lo que
-- se comparte es una URL firmada que caduca: el ticket trae el nombre del
-- paciente y lo que se le cotizó.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'cotizaciones-tickets',
	'cotizaciones-tickets',
	false,
	10 * 1024 * 1024,
	array['application/pdf']
)
on conflict (id) do update
set
	public = false,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- Cotizar es trabajo de mostrador: cualquier empleado con sesión puede subir el
-- ticket que acaba de generar y volver a firmar su enlace.
drop policy if exists cotizaciones_tickets_storage_select on storage.objects;
create policy cotizaciones_tickets_storage_select
on storage.objects
for select to authenticated
	using (bucket_id = 'cotizaciones-tickets');

drop policy if exists cotizaciones_tickets_storage_insert on storage.objects;
create policy cotizaciones_tickets_storage_insert
on storage.objects
for insert to authenticated
	with check (bucket_id = 'cotizaciones-tickets');

-- Una cotización se puede volver a guardar con un estudio más: el ticket se
-- reemplaza por el nuevo.
drop policy if exists cotizaciones_tickets_storage_update on storage.objects;
create policy cotizaciones_tickets_storage_update
on storage.objects
for update to authenticated
	using (bucket_id = 'cotizaciones-tickets')
	with check (bucket_id = 'cotizaciones-tickets');
