create table if not exists public.estudios_imagen_catalogo (
	id bigserial primary key,
	clave text not null,
	descripcion text not null,
	empresa_operativa text not null,
	modalidad text not null,
	area text,
	region_anatomica text,
	requiere_contraste boolean not null default false,
	requiere_interpretacion boolean not null default true,
	dias_proceso integer not null default 1,
	preparacion text,
	duracion_minutos integer,
	activo boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint estudios_imagen_catalogo_clave_unique unique (clave),
	constraint estudios_imagen_catalogo_empresa_check
		check (empresa_operativa in ('CDC', 'CDI')),
	constraint estudios_imagen_catalogo_modalidad_check
		check (modalidad in ('resonancia', 'radiografia', 'tomografia', 'ultrasonido', 'mastografia', 'otro')),
	constraint estudios_imagen_catalogo_dias_proceso_check
		check (dias_proceso >= 0),
	constraint estudios_imagen_catalogo_duracion_check
		check (duracion_minutos is null or duracion_minutos > 0)
);

create index if not exists idx_estudios_imagen_catalogo_empresa_modalidad
on public.estudios_imagen_catalogo (empresa_operativa, modalidad)
where activo = true;

create index if not exists idx_estudios_imagen_catalogo_busqueda
on public.estudios_imagen_catalogo (clave, descripcion);

create or replace function public.estudios_imagen_catalogo_set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists estudios_imagen_catalogo_updated_at on public.estudios_imagen_catalogo;

create trigger estudios_imagen_catalogo_updated_at
before update on public.estudios_imagen_catalogo
for each row
execute function public.estudios_imagen_catalogo_set_updated_at();
