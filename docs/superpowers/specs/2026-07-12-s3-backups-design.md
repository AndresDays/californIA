# Respaldos Cifrados en Amazon S3

## Objetivo

Crear copias diarias, cifradas y recuperables de la base de datos y todos los
objetos de Supabase Storage. El proceso debe ejecutarse fuera de una computadora
personal y conservar una copia inmutable fuera de Supabase.

## Arquitectura

EventBridge inicia cada madrugada una tarea efimera de ECS Fargate. La tarea
ejecuta un contenedor de respaldo que obtiene secretos de AWS Secrets Manager,
exporta Postgres y sincroniza los buckets de Storage. El resultado se cifra
localmente con una clave de respaldo antes de llegar a S3.

El bucket S3 es privado, versionado y habilita Object Lock. Sus prefijos son:

- `daily/YYYY-MM-DD/` para copias diarias.
- `monthly/YYYY-MM/` para retencion mensual.
- `manifests/` para checksums, tamanos y metadatos no clinicos.

Una regla de ciclo de vida conserva diarios por 30 dias y mensuales por 12
meses, trasladando los mensuales a Glacier Deep Archive. Object Lock protege
diarios por 35 dias y mensuales por 13 meses para evitar que una eliminacion
maliciosa o accidental borre el ultimo respaldo recuperable.

## Seguridad

- El contenedor recibe los secretos en ejecucion; ningun valor sensible se
  versiona en Git ni se imprime en logs.
- La tarea usa un rol IAM dedicado con acceso minimo a un prefijo especifico
  del bucket y a los secretos que requiere.
- El bucket bloquea acceso publico, exige TLS y aplica cifrado del lado del
  servidor mediante SSE-KMS.
- La clave de cifrado del archivo se conserva solo en Secrets Manager y se
  rota mediante un procedimiento controlado.
- Los logs contienen fecha, tamanos, hashes y estado; nunca nombres de
  pacientes, contenido de estudios, contrasenas o claves.

## Datos incluidos

- Roles, esquema y datos de Postgres mediante exportaciones logicas.
- Objetos de todos los buckets de Supabase Storage, incluidas imagenes DICOM.
- Un manifiesto con hashes SHA-256 de cada artefacto.

## Operacion y restauracion

CloudWatch alerta cuando una tarea falla, cuando no existe un manifiesto diario
o cuando falla una verificacion de checksum. Una restauracion mensual se hace
en un proyecto Supabase temporal con un bucket aislado; nunca se restaura sobre
produccion para probar el respaldo.

## Fuera de alcance

- Point-in-Time Recovery de Supabase.
- Replicacion multi-region de S3.
- Restauraciones automaticas sobre produccion.
- Cambios a datos clinicos existentes.
