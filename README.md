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
5. Configura WhatsApp solo con sandbox de staging o deja sus secretos sin definir. Nunca copies las credenciales de Twilio de produccion.
6. Para revisar las tablas requeridas, usa una URL de conexion de staging solo en tu terminal:

   ```bash
   DATABASE_URL='<session-pooler-url-de-staging>' npm run verify:staging
   ```

   El verificador no imprime la URL ni la guarda en archivos.
