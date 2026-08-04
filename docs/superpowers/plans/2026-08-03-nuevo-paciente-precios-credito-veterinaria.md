# Nuevo paciente: precios, crédito y Veterinaria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar Nuevo paciente con precios que ya incluyen IVA, pago a crédito, sexo inclusivo y catálogo Veterinaria en CDC.

**Architecture:** Un helper puro calculará subtotal, descuento y total sin IVA. `NuevoPaciente` usará ese resultado y persistirá `iva: 0` por compatibilidad. Una migración mueve el catálogo existente y la semilla queda alineada.

**Tech Stack:** React 18, Jest, Supabase SQL migrations, Vite.

---

## File structure

- Create: `src/utils/nuevo-paciente-totales.js` — cálculo sin IVA.
- Create: `src/utils/nuevo-paciente-totales.test.js` — regresión del cálculo.
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx` — formulario y payload de venta.
- Modify: `src/utils/cita-nuevo-paciente.test.js` — filtro Veterinaria por empresa.
- Modify: `supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql` — CDC para instalaciones nuevas.
- Create: `supabase/migrations/20260803170000_mover_veterinaria_a_cdc.sql` — corrección de datos desplegados.

### Task 1: Cálculo de total sin IVA

**Files:**
- Create: `src/utils/nuevo-paciente-totales.test.js`
- Create: `src/utils/nuevo-paciente-totales.js`

- [ ] **Step 1: Write the failing test**

```js
import { calcularTotalesNuevoPaciente } from "./nuevo-paciente-totales";

test("aplica el descuento al subtotal sin agregar IVA", () => {
  expect(calcularTotalesNuevoPaciente([
    { precio: 500, cantidad: 1 },
    { precio: 300, cantidad: 2 },
  ], 10)).toEqual({ subtotal: 1100, descuento: 110, total: 990 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/utils/nuevo-paciente-totales.test.js`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const calcularTotalesNuevoPaciente = (estudios = [], descuentoPercent = 0) => {
  const subtotal = estudios.reduce((suma, estudio) =>
    suma + (Number(estudio.precio) || 0) * (Number(estudio.cantidad) || 0), 0);
  const descuento = subtotal * ((Number(descuentoPercent) || 0) / 100);
  return { subtotal, descuento, total: subtotal - descuento };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/utils/nuevo-paciente-totales.test.js`

Expected: PASS with one test.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nuevo-paciente-totales.js src/utils/nuevo-paciente-totales.test.js
git commit -m "feat: calculate nuevo paciente totals without IVA"
```

### Task 2: Formulario y payload

**Files:**
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx:44,163-236,417,1114-1139,1484-1494,1844-1880`
- Modify: `src/utils/nuevo-paciente-totales.test.js`

- [ ] **Step 1: Replace page-side IVA calculation**

Import `calcularTotalesNuevoPaciente`; set state from its `{ subtotal, descuento, total }` result; remove `ivaPercent`, `iva`, `totalConIva`, the IVA inputs, and the `ivaPercent` effect dependency. Set the inserted sale payload field to `iva: 0`.

Add exactly these options to their corresponding selects:

```jsx
<option value="otro">Otro</option>
<option value="prefiero_no_decirlo">Prefiero no decirlo</option>
<option value="credito">Crédito</option>
```

- [ ] **Step 2: Verify GREEN and build**

Run: `npm test -- --runInBand src/utils/nuevo-paciente-totales.test.js src/utils/nuevo-paciente-resumen.test.js && npm run build`

Expected: PASS and successful Vite build.

- [ ] **Step 3: Commit**

```bash
git add src/pages/laboratorio/nuevo-paciente.jsx src/utils/nuevo-paciente-totales.js src/utils/nuevo-paciente-totales.test.js
git commit -m "feat: update nuevo paciente pricing and credit options"
```

### Task 3: Asignar Veterinaria a CDC

**Files:**
- Create: `scripts/verify-veterinaria-seed.test.js`
- Modify: `supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql`
- Create: `supabase/migrations/20260803170000_mover_veterinaria_a_cdc.sql`

- [ ] **Step 1: Write the failing seed regression**

```js
import fs from "node:fs";
import path from "node:path";

test("la semilla de Veterinaria asigna todos los estudios a CDC", () => {
  const seed = fs.readFileSync(path.resolve("supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql"), "utf8");
  expect(seed).not.toMatch(/'CDI', 'veterinaria'/);
  expect(seed).toMatch(/'CDC', 'veterinaria'/);
});
```

- [ ] **Step 2: Run it to verify RED**

Run: `npm test -- --runInBand scripts/verify-veterinaria-seed.test.js`

Expected: FAIL because the current seed contains `'CDI', 'veterinaria'`.

- [ ] **Step 3: Correct deployed and seed data**

Create `20260803170000_mover_veterinaria_a_cdc.sql`:

```sql
update public.estudios_imagen_catalogo
set empresa_operativa = 'CDC', updated_at = now()
where modalidad = 'veterinaria'
  and empresa_operativa <> 'CDC';
```

In the Veterinaria seed replace every `'CDI'` study owner with `'CDC'`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand scripts/verify-veterinaria-seed.test.js && rg -n "'CDI'" supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql`

Expected: test PASS; `rg` has no output.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-veterinaria-seed.test.js supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql supabase/migrations/20260803170000_mover_veterinaria_a_cdc.sql
git commit -m "fix: assign veterinaria studies to CDC"
```

### Task 4: Final verification

**Files:** Verify files from Tasks 1–3.

- [ ] **Step 1: Run full unit suite**

Run: `npm test -- --runInBand`

Expected: no failed test suites.

- [ ] **Step 2: Build production output**

Run: `npm run build`

Expected: Vite completes successfully.

- [ ] **Step 3: Review changes**

Run: `git diff HEAD~3..HEAD -- src/pages/laboratorio/nuevo-paciente.jsx src/utils/nuevo-paciente-totales.js scripts/verify-veterinaria-seed.test.js supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql supabase/migrations/20260803170000_mover_veterinaria_a_cdc.sql`

Expected: no IVA UI/calculation, `iva: 0`, Crédito plus two sex options, and Veterinaria in CDC.
