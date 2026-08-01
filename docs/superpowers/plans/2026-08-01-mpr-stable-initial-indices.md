# MPR Stable Initial Indices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conservar los índices centrales al abrir MPR.

**Architecture:** La carga inicial muestra los índices calculados por `obtenerIndicesInicialesMpr`. El bloque de alineación anatómica no escribirá índices durante esa inicialización asíncrona.

**Tech Stack:** React, Jest.

---

### Task 1: Evitar sobrescritura geométrica inicial

**Files:**

- Modify: `src/pages/radiologia/componentes/Mpr2dViewer.jsx:226-235`
- Test: `src/utils/mpr-loader.test.js:68-72`

- [ ] **Step 1: Confirm central indices**

Run: `./node_modules/.bin/jest --runInBand src/utils/mpr-loader.test.js --testNamePattern='restaurar MPR'`

Expected: PASS with `[47, 105, 89]`.

- [ ] **Step 2: Remove initial asynchronous index overwrite**

Do not call `setIndices(alineados)` or `onIndicesChange(alineados)` from the first-image loading block. Preserve the anatomical point for later interaction.

- [ ] **Step 3: Run MPR regression and lint**

Run: `./node_modules/.bin/jest --runInBand src/utils/mpr-loader.test.js src/pages/radiologia/pages/visor-dicom.test.jsx && ./node_modules/.bin/eslint src/pages/radiologia/componentes/Mpr2dViewer.jsx`

Expected: PASS with no lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/radiologia/componentes/Mpr2dViewer.jsx
git commit -m "fix: preserve mpr initial indices"
```
