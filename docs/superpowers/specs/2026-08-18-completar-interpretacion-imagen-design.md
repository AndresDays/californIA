# Completar interpretación de imagen

## Alcance

El visor DICOM conservará **Guardar** como borrador. Un nuevo botón **Completar interpretación** finalizará un reporte no vacío, validará el estudio de venta relacionado y liberará el estudio radiológico para Entrega de resultados.

## Flujo

1. El radiólogo guarda borradores sin liberarlos.
2. Al completar, se guarda el reporte con estado `COMPLETADO`, se actualiza `estudios_venta` a `estado_captura: completado` y `estado_validacion: validado`, y `estudios_radiologia` a `listo_entrega: true`.
3. Se registra la auditoría y una notificación dirigida a Entrega de resultados.
4. Entrega mantiene sus acciones existentes de entregar y enviar el enlace seguro por WhatsApp. El visor no envía WhatsApp.

## Límites

- Se reutilizan los permisos existentes de edición de interpretación.
- Un reporte vacío no puede completarse.
- No se modifican el control de adeudos ni el formato/enlace de WhatsApp.
