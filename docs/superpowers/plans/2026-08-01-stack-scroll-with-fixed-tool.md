# Stack Scroll with Fixed Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mantener la navegación por rueda entre imágenes cuando una herramienta está fijada.

**Architecture:** `handleWheel` ya distingue Zoom temporal mediante `zoomTemporalRef`. La ruta normal de una serie navegable debe llamar directamente a `onStackScroll`, sin intentar activar `StackScroll` ni modificar la herramienta fijada.

**Tech Stack:** React, Cornerstone, Jest, React Testing Library.

---

### Task 1: Navegación por rueda independiente de la herramienta fijada

**Files:**

- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx:478-505`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:2110-2120`

- [ ] **Step 1: Write the failing test**

```jsx
test('la rueda navega la serie sin desactivar Longitud', async () => {
  await renderVisor();
  await waitFor(() => expect(mockCornerstone.loadAndCacheImage).toHaveBeenCalled());
  fireEvent.click(screen.getByTitle('Longitud'));
  const panel = document.querySelector('.panel-imagen.activo');
  fireEvent.wheel(panel, { deltaY: 120 });
  await waitFor(() => expect(mockCornerstone.loadAndCacheImage).toHaveBeenLastCalledWith(
    'wadouri:https://mock.url/serie/2.dcm',
  ));
  expect(screen.getByTitle('Longitud')).toHaveClass('activo');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/jest --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx --testNamePattern='rueda navega la serie'`

Expected: FAIL because the fixed tool prevents `activarAtajo('StackScroll')` from changing the wheel route.

- [ ] **Step 3: Write minimal implementation**

```js
if (esSerieNavegable() && !zoomTemporalActivo) {
  if (e.deltaY === 0) return;
  const now = Date.now();
  if (now - lastStackWheelRef.current < 120) return;
  lastStackWheelRef.current = now;
  onStackScroll?.(e.deltaY > 0 ? 1 : -1);
  return;
}
```

Replace the existing `activarAtajo('StackScroll')` plus `herramientaRef.current === 'StackScroll'` branch. Leave the Zoom temporal branch unchanged.

- [ ] **Step 4: Run focused and related tests**

Run: `./node_modules/.bin/jest --runInBand src/utils/dicom-series.test.js src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS, including fixed Longitud navigation and temporary Zoom coverage.

- [ ] **Step 5: Lint and commit**

Run: `./node_modules/.bin/eslint src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: exit code 0 with no lint errors.

```bash
git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx
git commit -m "fix: keep stack scrolling with fixed tools"
```
