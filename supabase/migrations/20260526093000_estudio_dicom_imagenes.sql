create table if not exists public.estudio_dicom_imagenes (
  id_imagen bigint generated always as identity primary key,
  id_estudio integer not null references public.estudios_radiologia(id_estudio) on delete cascade,
  bucket text not null default 'radiologia',
  storage_path text not null,
  file_name text,
  file_size bigint,
  mime_type text,
  modality text,
  study_instance_uid text,
  series_instance_uid text,
  series_description text,
  instance_number integer,
  frame_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_estudio_dicom_imagenes_path
  on public.estudio_dicom_imagenes(id_estudio, bucket, storage_path);

create index if not exists idx_estudio_dicom_imagenes_estudio
  on public.estudio_dicom_imagenes(id_estudio, created_at);

create index if not exists idx_estudio_dicom_imagenes_serie
  on public.estudio_dicom_imagenes(id_estudio, series_instance_uid, instance_number);
