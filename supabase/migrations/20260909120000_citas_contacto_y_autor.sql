-- Contacto del paciente y autor de la cita.
--
-- Agendar por teléfono no siempre deja un teléfono: hay quien sólo deja su
-- correo. La cita guardaba únicamente `telefono_paciente`, así que ese dato se
-- perdía o se colaba en el nombre. Ahora se guarda cada uno en su columna y el
-- modal deja elegir cuál se capturó.
--
-- Además, la agenda no decía quién había apuntado la cita: cuando algo no
-- cuadra -la hora, el estudio, un paciente que dice que nunca llamó- no hay a
-- quién preguntarle. Se guarda el empleado y también su nombre, porque el
-- empleado puede darse de baja y el nombre de quien capturó tiene que
-- sobrevivirlo.

alter table public.citas
	add column if not exists correo_paciente text,
	add column if not exists id_empleado_creador integer references public.empleados (id_empleado) on delete set null,
	add column if not exists creado_por_nombre text;

comment on column public.citas.correo_paciente is 'Correo del paciente cuando el contacto que dejó fue correo en vez de teléfono.';
comment on column public.citas.id_empleado_creador is 'Empleado que capturó la cita.';
comment on column public.citas.creado_por_nombre is 'Nombre de quien capturó la cita, conservado aunque el empleado se dé de baja.';

NOTIFY pgrst, 'reload schema';
