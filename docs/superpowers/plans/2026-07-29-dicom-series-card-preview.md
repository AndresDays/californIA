# DICOM Series Card Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace individual sidebar image thumbnails with one preview card per DICOM series.

**Architecture:** A `MiniaturaSerieDicom` component initializes Cornerstone on a small canvas and loads the series first image. `VisorDicom` renders one card per grouped series and preserves selection through the existing `seleccionarSerieDicom` callback.

**Tech Stack:** React 18, Cornerstone Core, Jest, React Testing Library, CSS.

---

### Task 1: Add preview-card regression coverage

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 1: Write failing tests**

  Add a two-series fixture and assert exactly two series-card buttons render, each shows its label and image count, and clicking the second one loads its first image.

- [ ] **Step 2: Run red test**

  Run: `npm test -- visor-dicom.test.jsx --runInBand`

  Expected: FAIL because the sidebar renders individual image buttons.

### Task 2: Render one DICOM preview card per series

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Modify: `src/pages/radiologia/pages/VisorDicom.css`

- [ ] **Step 1: Add `MiniaturaSerieDicom`**

  Initialize Cornerstone on a preview element, load `serie.imageIds[0]`, display it, resize it, and disable it on cleanup. Render a `data-testid="preview-serie"` canvas host.

- [ ] **Step 2: Replace individual image mapping**

  Render one `button.vd-serie-card` per `seriesDicom` entry. It contains the preview, label, `S: <serieIndex + 1>`, and `serie.imagenes.length`; click calls `seleccionarSerieDicom(serie)`.

- [ ] **Step 3: Style the vertical cards**

  Use a large 4:3 preview area, blue active border, series metadata below, and retain `.vd-miniaturas { overflow-y: auto; }`.

- [ ] **Step 4: Run green test and build**

  Run: `npm test -- visor-dicom.test.jsx --runInBand && npm run build`

  Expected: PASS and Vite exits with code `0`.
