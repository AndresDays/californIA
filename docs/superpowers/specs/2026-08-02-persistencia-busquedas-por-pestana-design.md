# Persistencia de búsquedas por pestaña

## Objetivo

Conservar el texto de las búsquedas de páginas al navegar a otra pestaña de la aplicación y volver durante la misma sesión del navegador.

## Diseño aprobado

- Se creará un hook común para búsquedas persistentes basado en `sessionStorage`.
- Cada valor se identificará mediante una clave estable formada por la ruta de la página y el nombre del campo, evitando colisiones entre buscadores de una misma pantalla.
- El hook inicializará el estado desde `sessionStorage` y actualizará el valor guardado cada vez que cambie el texto de búsqueda.
- Se aplicará a los buscadores de listados y pantallas de la plataforma, incluidos los que tienen más de un campo de búsqueda.
- Los buscadores de modales no se persistirán: se limpian al cerrar el modal como parte de su flujo transitorio.

## Comportamiento y límites

- Al volver a una pestaña, el campo conserva el término anterior y el listado mantiene el filtro asociado.
- Una recarga de la página conserva el dato mientras siga abierta la sesión del navegador; cerrar el navegador lo elimina. No se añadirá persistencia permanente en `localStorage`.
- No se modificarán parámetros de URL ni contratos de Supabase.

## Pruebas

- El hook tendrá pruebas para restaurar un valor ya guardado, guardar cambios y aislar claves distintas.
- Las pantallas representativas verificarán que sus términos se conservan tras desmontarse y montarse de nuevo.
