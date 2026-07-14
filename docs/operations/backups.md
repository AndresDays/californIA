# Respaldos cifrados en AWS S3

Esta operacion crea respaldos diarios de Supabase Postgres y Supabase Storage en
un bucket privado de AWS S3 con versionado, cifrado KMS y Object Lock.

## Alcance

- Postgres se respalda con `pg_dump --format=custom`.
- Cada bucket de Supabase Storage se sincroniza via S3-compatible API, se empaqueta
  como `tar` y se cifra con `age`.
- El job escribe un `manifest.json` con nombres de artefactos y SHA-256.
- Los respaldos diarios quedan bajo `daily/YYYY-MM-DD/`.
- El dia 1 de cada mes tambien se copia bajo `monthly/YYYY-MM/` y se extiende su
  Object Lock a 397 dias.

## Secretos

No guardes estos valores en Terraform, Git, Vercel ni en tickets.

El secreto de AWS Secrets Manager debe ser un JSON con estas llaves:

```json
{
  "SUPABASE_DB_URL": "postgresql://...",
  "SUPABASE_S3_ENDPOINT": "https://...",
  "SUPABASE_S3_ACCESS_KEY_ID": "...",
  "SUPABASE_S3_SECRET_ACCESS_KEY": "...",
  "BACKUP_AGE_PUBLIC_KEY": "age1..."
}
```

La llave privada de `age` no se carga al job diario. Debe mantenerse fuera de AWS
y solo usarse durante restauraciones controladas.

## Crear infraestructura

1. Copia el ejemplo y ajusta bucket, subnets, security groups y correo.

   ```bash
   cp infra/aws-backups/terraform.tfvars.example infra/aws-backups/terraform.tfvars
   ```

2. Inicializa y revisa el plan.

   ```bash
   cd infra/aws-backups
   terraform init
   terraform plan
   ```

3. Aplica solo despues de revisar el plan.

   ```bash
   terraform apply
   ```

4. Confirma la suscripcion SNS que llega al correo configurado en `alert_email`.

5. Carga el valor del secreto `backup_runtime` desde AWS Console o AWS CLI. No lo
   pongas como `aws_secretsmanager_secret_version` en Terraform para evitar que
   quede en el estado.

## Publicar imagen

Despues de `terraform apply`, toma el output `ecr_repository_url` y publica la
imagen:

```bash
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker build -t california-backup:latest backups
docker tag california-backup:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

Cuando el secreto y la imagen existan, activa el schedule:

```bash
cd infra/aws-backups
terraform apply -var="schedule_enabled=true"
```

## Verificacion diaria

- Revisa que exista un prefijo nuevo en `daily/YYYY-MM-DD/`.
- Verifica que haya `database.dump.age`, `manifest.json` y un `.tar.age` por cada
  bucket de Storage configurado.
- Si CloudWatch marca `FailedInvocations`, revisa los logs en
  `/ecs/california-production-backup`.

## Restauracion mensual validada

La restauracion se hace siempre hacia staging o hacia un proyecto temporal de
Supabase. Nunca se sobrescribe produccion durante una prueba. El flujo siguiente
refleja la prueba validada contra el proyecto de staging de CalifornIA.

1. Descarga los artefactos de un respaldo.

   ```bash
   AWS_PROFILE=<aws-profile> aws s3 sync \
     s3://<backup-bucket>/daily/YYYY-MM-DD \
     /tmp/california-restore/YYYY-MM-DD \
     --region <aws-region>
   ```

2. Descifra Postgres con la llave privada custodiada fuera de AWS.

   ```bash
   age -d -i age-private-key.txt \
     -o /tmp/california-restore/YYYY-MM-DD/database.dump \
     /tmp/california-restore/YYYY-MM-DD/database.dump.age
   ```

3. Restaura solo el schema `public` a staging o temporal. Antes de restaurar,
   confirma que la URL apunta al proyecto no productivo.

   ```bash
   export STAGING_DB_URL='<session-pooler-url-de-staging>'

   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 \
     -c "drop schema public cascade; create schema public; grant usage on schema public to postgres, anon, authenticated, service_role; grant all on schema public to postgres, service_role;"

   pg_restore \
     --no-owner \
     --no-privileges \
     --schema=public \
     --dbname "$STAGING_DB_URL" \
     /tmp/california-restore/YYYY-MM-DD/database.dump
   ```

4. Descifra y sube cada bucket de Storage al proyecto temporal. En Supabase
   Storage compatible con S3, usa `copy` con `--no-update-modtime` para evitar
   errores de `CopyObject` al conservar timestamps.

   ```bash
   age -d -i age-private-key.txt \
     -o /tmp/california-restore/YYYY-MM-DD/radiologia.tar \
     /tmp/california-restore/YYYY-MM-DD/radiologia.tar.age

   mkdir -p /tmp/california-restore/YYYY-MM-DD/storage
   tar -C /tmp/california-restore/YYYY-MM-DD/storage \
     -xf /tmp/california-restore/YYYY-MM-DD/radiologia.tar

   rclone --config /tmp/rclone-staging.conf copy \
     /tmp/california-restore/YYYY-MM-DD/storage/radiologia \
     staging:radiologia \
     --s3-no-head \
     --ignore-times \
     --no-update-modtime \
     --transfers 4 \
     --checkers 4
   ```

5. Reaplica permisos base sobre `public`. Esto no desactiva RLS; solo permite
   que los roles de Supabase intenten acceder a las tablas restauradas.

   ```sql
   grant usage on schema public to anon, authenticated, service_role;

   grant select, insert, update, delete
   on all tables in schema public
   to authenticated;

   grant select
   on all tables in schema public
   to anon;

   grant usage, select
   on all sequences in schema public
   to authenticated;

   alter default privileges in schema public
   grant select, insert, update, delete on tables to authenticated;

   alter default privileges in schema public
   grant select on tables to anon;

   alter default privileges in schema public
   grant usage, select on sequences to authenticated;
   ```

6. Reaplica permisos de Storage para el bucket privado de radiologia.

   ```sql
   grant usage on schema storage to authenticated;
   grant select on storage.objects to authenticated;
   grant select on storage.buckets to authenticated;

   drop policy if exists radiologia_storage_select_authenticated on storage.objects;

   create policy radiologia_storage_select_authenticated
   on storage.objects
   for select
   to authenticated
   using (bucket_id = 'radiologia');
   ```

7. Crea o alinea el usuario de Auth de staging. Los respaldos restauran
   `public`, no deben depender de restaurar contrasenas de `auth.users`.

   ```sql
   select id, email, email_confirmed_at
   from auth.users
   where lower(email) = lower('<correo-de-staging>');

   update public.empleados
   set auth_uuid = '<auth-user-id-de-staging>'
   where lower(email) = lower('<correo-de-staging>');
   ```

   Si se requiere cambiar contrasena, usa la UI de Supabase Auth o Admin API con
   `service_role` desde terminal. No pegues `service_role` en chats, tickets,
   Vercel frontend ni archivos versionados.

8. Abre el proyecto temporal y valida:
   - login administrativo;
   - listado de pacientes;
   - visor DICOM con imagen;
   - reporte existente;
   - al menos una venta/cita reciente.

9. Confirma las rutas criticas en DevTools:
   - staging debe apuntar a `https://<staging-ref>.supabase.co`, sin `/rest/v1`;
   - `VITE_SUPABASE_ANON_KEY` debe enviar una publishable key completa, no el
     project ref;
   - no deben quedar respuestas `401`, `403` ni `object/sign` con `400`.

10. Borra el proyecto temporal despues de documentar el resultado de la prueba.

## Cadencia de prueba

- Ejecuta una restauracion controlada al menos una vez al mes.
- Registra fecha del backup, hora de inicio, hora de fin, persona responsable y
  evidencias validadas.
- Si la prueba falla, abre una incidencia antes de considerar sano el respaldo
  diario.
- Rota cualquier secreto usado manualmente si fue pegado en chats, screenshots,
  comandos compartidos o herramientas no destinadas a secretos.
