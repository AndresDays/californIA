create table if not exists public.estudio_dicom_estados_vista (
  id bigint generated always as identity primary key,
  id_estudio integer not null references public.estudios_radiologia(id_estudio) on delete cascade,
  id_imagen bigint references public.estudio_dicom_imagenes(id_imagen) on delete cascade,
  storage_path text not null,
  estado jsonb not null,
  actualizado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_estudio_dicom_estado_vista unique (id_estudio, storage_path)
);

create index if not exists idx_estudio_dicom_estados_vista_estudio
  on public.estudio_dicom_estados_vista (id_estudio);

alter table public.estudio_dicom_estados_vista enable row level security;

drop policy if exists estudio_dicom_estados_vista_operacion_interna
  on public.estudio_dicom_estados_vista;

create policy estudio_dicom_estados_vista_operacion_interna
  on public.estudio_dicom_estados_vista for all to authenticated
  using (public.es_empleado_interno_activo())
  with check (public.es_empleado_interno_activo());

create or replace function public.actualizar_updated_at_estudio_dicom_estado_vista()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.actualizado_por = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_actualizar_estudio_dicom_estado_vista
  on public.estudio_dicom_estados_vista;

create trigger trg_actualizar_estudio_dicom_estado_vista
  before insert or update on public.estudio_dicom_estados_vista
  for each row execute function public.actualizar_updated_at_estudio_dicom_estado_vista();

notify pgrst, 'reload schema';
