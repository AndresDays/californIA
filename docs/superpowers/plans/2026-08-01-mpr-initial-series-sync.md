# MPR Initial Series Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar los paneles MPR con los índices correctos al estar listas sus series.

**Architecture:** El efecto de `seriesSeleccionadas` sustituirá el clamp de índices provisionales por el cálculo de índices iniciales en la primera sincronización. Las sesiones restauradas siguen usando sus índices guardados.

**Tech Stack:** React, Cornerstone, Jest.

---

### Task 1: Recalcular índices al sincronizar series MPR

**Files:**

- Modify: `src/pages/radiologia/componentes/Mpr2dViewer.jsx:166-181`
- Test: `src/pages/radiologia/componentes/Mpr2dViewer.test.jsx`

- [ ] **Step 1: Write the failing regression test**

Render MPR con series aún vacías y vuelve a renderizar con totales Axial 95, Sagital 211 y Coronal 179. Verifica que los índices emitidos son `[47, 105, 89]`, no `[0, 0, 0]`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `./node_modules/.bin/jest --runInBand src/pages/radiologia/componentes/Mpr2dViewer.test.jsx --testNamePattern='sincroniza índices iniciales'`

Expected: FAIL because the current effect only clamps existing zero indices.

- [ ] **Step 3: Implement first-ready synchronization**

Use a ref to initialize only once per `seriesSeleccionadas` lifecycle. With `restaurarIndices` false, assign `obtenerIndicesInicialesMpr(obtenerTotales())`; with a valid restored set, retain it.

- [ ] **Step 4: Run related tests**

Run: `./node_modules/.bin/jest --runInBand src/pages/radiologia/componentes/Mpr2dViewer.test.jsx src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `./node_modules/.bin/eslint src/pages/radiologia/componentes/Mpr2dViewer.jsx`

Expected: exit code 0 with no errors.

```bash
git add src/pages/radiologia/componentes/Mpr2dViewer.jsx src/pages/radiologia/componentes/Mpr2dViewer.test.jsx
git commit -m "fix: initialize mpr indices after series sync"
```
