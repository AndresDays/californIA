# Series y previews en VisorPaciente

## Objetivo

Alinear la estructura de navegación de `VisorPaciente` con `VisorDicom` para que el paciente vea las series del estudio, sus previews y la serie activa de forma clara.

## Diseño aprobado

- `VisorPaciente` mostrará un panel lateral izquierdo con una tarjeta por serie.
- Cada tarjeta incluirá preview, nombre de serie y número de imágenes; la activa tendrá el mismo estado visual que en `VisorDicom`.
- Al elegir una serie se cargará su primera imagen y se reiniciará el contador de stack.
- El visor seguirá siendo de solo lectura: no se migrarán controles clínicos, asignación ni edición de reporte.
- Las previews usarán la primera imagen autorizada de cada serie, con un fallback visual cuando una preview no pueda cargarse.

## Pruebas

- Confirmar que las series agrupadas se renderizan en el panel lateral.
- Confirmar que al seleccionar una serie cambian la serie activa, la imagen mostrada y el contador.
