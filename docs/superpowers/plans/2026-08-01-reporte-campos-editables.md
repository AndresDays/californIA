# Reporte radiológico con campos editables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editar u ocultar el encabezado y las líneas clínicas de un reporte sin cambiar datos maestros, y mostrar `radiologo_clinico` como `Radiólogo` en Usuarios.

**Architecture:** Se guarda un objeto JSONB de anulaciones en `estudios_radiologia`. El visor DICOM lo carga, edita y envía al guardar; un helper puro distingue un valor vacío intencional de un valor inicial. El generador PDF recibe los valores resueltos y solo dibuja líneas no vacías. El valor interno del rol no cambia: solo se añade su etiqueta humana.

**Tech Stack:** React 18, Supabase/PostgreSQL, Jest/Testing Library y jsPDF.

---

## Files

- Create: `supabase/migrations/20260801150000_reporte_encabezado_editable.sql`
- Create: `src/utils/reporte-encabezado.js`
- Create: `src/utils/reporte-encabezado.test.js`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx`
- Modify: `src/utils/reporte-pdf.js`
- Modify: `src/utils/reportepdf.test.js`
- Modify: `src/utils/usuarios-auth.js`
- Modify: `src/utils/usuarios-auth.test.js`
- Modify: `src/pages/usuarios.jsx`

### Task 1: Persistir y resolver anulaciones del encabezado

**Files:**
- Create: `src/utils/reporte-encabezado.js`
- Test: `src/utils/reporte-encabezado.test.js`
- Create: `supabase/migrations/20260801150000_reporte_encabezado_editable.sql`

- [ ] **Step 1: Write the failing resolver tests**

```js
import { resolverEncabezadoReporte } from './reporte-encabezado';

test('preserva una eliminación intencional', () => {
  expect(resolverEncabezadoReporte({ paciente: 'Rafael' }, { paciente: '' }))
    .toMatchObject({ paciente: '' });
});

test('usa el valor inicial sin una anulación', () => {
  expect(resolverEncabezadoReporte({ paciente: 'Rafael' }))
    .toMatchObject({ paciente: 'Rafael' });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/utils/reporte-encabezado.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal resolver**

```js
const CAMPOS = ['fecha', 'paciente', 'doctor', 'estudio'];
export const resolverEncabezadoReporte = (iniciales, anulaciones = {}) =>
  CAMPOS.reduce((resultado, campo) => ({
    ...resultado,
    [campo]: Object.hasOwn(anulaciones, campo)
      ? String(anulaciones[campo] ?? '').trim()
      : String(iniciales[campo] ?? '').trim(),
  }), {});
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- --runInBand src/utils/reporte-encabezado.test.js`

Expected: PASS, 2 tests.

- [ ] **Step 5: Add the migration and RPC parameter**

```sql
alter table public.estudios_radiologia
  add column if not exists reporte_encabezado jsonb not null default '{}'::jsonb;

create or replace function public.actualizar_reporte_radiologo_clinico(
  p_id_estudio integer, p_reporte text, p_estado text default 'COMPLETADO',
  p_reporte_encabezado jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_radiologo_clinico_activo() then raise exception 'No autorizado para interpretar estudios'; end if;
  if p_id_estudio is null or p_estado not in ('EN PROCESO', 'COMPLETADO') then raise exception 'Actualización clínica inválida'; end if;
  update public.estudios_radiologia
  set reporte = coalesce(p_reporte, ''), reporte_encabezado = coalesce(p_reporte_encabezado, '{}'::jsonb), estado = p_estado, updated_at = now()
  where id_estudio = p_id_estudio;
  if not found then raise exception 'Estudio no encontrado'; end if;
end;
$$;
grant execute on function public.actualizar_reporte_radiologo_clinico(integer, text, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
```

- [ ] **Step 6: Commit the unit**

```bash
git add supabase/migrations/20260801150000_reporte_encabezado_editable.sql src/utils/reporte-encabezado.js src/utils/reporte-encabezado.test.js && git commit -m "feat: persist editable report headers"
```

### Task 2: Edit and save fields in the DICOM report

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:3193-3205,4100-4150,5040-5068`
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 1: Write the failing UI/save regression test**

Open the report, empty the input named `Paciente del reporte`, save, then assert:

```js
expect(screen.queryByText('PACIENTE:')).not.toBeInTheDocument();
expect(update).toHaveBeenCalledWith(expect.objectContaining({
  reporte_encabezado: expect.objectContaining({ paciente: '' }),
}));
```

- [ ] **Step 2: Run the visor test and verify RED**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: FAIL because the value is static and the update payload has no `reporte_encabezado`.

- [ ] **Step 3: Implement the minimal report header state**

Select `reporte_encabezado` when loading `estudios_radiologia`. Use `resolverEncabezadoReporte` with defaults `{ fecha: fechaReporteEncabezado, paciente: pacienteInfo.nombre, doctor: estudioAsignacion?.doctorNombre, estudio: pacienteInfo.tipoEstudio }`. Render the date and values as labelled inputs while editing, with an `Editar encabezado` control that makes even cleared rows available again. Outside editing mode, render the date/row only when its resolved value is non-empty. On save send `reporte_encabezado` with the report text in both paths:

```js
const payloadReporte = { reporte: textoReporte, reporte_encabezado: encabezadoEditado, estado: 'COMPLETADO', ... };
await supabase.rpc('actualizar_reporte_radiologo_clinico', {
  p_id_estudio: Number(idEstudio), p_reporte: textoReporte,
  p_estado: 'COMPLETADO', p_reporte_encabezado: encabezadoEditado,
});
```

- [ ] **Step 4: Run the visor test and verify GREEN**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS including the new clearing-and-save test.

- [ ] **Step 5: Commit the unit**

```bash
git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx && git commit -m "feat: edit report header in dicom viewer"
```

### Task 3: Keep PDF output consistent

**Files:**
- Modify: `src/utils/reporte-pdf.js:39-60`
- Test: `src/utils/reportepdf.test.js:55-65`

- [ ] **Step 1: Replace the fallback test with a failing omission test**

```js
test('omite los campos clínicos vacíos', async () => {
  await generarReportePdf({ ...opcionesBase, fechaEncabezado: '', nombrePaciente: '', doctorNombre: '', estudioDescripcion: '' });
  const textos = mockDoc.text.mock.calls.map(([texto]) => texto);
  expect(textos).not.toEqual(expect.arrayContaining(['PACIENTE:', 'DOCTOR:', 'ESTUDIO:', 'MÉDICO REFERENTE']));
});
```

- [ ] **Step 2: Run the PDF test and verify RED**

Run: `npm test -- --runInBand src/utils/reportepdf.test.js`

Expected: FAIL because the generator emits every label and substitutes `MÉDICO REFERENTE`.

- [ ] **Step 3: Filter empty rows before drawing them**

```js
const datos = [
  ['PACIENTE:', nombrePaciente], ['DOCTOR:', doctorNombre], ['ESTUDIO:', estudioDescripcion],
].filter(([, valor]) => String(valor ?? '').trim());
```

Keep the existing `fechaEncabezado` condition and draw only `datos`.

- [ ] **Step 4: Run the PDF test and verify GREEN**

Run: `npm test -- --runInBand src/utils/reportepdf.test.js`

Expected: PASS, without fallback clinical text.

- [ ] **Step 5: Commit the unit**

```bash
git add src/utils/reporte-pdf.js src/utils/reportepdf.test.js && git commit -m "fix: omit cleared report fields from pdf"
```

### Task 4: Human-readable role label

**Files:**
- Modify: `src/utils/usuarios-auth.js`
- Test: `src/utils/usuarios-auth.test.js`
- Modify: `src/pages/usuarios.jsx:17,47-65`

- [ ] **Step 1: Write the failing helper test**

```js
import { etiquetaRolUsuario } from './usuarios-auth';
test('labels the clinical radiologist as Radiologo', () => {
  expect(etiquetaRolUsuario('radiologo_clinico')).toBe('Radiólogo');
  expect(normalizarRolUsuario('radiologo_clinico')).toBe('radiologo_clinico');
});
```

- [ ] **Step 2: Run the users test and verify RED**

Run: `npm test -- --runInBand src/utils/usuarios-auth.test.js`

Expected: FAIL because `etiquetaRolUsuario` is absent.

- [ ] **Step 3: Implement and use the helper**

Add `etiquetaRolUsuario(rol)` to `usuarios-auth.js`, keyed by `normalizarRolUsuario(rol)`, with the existing labels plus `radiologo_clinico: 'Radiólogo'`. Import it in `usuarios.jsx` and replace the local `formatRol` map with `const formatRol = etiquetaRolUsuario;`.

- [ ] **Step 4: Run the users test and verify GREEN**

Run: `npm test -- --runInBand src/utils/usuarios-auth.test.js`

Expected: PASS and the persisted permission value is unchanged.

- [ ] **Step 5: Commit the unit**

```bash
git add src/utils/usuarios-auth.js src/utils/usuarios-auth.test.js src/pages/usuarios.jsx && git commit -m "fix: label clinical radiologist in users"
```

### Task 5: Full verification

- [ ] **Step 1: Run targeted regressions**

Run: `npm test -- --runInBand src/utils/reporte-encabezado.test.js src/utils/reportepdf.test.js src/utils/usuarios-auth.test.js src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: PASS, 0 failed suites.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: both exit 0.

- [ ] **Step 3: Review final state**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no uncommitted task files.
