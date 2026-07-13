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

## Restauracion mensual

La restauracion se hace siempre hacia un proyecto temporal de Supabase. Nunca se
sobrescribe produccion durante una prueba.

1. Descarga los artefactos de un respaldo.

   ```bash
   aws s3 sync s3://<backup-bucket>/daily/YYYY-MM-DD ./restore/YYYY-MM-DD
   ```

2. Descifra Postgres con la llave privada custodiada fuera de AWS.

   ```bash
   age -d -i age-private-key.txt \
     -o ./restore/YYYY-MM-DD/database.dump \
     ./restore/YYYY-MM-DD/database.dump.age
   ```

3. Restaura a una base temporal.

   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname "<temporary-supabase-db-url>" \
     ./restore/YYYY-MM-DD/database.dump
   ```

4. Descifra y sube cada bucket de Storage al proyecto temporal.

   ```bash
   age -d -i age-private-key.txt \
     -o ./restore/YYYY-MM-DD/radiologia.tar \
     ./restore/YYYY-MM-DD/radiologia.tar.age

   mkdir -p ./restore/YYYY-MM-DD/storage
   tar -C ./restore/YYYY-MM-DD/storage -xf ./restore/YYYY-MM-DD/radiologia.tar
   rclone sync ./restore/YYYY-MM-DD/storage/radiologia temporal:radiologia --fast-list
   ```

5. Abre el proyecto temporal y valida:
   - login administrativo;
   - listado de pacientes;
   - visor DICOM con imagen;
   - reporte existente;
   - al menos una venta/cita reciente.

6. Borra el proyecto temporal despues de documentar el resultado de la prueba.
