# Acciones de cita desde calendario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir acciones de editar, cancelar o pasar a estudio al seleccionar una cita del calendario.

**Architecture:** `CalendarioCitas` conservará la cita activa y mostrará un modal de acciones. El editor existente se reutiliza; la cancelación actualiza el estado con confirmación; el flujo a Nuevo paciente reutiliza la ruta existente con `citaId`.

**Tech Stack:** React, React Router, React Query, Supabase, Jest.

---

### Task 1: Acciones desde una tarjeta

**Files:**
- Modify: `src/pages/laboratorio/calendario-citas.jsx`
- Modify: `src/pages/laboratorio/calendario-citas.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
fireEvent.click(screen.getByRole('button', { name: /abrir acciones de cita/i }));
expect(screen.getByRole('dialog', { name: /acciones de cita/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /pasar a estudio/i })).toBeInTheDocument();
```

- [ ] **Step 2: Verify red**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: FAIL because cards are not buttons and no action dialog exists.

- [ ] **Step 3: Implement action state and dialog**

Make each `.cal-card` a button with `aria-label="Abrir acciones de cita ..."`. Store `citaActiva`; render a `role="dialog" aria-label="Acciones de cita"` with Editar cita, Cancelar cita and Pasar a estudio. Use `useNavigate()` and `navigate('/nuevo-paciente?citaId=' + citaActiva.id_cita, { state: { citaId: citaActiva.id_cita } })`.

- [ ] **Step 4: Verify green**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: PASS.

### Task 2: Edición y cancelación confirmada

**Files:**
- Modify: `src/pages/laboratorio/calendario-citas.jsx`
- Modify: `src/pages/laboratorio/calendario-citas.test.jsx`

- [ ] **Step 1: Write failing cancellation test**

```jsx
fireEvent.click(screen.getByRole('button', { name: /cancelar cita/i }));
fireEvent.click(screen.getByRole('button', { name: /confirmar cancelacion/i }));
expect(supabase.from('citas').update).toHaveBeenCalledWith({ estado: 'cancelada' });
```

- [ ] **Step 2: Verify red**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: FAIL because no confirmed state update exists.

- [ ] **Step 3: Implement cancellation and editor reuse**

Show a confirmation panel after Cancelar cita; only its Confirmar cancelación button calls `supabase.from('citas').update({ estado: 'cancelada' }).eq('id_cita', citaActiva.id_cita)`. On success invalidate `['citas']`, close the dialogs, and render `EditarCitaModal` with the selected cita. Its update callback invalidates `['citas']` and closes it.

- [ ] **Step 4: Verify focused suite and build**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx && npm run build`

Expected: tests pass and Vite exits with code 0.
