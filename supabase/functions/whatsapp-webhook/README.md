# WhatsApp confirmation webhook

This Edge Function receives Infobip WhatsApp text or button responses and updates the latest pending appointment for the sender.

## Deploy

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Configura los secretos antes de desplegar:

```bash
supabase secrets set INFOBIP_WEBHOOK_SECRET="<genera-un-secreto-largo-aleatorio>"
supabase secrets set WHATSAPP_DEFAULT_COUNTRY_CODE="52"
```

## Infobip setup

Configura esta URL HTTPS como el webhook de eventos `INBOUND_MESSAGE`:

```txt
https://<project-ref>.functions.supabase.co/whatsapp-webhook
```

Configura el metodo `POST` y el encabezado:

```txt
Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>
```

Supported button payloads:

- `confirmar_cita`
- `cancelar_cita`

The function updates:

- `citas.estado`
- `citas.whatsapp_confirmacion_estado`
- `citas.whatsapp_confirmacion_respuesta`
- `citas.whatsapp_confirmacion_at`

El endpoint valida el encabezado `Authorization` antes de consultar citas. Cada `messageId` entrante se procesa una sola vez.
