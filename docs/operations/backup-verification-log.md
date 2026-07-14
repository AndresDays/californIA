# Registro de verificacion de backups

Usa este archivo como plantilla para registrar pruebas manuales de backup y
restore. No pegues URLs de base de datos, llaves privadas, service role keys,
passwords ni tokens.

## Plantilla de verificacion diaria

```md
## YYYY-MM-DD

- Responsable:
- Entorno validado: produccion / staging / temporal
- Backup esperado:
  - S3 prefix: daily/YYYY-MM-DD/
  - `database.dump.age`: presente / ausente
  - `manifest.json`: presente / ausente
  - `radiologia.tar.age`: presente / ausente
- EventBridge:
  - Regla: california-production-daily-backup
  - Estado: ENABLED / DISABLED
  - Ultima ejecucion revisada:
- CloudWatch:
  - Log group: /ecs/california-production-backup
  - Resultado: exitoso / fallido
  - Exit code:
- Manifest:
  - SHA-256 revisado: si / no
- Resultado:
  - OK / FALLA
- Incidencia abierta:
```

## Plantilla de restore mensual

```md
## YYYY-MM restore mensual

- Responsable:
- Backup restaurado: daily/YYYY-MM-DD/
- Destino: staging / proyecto temporal
- Inicio:
- Fin:
- Base de datos:
  - `database.dump.age` descifrado: si / no
  - `pg_restore --schema=public`: exitoso / fallido
  - grants aplicados: si / no
- Storage:
  - `radiologia.tar.age` descifrado: si / no
  - objetos subidos con rclone: si / no
  - `dx2.dcm` u otro DICOM validado: si / no
  - signed URL funciona: si / no
- Auth:
  - usuario de staging creado/alineado: si / no
  - `empleados.auth_uuid` coincide: si / no
- App:
  - login: si / no
  - dashboard sin 401/403: si / no
  - radiologia abre: si / no
  - visor DICOM carga imagen: si / no
  - reporte existente visible: si / no
- Observaciones:
- Secretos rotados por exposicion durante la prueba: si / no / no aplica
- Resultado final:
  - OK / FALLA
```

## Comandos de referencia

Listar artefactos de un dia:

```bash
AWS_PROFILE=california aws s3 ls \
  s3://california-production-encrypted-backups-501804114914/daily/YYYY-MM-DD/ \
  --region mx-central-1
```

Revisar regla programada:

```bash
AWS_PROFILE=california aws events describe-rule \
  --region mx-central-1 \
  --name california-production-daily-backup \
  --query "{Name:Name,State:State,ScheduleExpression:ScheduleExpression}"
```

Revisar logs recientes:

```bash
AWS_PROFILE=california aws logs tail /ecs/california-production-backup \
  --region mx-central-1 \
  --since 30m
```

Si AWS CLI responde que el token SSO expiro, renueva sesion:

```bash
aws sso login --profile california
```
