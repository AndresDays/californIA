insert into public.sucursales (nombre)
select 'STAGING - NO PRODUCCION'
where not exists (
  select 1
  from public.sucursales
  where nombre = 'STAGING - NO PRODUCCION'
);

insert into public.estudios_imagen_catalogo (
  clave,
  descripcion,
  empresa_operativa,
  modalidad,
  area,
  requiere_contraste,
  requiere_interpretacion,
  dias_proceso,
  activo
)
values (
  'STAGING-DX-PRUEBA',
  'RADIOGRAFIA DE PRUEBA - SOLO STAGING',
  'CDC',
  'radiografia',
  'Pruebas',
  false,
  true,
  1,
  true
)
on conflict (clave) do update set
  descripcion = excluded.descripcion,
  updated_at = now();

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio)
select
  'Estudio',
  'STAGING-DX-PRUEBA',
  'RADIOGRAFIA DE PRUEBA - SOLO STAGING',
  'Particular',
  1.00
where not exists (
  select 1
  from public.precios_estudios
  where cliente = 'Particular'
    and clave = 'STAGING-DX-PRUEBA'
);
