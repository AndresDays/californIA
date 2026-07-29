# DICOM Stack Scroll Wheel Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent browser-page scrolling while Scroll navigates a DICOM series.

**Architecture:** `PanelDicom` installs a non-passive native wheel listener on its wrapper. The listener only intercepts when `StackScroll` is active and delegates to the existing direction handler.

**Tech Stack:** React 18, Jest, React Testing Library.

---

### Task 1: Capture native wheel events for StackScroll

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:1961-2057`
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx:370-465`

- [ ] **Step 1: Write a failing native-wheel test**

  Dispatch a cancelable native `WheelEvent` to `.panel-imagen.activo` after selecting Scroll. Assert `event.defaultPrevented` is true and the next image is loaded.

  ```jsx
  const event = new WheelEvent("wheel", { deltaY: 120, cancelable: true });
  panel.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  ```

- [ ] **Step 2: Run the focused test and verify red**

  Run: `npm test -- visor-dicom.test.jsx --runInBand`

  Expected: FAIL because React's delegated wheel handler does not install a non-passive listener on the panel.

- [ ] **Step 3: Install and clean up the native non-passive listener**

  ```jsx
  useEffect(() => {
    const panel = wrapperRef.current;
    if (!panel) return undefined;
    const capturarRueda = (event) => {
      if (herramientaRef.current !== "StackScroll") return;
      event.preventDefault();
      event.stopPropagation();
      handleWheel(event);
    };
    panel.addEventListener("wheel", capturarRueda, { passive: false });
    return () => panel.removeEventListener("wheel", capturarRueda);
  }, [stackImageIds, onStackScroll]);
  ```

- [ ] **Step 4: Remove the React `onWheel` prop to prevent duplicate navigation**

  Keep wheel behavior centralized in the native handler so each physical wheel action advances at most one image.

- [ ] **Step 5: Run focused tests and build**

  Run: `npm test -- visor-dicom.test.jsx --runInBand && npm run build`

  Expected: tests pass and Vite exits with code `0`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx
  git commit -m "fix: capture wheel for DICOM stack scroll"
  ```
