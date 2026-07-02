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
curl -X POST "https://<project-ref>.functions.supabase.co/whatsapp-reminders"
```

The function only sends reminders for appointments in the 24-hour window and skips rows that already have `whatsapp_recordatorio_enviado_at`.
