# Acciones de una cita desde el calendario

## Objetivo

Permitir que una cita existente del calendario abra acciones para editarla, cancelarla de forma confirmada o llevar sus datos a Nuevo paciente.

## Diseño

Cada tarjeta de cita será un control accesible. Al seleccionarla se abrirá un modal de acciones con Editar cita, Cancelar cita y Pasar a estudio. Editar reutiliza `EditarCitaModal`; pasar a estudio navega a `/nuevo-paciente?citaId=<id_cita>`; cancelar solicita confirmación y actualiza `citas.estado` a `cancelada`.

Después de editar o cancelar se invalidará la consulta de citas para refrescar el calendario. Cancelar no elimina registros ni permite una cancelación sin confirmación.

## Pruebas

- Clic en una tarjeta abre el modal de acciones de esa cita.
- Pasar a estudio navega con su `citaId`.
- Cancelar requiere confirmación y actualiza el estado a `cancelada`.
- Editar abre el modal existente y refresca el calendario al guardar.
