# Preparacion para vender CalifornIA

Esta guia lista los controles minimos para operar CalifornIA con clientes reales.
No reemplaza asesoria legal o cumplimiento sanitario, pero define lo que debe
estar listo antes de entregar la plataforma a una clinica.

## Ambientes y despliegue

Usa produccion y staging con datos, claves y dominios separados.

| Entorno | Rama | Dominio | Supabase | Vercel env |
| --- | --- | --- | --- | --- |
| Produccion | `main` | `app.californiadiagnostica.com` | proyecto productivo | `Production` |
| Staging | `staging` | `staging.californiadiagnostica.com` | proyecto staging | `Preview` |

Variables obligatorias:

- `VITE_SUPABASE_URL`: URL base del proyecto, sin `/rest/v1`.
- `VITE_SUPABASE_ANON_KEY`: publishable key completa del mismo proyecto.
- `VITE_APP_ENV`: `production` o `staging`.
- `VITE_SENTRY_DSN`: DSN de Sentry, si aplica.

Checklist de verificacion despues de cada cambio de variables:

- El deployment de staging viene de la rama `staging`.
- El dominio de staging apunta al deployment de `staging`, no a `main`.
- En DevTools, las llamadas de staging usan el ref de Supabase staging.
- No aparece el ref de Supabase productivo en staging.
- El navegador no esta sirviendo un service worker viejo.

## Restore y continuidad

La continuidad depende de poder restaurar, no solo de tener backups.

- Ejecutar restore mensual a staging o a un proyecto temporal.
- Validar login, dashboard, pacientes, ventas/citas y visor DICOM.
- Confirmar que Storage restaura objetos y que `createSignedUrl` funciona.
- Documentar el resultado en un registro operativo.
- Rotar cualquier secreto expuesto durante pruebas manuales.

La guia paso a paso vive en `docs/operations/backups.md`. El registro operativo
para pruebas vive en `docs/operations/backup-verification-log.md`.

## Monitoreo y respuesta

Sentry debe estar activo en produccion antes de vender.

- Registrar errores frontend sin PII ni adjuntos.
- Separar `VITE_APP_ENV=production` y `VITE_APP_ENV=staging`.
- Revisar issues nuevos al menos diariamente durante la primera operacion real.
- Documentar quien atiende errores criticos y en cuanto tiempo.

Alertas minimas:

- Fallo del backup diario.
- Error recurrente de login o permisos.
- Error recurrente de carga DICOM.
- Caida del dominio productivo.

## Seguridad operativa

Antes de operar con datos reales:

- MFA obligatorio para administradores de Supabase, Vercel, AWS y Sentry.
- Ninguna `service_role` en frontend, Vercel public env, tickets o chats.
- Rotacion inmediata de cualquier secreto expuesto.
- RLS revisado para tablas clinicas.
- Bucket `radiologia` privado con URLs firmadas.
- Usuarios de doctores externos limitados a radiologia y a estudios asignados.
- Cuentas personales por empleado; no compartir usuarios.

## Onboarding de una clinica

Para vender sin depender del desarrollador en cada instalacion, preparar:

- Formato de alta de clinica: nombre fiscal, sucursales, usuarios iniciales,
  horarios, catalogos, precios y formas de pago.
- Checklist de configuracion inicial en Supabase/Vercel.
- Plantilla de carga de catalogos y precios.
- Usuario administrador inicial con MFA.
- Prueba de punta a punta: cita, pago, estudio, reporte, entrega.
- Capacitación corta para recepcion, laboratorio/radiologia y administrador.

La plantilla completa vive en `docs/operations/clinic-onboarding.md`.

## Legal y privacidad

Antes de cobrar a clientes reales:

- Aviso de privacidad para pacientes.
- Terminos de uso para clinicas.
- Contrato o anexo de tratamiento de datos.
- Politica de retencion y eliminacion de estudios.
- Proceso para solicitudes de acceso/correccion/eliminacion de datos.
- Confirmar requisitos regulatorios locales para datos de salud.

## Soporte y operacion

Define un soporte basico vendible:

- Canal de soporte oficial.
- Horario de atencion.
- Severidades: critico, alto, medio, bajo.
- Tiempos objetivo de respuesta.
- Procedimiento de escalamiento tecnico.
- Registro de cambios por version.

El runbook operativo vive en `docs/operations/support-runbook.md`.
El registro de responsables y accesos operativos vive en
`docs/operations/access-control.md`.

## Criterios de salida antes de vender

No vender a una clinica nueva hasta que se cumpla:

- Produccion y staging estan separados y probados.
- Restore mensual fue validado con DICOM.
- Backups diarios estan activos y alertando.
- Sentry recibe errores reales de staging y produccion.
- Hay usuario admin, recepcion, radiologia/doctor externo probados por rol.
- Hay responsable y accesos operativos documentados.
- Hay documentos legales minimos revisados.
- Existe runbook de soporte y restauracion.
