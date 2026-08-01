# Migracion de WhatsApp de Twilio a Infobip

## Objetivo

Migrar los recordatorios y confirmaciones de citas de Twilio a Infobip, sin
cambiar el calendario, los datos clinicos existentes ni el flujo de estados de
`citas`.

## Alcance

- Enviar un recordatorio de cita 24 horas antes mediante una plantilla Utility
  registrada en Infobip.
- Ofrecer respuestas `Confirmar` y `Cancelar` y persistir el resultado en la
  cita pendiente.
- Conservar el programador actual, la ventana de cinco minutos y la
  idempotencia de envios y respuestas.
- Documentar los secretos y la configuracion del remitente, plantilla y webhook
  de Infobip.

## Diseno

`whatsapp-reminders` conserva su consulta a `citas`, normalizacion de telefonos
y actualizacion de estados. Sustituye la llamada HTTP de Twilio por la API de
Infobip, autenticada con una API key de alcance minimo. La plantilla se envia
por nombre e idioma y recibe las variables de fecha y hora ya calculadas.

`whatsapp-webhook` recibe el POST JSON de Infobip. Exige un encabezado de
autorizacion cuyo valor coincide en tiempo constante con un secreto de Supabase.
Extrae el telefono, `messageId` y la respuesta de texto o boton; despues aplica
la misma transicion confirmada/cancelada a una cita pendiente. El `messageId`
se conserva en `whatsapp_respuesta_sid`, cuyo indice unico evita procesar una
respuesta mas de una vez.

## Configuracion

Los secretos requeridos son `INFOBIP_BASE_URL`, `INFOBIP_API_KEY`,
`INFOBIP_WHATSAPP_FROM`, `INFOBIP_TEMPLATE_NAME`,
`INFOBIP_TEMPLATE_LANGUAGE` e `INFOBIP_WEBHOOK_SECRET`, ademas de los secretos
existentes de Supabase, cron y codigo de pais. Ninguna clave se versiona.

En Infobip se registra el numero de la clinica, se aprueba una plantilla Utility
de recordatorio con botones rapidos para confirmar o cancelar, y se configura
el webhook HTTPS con el encabezado secreto. El recordatorio se envia solo a
pacientes que hayan aceptado recibirlo por WhatsApp.

## Errores y seguridad

La funcion de recordatorios conserva `error_envio` sin revelar telefonos,
contenido de citas ni claves en su respuesta. El webhook rechaza peticiones sin
el secreto correcto antes de consultar la base. Los errores de proveedor se
guardan solo como diagnostico controlado asociado a la cita.

## Pruebas

Se agregan pruebas unitarias para construir el payload de plantilla, interpretar
las respuestas JSON de Infobip y rechazar webhooks sin autorizacion. Las pruebas
existentes de telefono, estado e idempotencia se ajustan para eliminar los
supuestos propios de Twilio.
