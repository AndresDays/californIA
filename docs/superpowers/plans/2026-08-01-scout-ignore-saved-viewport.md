# Scout Ignore Saved Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evitar que un viewport guardado cambie el W/L nativo de SCOUT.

**Architecture:** Al cargar una imagen, se determina si la serie recibió el marcador `nativo`. En ese caso se restauran overlays pero se omite `setViewport(estado.viewport)`.

**Tech Stack:** React, Cornerstone, Jest.

---

### Task 1: Omitir viewport guardado en SCOUT

**Files:**

- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx:620-680`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:505-518`

- [ ] **Step 1: Write the failing test**

```jsx
test('SCOUT no restaura el viewport guardado', async () => {
  // Configura SCOUT con estadoVista.viewport W:2000/L:0.
  // Carga el visor y verifica que setViewport no recibe ese VOI.
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `./node_modules/.bin/jest --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx --testNamePattern='SCOUT no restaura'`

Expected: FAIL because `cargarImagen` restaura `estado.viewport` para todas las series.

- [ ] **Step 3: Implement the native SCOUT guard**

```js
if (estado && presetVentanaId !== 'nativo') {
  cs.setViewport(el, estado.viewport);
}
```

Keep restoration of `estado.overlays` outside this guard.

- [ ] **Step 4: Run related tests**

Run: `./node_modules/.bin/jest --runInBand src/utils/dicom-series.test.js src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `./node_modules/.bin/eslint src/pages/radiologia/pages/visor-dicom.jsx`

Expected: exit code 0 with no errors.

```bash
git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx
git commit -m "fix: keep native scout viewport"
```
