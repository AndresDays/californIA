-- Hay objetivos que no son de una visita sino de la semana: "levantar pedido de
-- órdenes", "presentar el nuevo paquete de laboratorio". Se repetían tecleando
-- lo mismo en cada cita. Se guardan una vez para un día o un rango y las citas
-- de esos días nacen con ellos puestos.
create table if not exists public.objetivos_periodo (
	id_objetivo uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	-- Un día suelto es desde = hasta; una semana, lunes y domingo.
	desde date not null,
	hasta date not null,
	texto text not null,
	created_at timestamp with time zone default now(),
	constraint objetivos_periodo_rango check (hasta >= desde)
);

create index if not exists idx_objetivos_periodo_rango
	on public.objetivos_periodo (desde, hasta);

alter table public.objetivos_periodo enable row level security;

drop policy if exists objetivos_periodo_todo_visitadora on public.objetivos_periodo;
create policy objetivos_periodo_todo_visitadora
on public.objetivos_periodo
for all to authenticated
using (public.es_usuario_visitadora())
with check (public.es_usuario_visitadora());

-- Lo que dictó el médico, tal como ella lo escribió de corrido en el
-- consultorio. Las columnas del informe salen de desglosar este texto; se
-- guarda el original para poder reabrirlo y corregirlo sin rearmarlo.
alter table public.visitas_medicas add column if not exists captura_libre text;

NOTIFY pgrst, 'reload schema';
