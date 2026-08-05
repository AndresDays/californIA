# Sin carga manual de imagen en radiologia

## Objetivo

Eliminar toda accion manual para subir o reemplazar imagenes desde la UI de
radiologia. Las imagenes de cada tarjeta llegan exclusivamente desde DICOM
Cloud.

## Alcance

- Quitar el boton de carga de `TarjetaEstudio`, tanto cuando no existe imagen
  como cuando ya existe.
- Quitar el boton equivalente del modal de detalle en el dashboard de
  radiologia.
- Mantener sin cambios la visualizacion de imagenes, el estado de las tarjetas
  y la sincronizacion con DICOM Cloud.

## Pruebas

Las pruebas de la tarjeta verificaran que no renderiza una accion de carga,
independientemente de si recibe `tieneImagen` verdadero o falso. Se ejecutara
la prueba enfocada y el build.
