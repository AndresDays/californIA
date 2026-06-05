create table if not exists public.notificaciones (
  id            bigserial primary key,
  titulo        text not null,
  mensaje       text,
  tipo          text not null default 'info'
    check (tipo in ('info', 'exito', 'advertencia', 'error')),
  canal_destino text not null default 'todos'
    check (canal_destino in ('todos', 'rol', 'usuario', 'sucursal')),
  rol_destino       text,
  usuario_destino   uuid references auth.users(id) on delete cascade,
  entidad_tipo  text,
  entidad_id    bigint,
  id_venta      integer references public.ventas(id_venta) on delete set null,
  id_sucursal   integer,
  sucursal      text,
  action_path   text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notificaciones_created_at
  on public.notificaciones (created_at desc);

create index if not exists idx_notificaciones_usuario_destino
  on public.notificaciones (usuario_destino, read_at);

create index if not exists idx_notificaciones_rol_destino
  on public.notificaciones (rol_destino, read_at);

alter table public.notificaciones enable row level security;

create policy notificaciones_select_authenticated
  on public.notificaciones for select
  to authenticated using (true);

create policy notificaciones_insert_authenticated
  on public.notificaciones for insert
  to authenticated with check (true);

create policy notificaciones_update_authenticated
  on public.notificaciones for update
  to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.notificaciones;
