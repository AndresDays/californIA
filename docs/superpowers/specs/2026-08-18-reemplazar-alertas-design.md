# Reemplazar alertas nativas por ModalNotificacion

## Alcance

Sustituir cada uso de `alert()` en código de producción por el componente existente `ModalNotificacion`. Se excluye la cadena `alert(1)` de la prueba de sanitización de HTML, pues no ejecuta una alerta de interfaz.

## Diseño

Cada componente que hoy emite alertas administrará una notificación local con `isOpen`, `mensaje` y `tipo`, además de una función `mostrarNotificacion`. Renderizará `ModalNotificacion` y cerrará el modal restableciendo su estado.

Las validaciones usarán `advertencia`, los fallos usarán `error` y las operaciones exitosas usarán `exito`. Se conservarán los mensajes y el flujo existente; sólo cambia el mecanismo visual.

## Verificación

Se agregarán pruebas de integración focalizadas para los flujos de nuevo paciente y sus modales. Después se comprobará que no queden llamadas a `alert()` en `src` salvo la cadena de prueba, y se ejecutarán las pruebas focalizadas y la compilación.
