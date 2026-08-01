# Navegación de serie con herramienta fijada

## Objetivo

La rueda debe avanzar o retroceder imágenes en series navegables aunque haya una herramienta fijada. El único caso que conserva Zoom es mientras el clic derecho esté sostenido.

## Diseño

`handleWheel` decidirá primero si Zoom temporal está activo. Si lo está, aplicará Zoom; en cualquier otro caso, si la serie tiene más de una imagen, llamará a `onStackScroll` sin cambiar la herramienta fijada.

## Validación

Una prueba cubre que, con Longitud fija, la rueda carga la siguiente imagen y Longitud continúa activa. Las pruebas de Zoom temporal permanecen verdes.
