# Scout Native Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evitar que SCOUT reciba el W/L genérico y conservar su viewport nativo.

**Architecture:** Un helper de serie identifica los localizadores CT. El panel recibe esa intención como preset nulo y omite el fallback W:2000/L:0 al mostrar la imagen.

**Tech Stack:** React, Cornerstone, Jest.

---

### Task 1: Preservar el W/L nativo de SCOUT

**Files:**

- Modify: `src/utils/dicom-series.js:21-34`
- Modify: `src/utils/dicom-series.test.js:18-31`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:486-524`
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx:600-640`

- [ ] **Step 1: Write the failing helper test**

```js
expect(obtenerPresetVentanaInicialSerie({ modalidad: 'CT', label: 'SCOUT' })).toBe('nativo');
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `./node_modules/.bin/jest --runInBand src/utils/dicom-series.test.js --testNamePattern='SCOUT'`

Expected: FAIL because SCOUT currently has no initial window behavior.

- [ ] **Step 3: Implement the native-window marker**

```js
if (/\b(scout|localiz(?:er|ador)?|topogram)\b/.test(etiqueta)) return 'nativo';
```

In `cargarImagen`, only apply the generic fallback when `presetVentanaId !== 'nativo'`. `aplicarPresetVentana` must treat `nativo` as no preset.

- [ ] **Step 4: Add and run panel regression coverage**

Add a SCOUT test asserting `setViewport` is not called with `{ windowWidth: 2000, windowCenter: 0 }` after load.

Run: `./node_modules/.bin/jest --runInBand src/utils/dicom-series.test.js src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `./node_modules/.bin/eslint src/utils/dicom-series.js src/pages/radiologia/pages/visor-dicom.jsx`

Expected: exit code 0 with no errors.

```bash
git add src/utils/dicom-series.js src/utils/dicom-series.test.js src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx
git commit -m "fix: preserve native window for scout series"
```
