# WhatsApp appointment reminders

This Edge Function sends WhatsApp reminders for appointments scheduled about 24 hours from the current time.

## Required secrets

Set these Supabase secrets before deploying the function:

```bash
supabase secrets set INFOBIP_BASE_URL="https://<tu-subdominio>.api.infobip.com"
supabase secrets set INFOBIP_API_KEY="..."
supabase secrets set INFOBIP_WHATSAPP_FROM="5213221234567"
supabase secrets set INFOBIP_TEMPLATE_NAME="recordatorio_cita"
supabase secrets set INFOBIP_TEMPLATE_LANGUAGE="es_MX"
supabase secrets set WHATSAPP_DEFAULT_COUNTRY_CODE="52"
supabase secrets set REMINDERS_CRON_SECRET="<genera-un-secreto-largo-aleatorio>"
```

`INFOBIP_WHATSAPP_FROM` debe ser el remitente de WhatsApp registrado en Infobip, sin el prefijo `+`.
`INFOBIP_API_KEY` debe tener como minimo el alcance `whatsapp:message:send`.
Registra y aprueba en Infobip una plantilla Utility llamada como `INFOBIP_TEMPLATE_NAME`, con dos variables de cuerpo (fecha y hora) y botones de respuesta rapida con los payloads `confirmar_cita` y `cancelar_cita`.

## Deploy

```bash
supabase db push
supabase functions deploy whatsapp-reminders --no-verify-jwt
```

## Schedule

Run the function every 5 minutes from Supabase Scheduled Functions or any cron service:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/whatsapp-reminders" \
  -H "Authorization: Bearer $REMINDERS_CRON_SECRET"
```

La funcion solo acepta `POST` autenticado con `REMINDERS_CRON_SECRET`. Configura ese encabezado en el programador que ejecute la llamada cada cinco minutos. Solo envia recordatorios para citas en la ventana de 24 horas y omite filas con `whatsapp_recordatorio_enviado_at`.
