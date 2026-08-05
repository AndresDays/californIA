# Modalidades DICOM Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear nuevas tarjetas de radiologia con los codigos DICOM Cloud `DX`, `MR`, `CT`, `MG` o `US`.

**Architecture:** `resolverCodigoTipoRadiologia` seguira siendo el unico punto de traduccion entre el catalogo operativo y `estudios_radiologia.tipo_estudio`. Se reemplazaran las etiquetas internas por codigos DICOM y el resolvedor lanzara un error para una modalidad no admitida, antes de que `nuevo-paciente` pueda construir o insertar una tarjeta.

**Tech Stack:** React, JavaScript, Supabase client, Jest.

---

### Task 1: Codificar y validar modalidades DICOM Cloud

**Files:**
- Modify: `src/utils/cita-nuevo-paciente.js:96-113`
- Test: `src/utils/cita-nuevo-paciente.test.js`

- [x] **Step 1: Write the failing test**

Add this test to `src/utils/cita-nuevo-paciente.test.js`:

```js
test.each([
  [{ clave: "RX-TORAX", modalidad: "radiografia" }, "DX"],
  [{ clave: "RM-CRANEO", modalidad: "resonancia" }, "MR"],
  [{ clave: "TAC-ABDOMEN", modalidad: "tomografia" }, "CT"],
  [{ modalidad: "mastografia" }, "MG"],
  [{ clave: "US-ABDOMEN", modalidad: "ultrasonido" }, "US"],
])("convierte %o al codigo DICOM Cloud %s", (estudio, esperado) => {
  expect(resolverCodigoTipoRadiologia(estudio)).toBe(esperado);
});

test("rechaza una modalidad que no existe en DICOM Cloud", () => {
  expect(() => resolverCodigoTipoRadiologia({ modalidad: "estudios_contrastados" }))
    .toThrow("Modalidad de radiologia no compatible con DICOM Cloud");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/cita-nuevo-paciente.test.js --runInBand`

Expected: FAIL because radiografia, resonancia y tomografia aun devuelven `RX`, `RM` y `TAC`; contrastados devuelve `EC`.

- [x] **Step 3: Write minimal implementation**

Replace the return values in `resolverCodigoTipoRadiologia` with:

```js
if (clave.startsWith("rm-") || modalidad === "resonancia" || /\brm\b|resonancia/.test(texto)) return "MR";
if (clave.startsWith("tac-") || modalidad === "tomografia" || /\btac\b|tomografia/.test(texto)) return "CT";
if (clave.startsWith("rx-") || modalidad === "radiografia" || /\brx\b|radiografia|radiologia|rayos/.test(texto)) return "DX";
if (clave.startsWith("us-") || modalidad === "ultrasonido" || /\bus\b|ultrasonido|ultrasonografia/.test(texto)) return "US";
if (modalidad === "mastografia" || /mastografia|mamografia/.test(texto)) return "MG";
throw new Error("Modalidad de radiologia no compatible con DICOM Cloud");
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/cita-nuevo-paciente.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/cita-nuevo-paciente.js src/utils/cita-nuevo-paciente.test.js
git commit -m "fix: use DICOM Cloud modality codes"
```
