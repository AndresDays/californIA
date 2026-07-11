# Doctores externos en Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear y vincular automaticamente una cuenta de Supabase Authentication al dar de alta un doctor externo.

**Architecture:** La Edge Function `admin-users` conserva la autorizacion exclusiva para administradores y agrega acciones de provisionamiento para `doctores`. La pantalla de Doctores invoca la funcion para altas y para vincular registros antiguos; la autenticacion deja de aceptar sesiones locales no verificadas.

**Tech Stack:** React, Supabase JS, Supabase Edge Functions, Jest.

---

### Task 1: Contrato de provisionamiento de doctor

**Files:**
- Create: `src/utils/doctores-auth.js`
- Test: `src/utils/doctores-auth.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('solicita crear doctor con Authentication', async () => {
  const invoke = jest.fn().mockResolvedValue({ data: { doctor: { id_doctor: 3 } }, error: null });
  await crearDoctorConAuthentication({ functions: { invoke } }, { email: 'doc@example.com', contrasena: 'secreta' });
  expect(invoke).toHaveBeenCalledWith('admin-users', expect.objectContaining({ body: expect.objectContaining({ action: 'createDoctor' }) }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/doctores-auth.test.js --runInBand`
Expected: FAIL because `crearDoctorConAuthentication` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const crearDoctorConAuthentication = (supabase, doctor) =>
  supabase.functions.invoke('admin-users', { body: { action: 'createDoctor', doctor } });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/doctores-auth.test.js --runInBand`
Expected: PASS.

### Task 2: Crear y vincular usuarios desde la Edge Function

**Files:**
- Modify: `supabase/functions/admin-users/index.ts`

- [ ] **Step 1: Add createDoctor action**

Create the Auth account with `auth.admin.createUser`, insert the doctor with `auth_uuid`, and delete the Auth account if the insert fails.

- [ ] **Step 2: Add provisionDoctorAuth action**

For an existing doctor without `auth_uuid`, create the Auth account and update that doctor's `auth_uuid`; delete the Auth account if the update fails.

### Task 3: Use the contract from Administrar Doctores

**Files:**
- Modify: `src/pages/laboratorio/doctores.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-agregar-doctor.jsx`
- Modify: `src/context/auth-context.jsx`

- [ ] **Step 1: Require email and password for a new doctor**

The modal must reject creation without both values because those credentials are used for Authentication.

- [ ] **Step 2: Create through createDoctor**

Replace the direct new-doctor insert with `createDoctor`, invalidate the doctors query, and show a single success notification.

- [ ] **Step 3: Provision legacy doctor accounts on edit**

When a pre-existing doctor has no `auth_uuid` and receives a password, invoke `provisionDoctorAuth` after the doctor record is updated.

- [ ] **Step 4: Remove local doctor password authentication fallback**

Failed Supabase Auth login returns the normal invalid-credentials result rather than constructing a `doctor:<id>` session.

### Task 4: Verify

**Files:**
- Test: `src/utils/doctores-auth.test.js`
- Test: `src/context/auth-context.test.jsx`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/utils/doctores-auth.test.js src/context/auth-context.test.jsx --runInBand`
Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exit code 0.
