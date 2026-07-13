# Monitoreo de errores con Sentry

## Objetivo

Centralizar errores no controlados del frontend de CalifornIA sin transmitir
credenciales, tokens ni datos clinicos. La telemetria debe distinguir los
entornos de staging y produccion.

## Alcance

- Inicializar el SDK oficial de Sentry desde el arranque de React solo cuando
  `VITE_SENTRY_DSN` este configurado.
- Identificar los eventos con `VITE_APP_ENV` (`staging` o `production`) y la
  version publicada cuando Vercel la proporcione.
- Reportar los errores que capture `AppBoundary`.
- Filtrar encabezados de autenticacion, cookies, tokens, contrasenas y cuerpos
  de solicitudes antes de enviar eventos.
- No adjuntar capturas de pantalla, sesiones de usuario, trazas de red ni datos
  de pacientes.
- Mantener el comportamiento actual de la interfaz cuando Sentry no este
  configurado, incluidos desarrollo local y pruebas.

## Arquitectura

Un modulo pequeno de observabilidad encapsulara el SDK. `main.jsx` lo inicia
una sola vez antes de renderizar la aplicacion. `AppBoundary` llama a una
funcion de reporte del modulo, por lo que la UI no depende directamente de
Sentry.

Las variables se configuraran en Vercel por entorno y nunca se incluiran en
el repositorio:

- `VITE_SENTRY_DSN`
- `VITE_APP_ENV`

El DSN identifica el proyecto de Sentry; no concede acceso administrativo.

## Privacidad y seguridad

La configuracion desactivara la recoleccion de PII y eliminara datos sensibles
de eventos antes de transmitirlos. La app no enviara informacion de pacientes,
reportes, estudios, entradas de formularios o credenciales. Los eventos se
reducen a error, stack trace, ruta, entorno y version.

## Pruebas

- Con DSN, el modulo inicializa Sentry con el entorno y filtros esperados.
- Sin DSN, no inicializa ningun cliente externo.
- Los filtros eliminan campos sensibles.
- Un error capturado por `AppBoundary` se reporta por el modulo sin cambiar su
  fallback visual.

## Fuera de alcance

- Grabacion de sesiones, capturas de pantalla y trazas de rendimiento.
- Alertas, asignaciones y reglas dentro del panel de Sentry.
- Monitoreo de las Edge Functions y de Supabase.
