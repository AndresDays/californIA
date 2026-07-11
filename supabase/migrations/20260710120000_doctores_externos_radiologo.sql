alter table public.doctores
add column if not exists es_radiologo boolean not null default false,
add column if not exists especialidad text;

create index if not exists idx_doctores_es_radiologo
on public.doctores (es_radiologo)
where es_radiologo is true;

notify pgrst, 'reload schema';
