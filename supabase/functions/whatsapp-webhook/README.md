# WhatsApp confirmation webhook

This Edge Function receives Twilio WhatsApp button responses and updates the latest pending appointment for the sender.

## Deploy

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## Twilio setup

Use this URL as the WhatsApp sandbox inbound webhook:

```txt
https://<project-ref>.functions.supabase.co/whatsapp-webhook
```

Set the method to `POST`.

Supported button payloads:

- `confirmar_cita`
- `cancelar_cita`

The function updates:

- `citas.estado`
- `citas.whatsapp_confirmacion_estado`
- `citas.whatsapp_confirmacion_respuesta`
- `citas.whatsapp_confirmacion_at`
