# DICOM Viewer Session Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reopen an already visited study without reloading its DICOM series.

**Architecture:** A module-level `Map` in the viewer module stores a snapshot keyed by study ID. The first load writes it; a later mount hydrates the same React state from it and skips `cargarImagenes`.

**Tech Stack:** React 18, Supabase, Jest.

---

### Task 1: Cache and restore DICOM session state

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 1: Write a failing revisit test**

  Render, unmount, and render the same viewer study again. Assert the image-query mock is called once.

- [ ] **Step 2: Run red**

  Run: `npm test -- visor-dicom.test.jsx --runInBand`

  Expected: FAIL because `cargarImagenes` runs on each mount.

- [ ] **Step 3: Add module cache and hydration**

  Define `const cacheSesionVisorDicom = new Map();`. Before fetching, hydrate `seriesDicom`, `imageIds`, `panelImageIds`, `serieActivaId`, `imagenesDicomPorId`, and `formatoGrid` from the cache when it has the current study ID. After loading, store those values in the map.

- [ ] **Step 4: Run green and build**

  Run: `npm test -- visor-dicom.test.jsx --runInBand && npm run build`

  Expected: PASS and Vite exits with code `0`.
