# Firma configurable del reporte

## Objetivo

Mostrar la firma digital con sus colores originales, con un tamaño inicial mayor, y permitir que el radiólogo ajuste de forma independiente la firma y el bloque de nombre, especialidad y cédula.

## Diseño aprobado

- La imagen de firma se renderiza sin filtros CSS, por lo que conserva el azul del archivo cargado.
- La firma comienza ligeramente más grande que la versión actual.
- Firma y datos profesionales son dos bloques independientes: cada uno tiene posición X/Y y escala propias.
- Los controles se muestran solo a quien puede editar el reporte. El QR y el membrete no se mueven.
- Los valores se guardan por estudio dentro de la configuración del reporte y se usan también al descargar el PDF.

## Datos y compatibilidad

La configuración se almacena como `reporte_firma` en `estudios_radiologia`, con valores por defecto cuando no existe. Los reportes existentes conservan su aspecto salvo por la firma azul y el tamaño inicial mayor.
