# Avisos por correo

Vacía `public.notificaciones_correo`: toma los renglones pendientes, los manda por
Infobip Email y los marca. El texto del mensaje viene ya redactado desde la base
—lo escribe el disparador `avisar_solicitud_cancelada`—, así que esta función no
decide el contenido de nada.

Hoy la llena un solo disparador: el que avisa a administración, dirección y
desarrollo cuando se cancela una solicitud.

## Secretos

`INFOBIP_BASE_URL` e `INFOBIP_API_KEY` ya están configurados para
`whatsapp-reminders`; los comparte. Sólo faltan estos dos:

```bash
supabase secrets set INFOBIP_EMAIL_FROM="Centro Diagnostico California <avisos@tudominio.com>"
supabase secrets set ALERTAS_CRON_SECRET="<genera-un-secreto-largo-aleatorio>"
```

`INFOBIP_EMAIL_FROM` tiene que usar un dominio verificado en Infobip: sin eso el
envío se rechaza. La verificación se hace una vez, en el panel de Infobip
(Channels → Email → Domains), agregando los registros DNS que ahí se indican.
La API key necesita el alcance `email:message:send` además del de WhatsApp.

## Despliegue

```bash
supabase db push
supabase functions deploy alertas-correo --no-verify-jwt
```

## Programación

Cada 2 o 5 minutos, desde Supabase Scheduled Functions o cualquier cron:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/alertas-correo" \
  -H "Authorization: Bearer $ALERTAS_CRON_SECRET"
```

La función sólo acepta `POST` autenticado con `ALERTAS_CRON_SECRET`. Procesa
hasta 25 correos por corrida y responde con el resumen
(`{ revisados, enviados, errores, agotados }`).

## Cuando algo no llega

Todo queda en la tabla, así que la revisión es una consulta:

```sql
select id, destinatario, asunto, estado, intentos, error, created_at, enviado_at
from public.notificaciones_correo
order by created_at desc
limit 20;
```

- `pendiente` con `intentos` en 0 → todavía no corre el cron, o no está programado.
- `pendiente` con `intentos` en 1 o 2 → falló y se va a reintentar; `error` dice por qué.
- `error` → se agotaron los tres intentos. Lo más común es el remitente sin
  dominio verificado o una dirección mal escrita en `empleados.email`.
- Sin renglones para una cancelación → esa persona no tiene correo en
  `empleados.email`, o su rol no está en `destinatarios_alerta_direccion()`.
  La campana de la aplicación sí le llegó: esa no depende del correo.

Para reintentar a mano un correo que se dio por vencido:

```sql
update public.notificaciones_correo
set estado = 'pendiente', intentos = 0, error = null
where id = <id>;
```
