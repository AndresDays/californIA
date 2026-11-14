-- Nuevo rol "Técnico - Recepción" (`tecnico_recepcion`).
--
-- Es para quien cubre los dos puestos: toma y sube estudios como el técnico en
-- radiología y atiende el mostrador como recepción. No tiene reglas propias:
-- en cada lugar donde la base de datos distingue a uno de esos dos roles, el
-- nuevo entra junto con él.

-- 1. Lectura de imágenes del bucket `radiologia`: personal de imagen.
create or replace function public.es_personal_imagen_activo()
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) is true
			and regexp_replace(
				translate(lower(btrim(coalesce(e.rol, ''))), 'áéíóúü', 'aeiouu'),
				'[^a-z0-9]+', '_', 'g'
			) in (
				'desarrollador',
				'radiologo',
				'radiologo_clinico',
				'radiologo_director',
				'admin',
				'administrador',
				'tecnico',
				'tecnico_radiologia',
				'tecnico_recepcion'
			)
	);
$$;

comment on function public.es_personal_imagen_activo() is 'Empleado activo que trabaja con estudios de imagen: puede leer y subir archivos del bucket radiologia.';

grant execute on function public.es_personal_imagen_activo() to authenticated;

-- 2. Notificaciones: recibe los avisos de radiología y los de recepción/entrega.
create or replace function public.es_destinatario_notificacion(
	p_usuario_destino uuid,
	p_rol_destino text,
	p_canal_destino text,
	p_id_sucursal integer,
	p_sucursal text
)
returns boolean
language sql
security definer
set search_path = public
as $$
	with empleado_actual as (
		select
			e.auth_uuid,
			public.normalizar_texto_notificacion(e.rol) as rol,
			s.id_sucursal,
			public.normalizar_texto_notificacion(e.sucursal) as sucursal
		from public.empleados e
		left join public.sucursales s
			on public.normalizar_texto_notificacion(s.nombre) = public.normalizar_texto_notificacion(e.sucursal)
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
		limit 1
	),
	destino as (
		select
			public.normalizar_texto_notificacion(p_rol_destino) as rol_destino,
			public.normalizar_texto_notificacion(coalesce(p_canal_destino, 'todos')) as canal_destino,
			public.normalizar_texto_notificacion(p_sucursal) as sucursal_destino
	)
	select exists (
		select 1
		from empleado_actual e
		cross join destino d
		where (p_usuario_destino is null or p_usuario_destino = auth.uid())
			and (p_id_sucursal is null or e.id_sucursal is null or p_id_sucursal = e.id_sucursal)
			and (d.sucursal_destino = '' or e.sucursal = '' or d.sucursal_destino = e.sucursal)
			and (
				d.rol_destino in ('', 'todos', e.rol)
				or d.canal_destino in ('', 'todos')
				or (
					d.canal_destino in ('captura', 'laboratorio')
					and e.rol in ('quimico', 'tecnico', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino = 'radiologia'
					and e.rol in ('radiologo', 'tecnico_radiologia', 'tecnico', 'tecnico_recepcion', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino in ('entrega', 'recepcion')
					and e.rol in ('recepcionista', 'tecnico_recepcion', 'administrador', 'admin', 'desarrollador')
				)
			)
	);
$$;

grant execute on function public.es_destinatario_notificacion(uuid, text, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
