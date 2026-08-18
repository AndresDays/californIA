# Completar interpretación de imagen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liberar una interpretación radiológica finalizada para Entrega de resultados sin enviar WhatsApp desde el visor.

**Architecture:** `visor-dicom.jsx` conservará una ruta de guardado de borrador y añadirá una ruta explícita de finalización. La finalización actualiza las dos entidades que ya consulta Entrega: `estudios_venta` y `estudios_radiologia`; Entrega reutiliza su WhatsApp existente.

**Tech Stack:** React, Jest/RTL, Supabase.

---

### Task 1: Cobertura del control en el visor

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
test('muestra Completar interpretación junto a Guardar para un usuario que puede editar', async () => {
  mockEmpleadoVisor = { rol: 'radiologo' };
  await renderVisor();
  fireEvent.click(screen.getByTitle('Abrir reporte'));
  expect(screen.getByRole('button', { name: 'Completar interpretación' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 3: Add the minimal action and control**

Add `completarInterpretacion` beside `guardarReporte`; require non-empty report text, save its report data, update `estudios_venta` to `validado` and `estudios_radiologia` to `listo_entrega: true`, then create the existing audit/notification records for Entrega.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

### Task 2: Regression verification

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`
- Test: `src/utils/entrega-resultados.test.js`

- [ ] **Step 1: Run focused suite**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx src/utils/entrega-resultados.test.js`

- [ ] **Step 2: Run production build**

Run: `npm run build`

- [ ] **Step 3: Inspect the diff**

Run: `git diff --check && git diff -- src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx`
