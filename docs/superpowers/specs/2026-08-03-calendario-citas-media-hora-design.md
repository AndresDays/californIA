# Calendario de citas por bloques de media hora

## Objetivo

Permitir que recepción cree una cita desde la agenda diaria al seleccionar un bloque disponible de 30 minutos, asignando siempre la sucursal del usuario autenticado.

## Alcance

- La agenda muestra bloques desde las 7:00 AM hasta las 8:00 PM.
- Los bloques son de 30 minutos; el último representa 7:30–8:00 PM.
- Un clic en un bloque disponible abre el modal existente de nueva cita con fecha y hora precargadas.
- El selector de sucursal deja de aparecer únicamente en el formulario de citas.
- La cita creada almacena el `id_sucursal` de `empleadoData` de la sesión activa.
- Si la sesión no tiene una sucursal asignada, la creación se bloquea y el modal informa el motivo.

## Fuera de alcance

- Los selectores de sucursal de reportes, cortes, cierre de caja y dashboard continúan como filtros de consulta.
- La asignación de sucursal al administrar usuarios no cambia.
- No se cambia el modelo de datos ni se implementa una validación de disponibilidad entre citas.

## Diseño

`CalendarioCitas` sustituye las filas por hora por una lista de intervalos de 30 minutos. Cada celda disponible es un botón accesible que transporta fecha, hora y tipo de estudio. Al seleccionarla, el componente mantiene ese horario en estado y abre `NuevaCitaModal`.

`NuevaCitaModal` acepta opcionalmente una fecha y hora iniciales. Si recibe esos valores, los usa al abrir; en los accesos existentes que no los proveen, conserva el comportamiento actual de inicializar con la fecha y hora presentes. El modal obtiene `empleadoData` mediante el contexto de autenticación, elimina la carga y el selector de sucursales, valida que exista `empleadoData.id_sucursal` y lo usa en el payload de `citas`.

Una cita existente se agrupa por tipo de estudio y por su hora local normalizada al inicio del intervalo de 30 minutos correspondiente. Así, una cita de las 9:30 aparece en la celda 9:30 y una de las 9:00 en la celda 9:00.

## Manejo de errores

- Si la sesión no aporta `id_sucursal`, el formulario no se envía y presenta un mensaje claro para que un administrador asigne la sucursal del empleado.
- Los errores actuales de creación de cita se mantienen.

## Pruebas

- La agenda representa 7:00 AM, 7:30 AM y el último bloque 7:30 PM.
- Hacer clic en un bloque disponible abre el modal con fecha y hora seleccionadas.
- El modal no presenta el selector de sucursal.
- El envío usa el `id_sucursal` de la sesión y no permite enviar cuando no está disponible.
- Las pruebas existentes de controles de fecha y de presentación de citas continúan pasando.
