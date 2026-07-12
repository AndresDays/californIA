# WhatsApp appointment reminders

This Edge Function sends WhatsApp reminders for appointments scheduled about 24 hours from the current time.

## Required secrets

Set these Supabase secrets before deploying the function:

```bash
supabase secrets set TWILIO_ACCOUNT_SID="AC..."
supabase secrets set TWILIO_AUTH_TOKEN="..."
supabase secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
supabase secrets set TWILIO_CONTENT_SID="HX..."
supabase secrets set WHATSAPP_DEFAULT_COUNTRY_CODE="52"
supabase secrets set REMINDERS_CRON_SECRET="<genera-un-secreto-largo-aleatorio>"
```

`TWILIO_WHATSAPP_FROM` must be the WhatsApp sender configured in Twilio.
`TWILIO_CONTENT_SID` is the appointment reminder template SID from Twilio. If it is omitted, the function falls back to a plain `Body` message.

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
