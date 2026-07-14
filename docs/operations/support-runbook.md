# Runbook de soporte

Este runbook define como atender incidentes y solicitudes de una clinica usando
CalifornIA.

## Canales

- Canal primario:
- Canal secundario:
- Responsable de guardia:
- Horario de atencion:

## Severidades

| Severidad | Ejemplos | Respuesta objetivo | Resolucion objetivo |
| --- | --- | --- | --- |
| Critica | App caida, login general fallando, DICOM no abre para todos | 30 min | 4 h |
| Alta | Cierre de caja incorrecto, reportes no se guardan, WhatsApp masivo falla | 2 h | 1 dia habil |
| Media | Error aislado por usuario, catalogo incorrecto, ajuste de permisos | 1 dia habil | 3 dias habiles |
| Baja | Cambio estetico, dudas operativas, solicitud de mejora | 2 dias habiles | Planificada |

## Primer diagnostico

Antes de cambiar datos o codigo:

1. Confirmar entorno: produccion o staging.
2. Capturar usuario, rol, sucursal, fecha y flujo afectado.
3. Revisar Sentry por errores nuevos.
4. Revisar Network para distinguir:
   - `401`: sesion, key o credenciales.
   - `403`: RLS, grants o permisos.
   - `400`: query, columna faltante, payload invalido o storage policy.
   - `5xx`: servicio externo, Supabase o funcion.
5. Revisar si el problema reproduce con otro usuario del mismo rol.

## Incidentes comunes

### Login falla

- Confirmar que el usuario existe en Supabase Auth.
- Confirmar que `public.empleados.auth_uuid` coincide con `auth.users.id`.
- Confirmar que el usuario esta activo.
- Si es staging, resetear password desde Auth o Admin API.

### Staging apunta a produccion

- Revisar `VITE_SUPABASE_URL` del deployment.
- Confirmar que staging usa la rama `staging` y environment `Preview`.
- Limpiar service worker/cache si sigue cargando un bundle anterior.

### DICOM no carga

- Confirmar que `storage.objects` contiene el objeto esperado.
- Confirmar grants y policy de `storage.objects` para `authenticated`.
- Confirmar que el bucket `radiologia` es privado y usa signed URLs.
- Revisar respuesta del request `storage/v1/object/sign/...`.

### Cierre de caja incorrecto

- Revisar venta ligada al movimiento.
- Validar forma de pago.
- En efectivo, revisar pago recibido, cambio e ingreso real.
- Comparar contra `movimientos_pago_venta`.

## Escalamiento

Escalar a desarrollo cuando:

- Hay error nuevo en Sentry con impacto de datos.
- Un flujo critico no tiene workaround.
- Una migracion o policy bloquea multiples usuarios.
- Hay sospecha de exposicion de secretos o datos clinicos.

## Cierre de incidente

Antes de cerrar:

- Registrar causa raiz.
- Registrar cambio aplicado.
- Confirmar con el usuario afectado.
- Agregar prueba preventiva si aplica.
- Si hubo secreto expuesto, confirmar rotacion.
