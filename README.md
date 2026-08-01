# California

* Hacer `npm install` para descargar los modules
* Crear archivo `.env` en la base del proyecto con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` proporcionadas por el administrador del proyecto.
* No documentar ni compartir usuarios, contraseñas, tokens ni claves `service_role` en el repositorio.
* Para correr proyecto `npm run dev`

## Staging

El proyecto de staging usa su propio proyecto de Supabase y nunca debe reutilizar datos, claves ni secretos de produccion.

1. Para inicializar un proyecto de Supabase vacio una sola vez, ejecuta:

   ```bash
   SUPABASE_STAGING_PROJECT_REF=<staging-ref> npm run bootstrap:staging
   ```

   El comando rechaza la referencia de produccion y aplica la migracion base sin datos clinicos.

2. En Supabase, abre **Settings > API** del proyecto staging y toma su `Project URL` y publishable key.
3. En Vercel, configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para **Preview**, restringidas a la rama `staging`.
4. En Supabase Auth agrega `https://staging.californiadiagnostica.com` a los Redirect URLs.
5. Configura WhatsApp solo con el remitente compartido de prueba de Infobip o deja sus secretos sin definir. Nunca copies credenciales de Infobip de produccion.
6. Para revisar las tablas requeridas, usa una URL de conexion de staging solo en tu terminal:

   ```bash
   DATABASE_URL='<session-pooler-url-de-staging>' npm run verify:staging
   ```

   El verificador no imprime la URL ni la guarda en archivos.

## Monitoreo de errores

Sentry es opcional en desarrollo local y se activa solo cuando existe
`VITE_SENTRY_DSN`. Configura estas variables en Vercel, sin agregarlas a
archivos versionados:

| Entorno de Vercel | Variable | Valor |
| --- | --- | --- |
| Preview, rama `staging` | `VITE_SENTRY_DSN` | DSN del proyecto o entorno de staging en Sentry |
| Preview, rama `staging` | `VITE_APP_ENV` | `staging` |
| Production | `VITE_SENTRY_DSN` | DSN del proyecto o entorno de produccion en Sentry |
| Production | `VITE_APP_ENV` | `production` |
| Ambos, opcional | `VITE_APP_RELEASE` | SHA del commit publicado |

La aplicacion desactiva la recoleccion de PII, trazas y breadcrumbs. Antes de
enviar un evento elimina solicitudes, usuarios, datos extra y breadcrumbs. No
habilites Session Replay, captura de red ni adjuntos para esta aplicacion.

## Respaldos

Los respaldos de produccion deben ejecutarse fuera de Vercel, desde AWS Fargate,
y guardarse cifrados en S3 con KMS y Object Lock. La configuracion vive en
`infra/aws-backups` y la guia operativa esta en `docs/operations/backups.md`.

No subas URLs de base de datos, credenciales S3-compatible de Supabase, claves
privadas de `age` ni secretos de AWS al repositorio.

## Preparacion comercial

Antes de vender o entregar la plataforma a una clinica, revisa
`docs/operations/production-readiness.md`. Esa guia concentra los criterios de
ambientes, restore, monitoreo, seguridad, onboarding, soporte y documentos
legales minimos.

Documentos operativos relacionados:

- `docs/operations/backup-verification-log.md`
- `docs/operations/access-control.md`
- `docs/operations/clinic-onboarding.md`
- `docs/operations/support-runbook.md`
