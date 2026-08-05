create table if not exists public.swelab_importaciones (
  id bigint generated always as identity primary key,
  resultado_origen_id bigint not null unique,
  folio text not null,
  id_estudio_venta integer references public.estudios_venta(id_estudio_venta),
  clave_analito text not null,
  valor_original text not null,
  unidad text,
  fecha_origen timestamptz,
  importado_at timestamptz not null default now()
);

create table if not exists public.swelab_importaciones_excepcion (
  id bigint generated always as identity primary key,
  folio text,
  motivo text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.swelab_importaciones enable row level security;
alter table public.swelab_importaciones_excepcion enable row level security;
