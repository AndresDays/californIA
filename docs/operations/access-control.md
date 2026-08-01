# Accesos operativos

Este documento registra quien administra los servicios externos de CalifornIA y
para que se usa cada uno. No se deben guardar aqui passwords, tokens, API keys,
service role keys, recovery codes ni secretos.

## Responsable actual

- Responsable operativo: Andres Diaz
- Alcance: administracion de producto, infraestructura, despliegues, base de
  datos, monitoreo, WhatsApp y backups.
- Revision sugerida: mensual, o cada vez que se agregue o retire una persona
  con acceso operativo.

## Vercel

- Uso: despliegue del frontend, dominios, previews y variables de entorno del
  cliente web.
- Responsable actual: Andres Diaz.
- Produccion: rama `main`.
- Staging: rama `staging`.
- Notas:
  - Las variables `VITE_*` son visibles para el navegador despues del build.
  - No guardar `service_role` ni secretos de servidor en variables `VITE_*`.
  - Despues de cambiar variables de entorno, hacer redeploy del ambiente
    correspondiente.

## Supabase produccion

- Uso: base de datos, Auth, Storage, Edge Functions y APIs de produccion.
- Responsable actual: Andres Diaz.
- Notas:
  - El frontend debe usar solo URL publica y publishable/anon key.
  - La `service_role` se usa unicamente en contextos server-side o scripts
    administrativos controlados.
  - Cualquier rotacion de llaves debe documentarse como evento operativo, sin
    copiar el valor de la llave.

## Supabase staging

- Uso: pruebas, restauraciones controladas, validacion de migraciones y
  verificacion antes de produccion.
- Responsable actual: Andres Diaz.
- Notas:
  - Mantener variables separadas de produccion.
  - Rotar cualquier secreto que haya sido pegado en chats, capturas o comandos
    compartidos.
  - Si se rota `service_role`, actualizar solo scripts o Edge Functions que la
    usen. No ponerla en Vercel frontend.

## AWS

- Uso: backups cifrados de Supabase, S3, KMS, ECS Fargate, EventBridge,
  CloudWatch, SNS y Secrets Manager.
- Responsable actual: Andres Diaz.
- Region principal: `mx-central-1`.
- Notas:
  - Backups diarios corren por EventBridge.
  - Alertas de fallo de backup se envian por SNS.
  - Los secretos de runtime viven en Secrets Manager.
  - La llave privada de Age para restauracion debe guardarse fuera del repo y
    tratarse como secreto critico.

## Infobip

- Uso: WhatsApp para recordatorios y confirmacion/cancelacion de citas.
- Responsable actual: Andres Diaz.
- Notas:
  - La API key de Infobip debe vivir como secreto de Supabase Edge Functions y tener solo el alcance `whatsapp:message:send`.
  - No guardar credenciales de Infobip ni secretos de webhook en el frontend.
  - Los webhooks de Infobip deben incluir el encabezado de autorizacion configurado en `INFOBIP_WEBHOOK_SECRET`.

## Sentry

- Uso: monitoreo de errores del frontend y alertas de produccion.
- Responsable actual: Andres Diaz.
- Notas:
  - Environment `production` debe usarse para alertas operativas.
  - Hay alertas para errores de produccion y picos de errores.
  - El DSN publico puede estar en Vercel como `VITE_SENTRY_DSN`; no es una llave
    de escritura administrativa.

## Proceso al retirar acceso

Cuando una persona deje de colaborar en el proyecto:

1. Remover acceso de Vercel.
2. Remover acceso de Supabase.
3. Remover acceso de AWS IAM Identity Center.
4. Remover acceso de Infobip.
5. Remover acceso de Sentry.
6. Rotar secretos si la persona tuvo acceso a llaves administrativas.
7. Revisar que no queden sesiones o tokens personales activos.

## Proceso al agregar acceso

Antes de agregar a una persona:

1. Definir que servicio necesita y por que.
2. Otorgar el menor permiso suficiente.
3. Activar 2FA cuando el servicio lo permita.
4. Registrar el nuevo responsable o colaborador en este documento.
5. Evitar compartir secretos por chat; usar el gestor de secretos del servicio.
