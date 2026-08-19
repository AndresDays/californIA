# Portal de resultados de imagen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar acciones funcionales de visor y PDF por estudio de imagen en el portal público, sin mostrar HTML de interpretación inline.

**Architecture:** `PortalResultados` ya recibe `id`, `tipo`, `descripcion` y `reporte` para cada estudio. Los controles de imagen reutilizan la ruta pública del visor y `generarResultadosCombinadosPdf`, aislando el estudio seleccionado para conservar el formato PDF ya establecido.

**Tech Stack:** React 18, React Testing Library, Jest, jsPDF.

---

### Task 1: Regresión del portal de resultados

**Files:**
- Modify: `src/pages/portal-resultados.test.jsx`
- Modify: `src/pages/portal-resultados.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
const imagen = { id: 19, tipo: "imagen", descripcion: "RX tórax", reporte: "<p>Sin hallazgos</p>" };
expect(screen.getByRole("link", { name: "Ver visor del paciente" }))
  .toHaveAttribute("href", "/visor-paciente/19");
fireEvent.click(screen.getByRole("button", { name: "Ver PDF de interpretación" }));
expect(generarResultadosCombinadosPdf).toHaveBeenCalledWith(expect.objectContaining({ estudios: [imagen] }));
expect(screen.queryByText("Sin hallazgos")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/portal-resultados.test.jsx --runInBand`
Expected: FAIL because the image-specific controls do not exist.

- [ ] **Step 3: Write minimal implementation**

```jsx
<a href={`/visor-paciente/${estudio.id}`} target="_blank" rel="noopener noreferrer">Ver visor del paciente</a>
<button type="button" onClick={() => verPdfInterpretacion(estudio)}>Ver PDF de interpretación</button>
```

Implement `verPdfInterpretacion` by calling `generarResultadosCombinadosPdf` with `[estudio]` and remove the inline report rendering branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/portal-resultados.test.jsx --runInBand`
Expected: PASS.

- [ ] **Step 5: Run focused verification**

Run: `npm test -- src/pages/portal-resultados.test.jsx --runInBand && npm run build && git diff --check`
Expected: all commands exit 0.
