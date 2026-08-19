# Corrección de fecha y hora en tarjetas de imagen

## Objetivo

Mostrar y guardar correctamente la fecha y hora de las tarjetas de estudios de imagen creadas desde `nuevo-paciente`, usando la hora civil de `America/Mexico_City`.

## Causa confirmada

`nuevo-paciente` convierte la hora local de México a un ISO con sufijo `Z`. `estudios_radiologia.fecha_estudio` es `timestamp without time zone`, por lo que la base conserva la hora UTC como si fuera local. Una solicitud creada el 17 de agosto a las 18:27 queda almacenada como 18 de agosto a las 00:27.

## Diseño

1. Añadir un helper puro que reciba un instante y devuelva una fecha-hora civil de Ciudad de México sin zona (`YYYY-MM-DDTHH:mm:ss`). Incluir pruebas de una hora nocturna para prevenir el cruce de fecha.
2. Usar ese helper sólo para `estudios_radiologia.fecha_estudio` en `nuevo-paciente`. `ventas.fecha_venta` ya es `timestamp with time zone` y debe continuar recibiendo el ISO del instante actual; no se modificará ese dato ni la programación de turnos.
3. Añadir una migración idempotente que reste seis horas exclusivamente a `estudios_radiologia` vinculados a una venta cuyo `fecha_estudio` coincide exactamente con `ventas.fecha_venta` al compararlos en UTC. Esa igualdad es la firma del flujo defectuoso: ambas fechas se construían a partir del mismo instante. No se modificarán estudios sin venta o fechas que no coincidan, por lo que no se altera la fecha proveniente de equipos DICOM ni registros ajenos al flujo.

## Verificación

- La prueba unitaria debe fallar antes del helper y demostrar que 18 de agosto 00:27 UTC se transforma en 17 de agosto 18:27 hora México sin sufijo `Z`.
- Las pruebas existentes del flujo de fecha y la nueva prueba deben pasar tras el cambio.
- Revisar la migración por condiciones de alcance e idempotencia; ejecutar las verificaciones de sintaxis y build disponibles sin afirmar despliegue de base de datos hasta aplicarla en el proyecto correspondiente.
