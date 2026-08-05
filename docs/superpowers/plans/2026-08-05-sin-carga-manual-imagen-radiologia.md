# Sin carga manual de imagen en radiologia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar toda accion manual para subir o reemplazar imagenes en el dashboard de radiologia.

**Architecture:** La tarjeta y el modal de detalle dejaran de recibir o renderizar controles de carga. Se conservaran la consulta, el indicador de imagen existente y la navegacion al visor; las imagenes continuan llegando desde DICOM Cloud.

**Tech Stack:** React, Jest, Testing Library.

---

### Task 1: Retirar los controles manuales de carga

**Files:**
- Modify: `src/pages/radiologia/componentes/TarjetaEstudio.jsx:4-92`
- Modify: `src/pages/radiologia/pages/dashboard-radiologia.jsx:23,367-370,557,701-713,768-777`
- Modify: `src/pages/radiologia/componentes/TarjetaEstudio.test.jsx`
- Modify: `src/pages/radiologia/pages/dashboard-radiologia.test.jsx:44-53`

- [x] **Step 1: Write the failing regression tests**

Add this test to `src/pages/radiologia/componentes/TarjetaEstudio.test.jsx`:

```jsx
it.each([false, true])('no muestra acciones manuales de imagen cuando tieneImagen es %s', (tieneImagen) => {
  render(<TarjetaEstudio {...baseProps} tieneImagen={tieneImagen} onSubirImagen={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /subir imagen|reemplazar imagen/i })).not.toBeInTheDocument();
});
```

In `dashboard-radiologia.test.jsx`, render the selected-study modal and assert:

```jsx
expect(screen.queryByRole('button', { name: /subir imagen|reemplazar imagen/i })).not.toBeInTheDocument();
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/pages/radiologia/componentes/TarjetaEstudio.test.jsx src/pages/radiologia/pages/dashboard-radiologia.test.jsx --runInBand`

Expected: FAIL because the card or detail modal still render `Subir imagen` or `Reemplazar imagen`.

- [x] **Step 3: Remove the manual upload UI and its unused props**

In `TarjetaEstudio.jsx`, remove `tieneImagen`, `subiendoImagen`, and `onSubirImagen` from props and remove the entire conditional `btn-subir-imagen` button. Keep the details menu button.

In `dashboard-radiologia.jsx`, remove the `puedeSubirImagenRadiologia` import, `inputImagenRef`, `estudioParaSubirRef`, `subiendoImagenId`, `puedeSubirImagen`, `handleSeleccionarImagen`, and `handleImagenSeleccionada`. Remove the hidden file input, the TarjetaEstudio props for upload, and the detail-modal upload button. These symbols are used only by the two removed UI actions.

Update the dashboard's TarjetaEstudio mock so it no longer accepts or renders `onSubirImagen`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/pages/radiologia/componentes/TarjetaEstudio.test.jsx src/pages/radiologia/pages/dashboard-radiologia.test.jsx --runInBand`

Expected: PASS.

- [x] **Step 5: Run production build**

Run: `npm run build`

Expected: Vite exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/radiologia/componentes/TarjetaEstudio.jsx src/pages/radiologia/componentes/TarjetaEstudio.test.jsx src/pages/radiologia/pages/dashboard-radiologia.jsx src/pages/radiologia/pages/dashboard-radiologia.test.jsx
git commit -m "fix: remove manual radiology image upload actions"
```
