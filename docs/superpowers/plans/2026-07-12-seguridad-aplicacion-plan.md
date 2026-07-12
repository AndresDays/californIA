# Seguridad de Aplicacion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar exposiciones de datos medicos, asegurar automatizaciones de WhatsApp y hacer que los controles de acceso se apliquen en servidor y base de datos.

**Architecture:** El bucket de radiologia pasa a privado y el cliente solicita URLs firmadas bajo RLS. Las funciones publicas se autentican por secreto de cron o firma de Twilio; las funciones administrativas conservan verificacion de sesion y autorizacion por rol. Las migraciones activan RLS explicito y reducen el acceso anonimo del portal.

**Tech Stack:** React, Supabase Storage/Auth/Postgres RLS/Edge Functions, Jest.

---

### Task 1: Storage privado de radiologia

**Files:**
- Modify: `supabase/migrations/20260511139000_storage_radiologia_imagenes.sql`
- Create: `supabase/migrations/20260712090000_securizar_storage_radiologia.sql`
- Modify: `src/pages/radiologia/pages/visor-paciente.jsx`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Test: `src/pages/radiologia/pages/visor-paciente.test.jsx`
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] Escribir pruebas que esperen `createSignedUrl` para imagenes DICOM.
- [ ] Ejecutar las pruebas y confirmar que fallan porque se usa `getPublicUrl`.
- [ ] Crear una migracion que fuerce `public = false` para el bucket `radiologia`.
- [ ] Generar URLs firmadas de 15 minutos antes de crear cada `wadouri:`.
- [ ] Ejecutar las pruebas de visor y verificar que pasan.

### Task 2: Recordatorios de WhatsApp autenticados

**Files:**
- Modify: `supabase/functions/whatsapp-reminders/index.ts`
- Modify: `supabase/functions/whatsapp-reminders/README.md`
- Create: `supabase/functions/_shared/request-auth.ts`
- Test: `src/utils/whatsapp-reminders.test.js`

- [ ] Escribir prueba para el comparador de secreto con rechazo ante valor ausente o distinto.
- [ ] Exigir `POST` y `Authorization: Bearer $REMINDERS_CRON_SECRET` antes de crear el cliente service-role.
- [ ] Reducir la respuesta a conteos, sin telefonos, errores de Twilio ni identificadores de citas.
- [ ] Documentar configuracion del secreto y una llamada de cron segura.

### Task 3: Webhook Twilio verificable e idempotente

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`
- Modify: `supabase/functions/whatsapp-webhook/README.md`
- Create: `src/utils/twilio-signature.js`
- Test: `src/utils/twilio-signature.test.js`
- Create: `supabase/migrations/20260712091000_webhook_whatsapp_idempotencia.sql`

- [ ] Verificar con una prueba que una firma valida se acepta y una invalida se rechaza.
- [ ] Validar `X-Twilio-Signature` sobre URL y parametros de formulario antes de leer/escribir citas.
- [ ] Guardar `MessageSid` procesado y rechazar reintentos duplicados.
- [ ] Relacionar la respuesta con la cita de recordatorio enviada, no solo con el primer telefono pendiente.

### Task 4: Credenciales, RLS y acceso externo

**Files:**
- Modify: `README.md`
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx`
- Create: `supabase/migrations/20260712092000_reforzar_rls_clinico.sql`
- Modify: `supabase/functions/admin-users/index.ts`
- Test: `src/utils/doctores-auth.test.js`

- [ ] Eliminar la credencial documentada y el flujo que persiste `contrasena` en `doctores`.
- [ ] Activar RLS explicitamente en tablas clinicas y conservar solo las politicas necesarias por rol.
- [ ] Hacer que el alta y cambio de contrasena de doctores use exclusivamente Supabase Auth.
- [ ] Restringir CORS de funciones administrativas a origenes de produccion configurados.

### Task 5: Portal, endurecimiento y auditoria

**Files:**
- Create: `supabase/migrations/20260712093000_portal_resultados_seguro.sql`
- Modify: `src/components/ModalAgregarUsuario.jsx`
- Modify: `src/pages/perfil.jsx`
- Create: `docs/seguridad-operacion.md`

- [ ] Añadir control de intentos y auditoria al portal de resultados publico.
- [ ] Exigir contrasenas de al menos 12 caracteres en altas y cambios.
- [ ] Documentar MFA obligatorio para administradores, rotacion de secretos y pruebas RLS por rol.
