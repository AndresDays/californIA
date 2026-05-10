alter table public.empleados
	add column if not exists auth_uuid uuid references auth.users(id) on delete set null;

create unique index if not exists empleados_auth_uuid_unique
	on public.empleados(auth_uuid)
	where auth_uuid is not null;
