alter table public.estudios_venta
	add column if not exists muestra_pendiente boolean not null default false;

notify pgrst, 'reload schema';
