# PDF de resultados de cultivo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Cargar el PDF de un cultivo y entregarlo solo o anexado al reporte generado de los demás estudios.

**Architecture:** Una tabla y bucket nuevos persisten un adjunto por estudio de venta en la ruta determinista `id_estudio_venta/cultivo.pdf`. El RPC seguro entrega sólo `archivo_cultivo_path`; Captura y Portal llaman `hidratarArchivoCultivoUrl(estudio, supabase)` después de autorizar. El helper obtiene internamente `getPublicUrl(path)` del cliente configurado y entrega la URL absoluta al compositor. Un helper identifica cultivos por descripción y separa adjuntos de estudios que se generan; pdf-lib combina páginas sin rasterizarlas.

**Tech Stack:** React 18, Supabase Storage/Postgres/RPC, Jest, jsPDF, pdf-lib.

---

### Task 1: Clasificar y validar cultivos

**Files:**
- Create: src/utils/resultados-cultivo.js
- Create: src/utils/resultados-cultivo.test.js

- [ ] **Step 1: Write the failing test**

```js
import { esEstudioCultivo, separarEstudiosConCultivo, validarPdfCultivo } from './resultados-cultivo';

test('detecta cultivo sin distinguir mayúsculas y separa su adjunto', () => {
  const cultivo = { descripcion_estudio: 'Cultivo de orina', archivo_cultivo_path: '1/cultivo.pdf' };
  const bhc = { descripcion_estudio: 'Biometría hemática' };
  expect(esEstudioCultivo(cultivo)).toBe(true);
  expect(separarEstudiosConCultivo([cultivo, bhc])).toEqual({ generados: [bhc], adjuntosCultivo: [cultivo] });
});
test('rechaza tipo no PDF y un archivo mayor de 25 MB', () => {
  expect(validarPdfCultivo({ type: 'image/png', size: 20 })).toMatch(/PDF/);
  expect(validarPdfCultivo({ type: 'application/pdf', size: 26214401 })).toMatch(/25 MB/);
});
```

- [ ] **Step 2: Run it to verify RED**

Run: npm test -- --runInBand src/utils/resultados-cultivo.test.js

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const esEstudioCultivo = (estudio = {}) => /cultivo/i.test(estudio.descripcion_estudio || estudio.descripcion || '');
export const validarPdfCultivo = (archivo) => {
  if (archivo?.type !== 'application/pdf') return 'Solo se permiten archivos PDF';
  return archivo.size > 25 * 1024 * 1024 ? 'El archivo debe pesar menos de 25 MB' : '';
};
export const separarEstudiosConCultivo = (estudios = []) => estudios.reduce((r, estudio) => {
  (esEstudioCultivo(estudio) && esArchivoCultivoPathValido(estudio.archivo_cultivo_path) ? r.adjuntosCultivo : r.generados).push(estudio);
  return r;
}, { generados: [], adjuntosCultivo: [] });
```

- [ ] **Step 4: Run GREEN**

Run: npm test -- --runInBand src/utils/resultados-cultivo.test.js

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/resultados-cultivo.js src/utils/resultados-cultivo.test.js
git commit -m "feat: classify cultivo result studies"
```

### Task 2: Guardar un PDF por estudio de cultivo

**Files:**
- Create: supabase/migrations/20260805120000_resultados_cultivo_adjuntos.sql
- Modify: src/hooks/use-captura.js

- [ ] **Step 1: Write the failing migration-contract check**

Run: rg -n "resultados_cultivo_adjuntos|resultados-cultivo-adjuntos|archivo_cultivo_path" supabase/migrations/20260806120000_resultados_cultivo_adjuntos.sql

Expected: the file is absent.

- [ ] **Step 2: Add the minimum migration**

```sql
create table if not exists public.resultados_cultivo_adjuntos (
  id uuid primary key default gen_random_uuid(),
  id_estudio_venta integer not null unique references public.estudios_venta(id_estudio_venta) on delete cascade,
  nombre_archivo text not null, archivo_path text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
```

Create the public resultados-cultivo-adjuntos bucket (25 MB, application/pdf only). Add table and storage RLS for active authenticated quimico, tecnico, administrador, admin, and desarrollador roles, limited to cultivo descriptions and `id_estudio_venta/cultivo.pdf`. Extend buscar_resultados_portal to return archivo_cultivo_path only for validated cultivo rows with an adjunto, preserving its existing folio, phone, and balance checks. Captura/Portal hydrate the configured Storage public URL only after that secure response.

- [ ] **Step 3: Load the adjunto in Captura**

```js
const { data: adjuntos } = await supabase
  .from('resultados_cultivo_adjuntos')
  .select('id_estudio_venta, nombre_archivo, archivo_path, mime_type, size_bytes')
  .in('id_estudio_venta', idsEstudiosVenta);
```

Merge each matching row as archivo_cultivo_path; call `hidratarArchivoCultivoUrl(estudio, supabase)` before calling the composer so the helper obtains the public URL from the configured Storage client.

- [ ] **Step 4: Verify the migration contract**

Run: rg -n "resultados_cultivo_adjuntos|resultados-cultivo-adjuntos|archivo_cultivo_path" supabase/migrations/20260806120000_resultados_cultivo_adjuntos.sql

Expected: table, bucket, policies and RPC projection are present.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260805120000_resultados_cultivo_adjuntos.sql src/hooks/use-captura.js
git commit -m "feat: persist cultivo result PDFs"
```

### Task 3: Componer PDFs sin degradar el adjunto

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Modify: src/utils/reporte-pdf.js
- Modify: src/utils/reportepdf.test.js

- [ ] **Step 1: Write failing tests**

```js
test('devuelve el PDF de cultivo cuando es el único resultado', async () => {
  expect(await generarResultadosCombinadosPdf({ estudios: [
    { descripcion: 'Cultivo', archivo_cultivo_path: '1/cultivo.pdf', archivo_cultivo_url: 'blob:cultivo' }, // URL hydrated after RPC authorization
  ] })).toBe('blob:cultivo');
});
test('anexa cultivo al PDF generado cuando también hay BHC', async () => {
  await generarResultadosCombinadosPdf({ estudios: [
    { descripcion: 'BHC', analitos: [{ clave: 'HB', resultado: '12' }] },
    { descripcion: 'Cultivo', archivo_cultivo_path: '1/cultivo.pdf', archivo_cultivo_url: 'https://project.supabase.co/storage/v1/object/public/resultados-cultivo-adjuntos/1/cultivo.pdf' }, // URL hydrated after RPC authorization
  ] });
  expect(PDFDocument.load).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run RED**

Run: npm test -- --runInBand src/utils/reportepdf.test.js

Expected: FAIL because the composer and pdf-lib are absent.

- [ ] **Step 3: Install and implement**

Run: npm install pdf-lib@^1.17.1

```js
export const generarResultadosCombinadosPdf = async ({ venta = {}, estudios = [], membreteSrc, modoVistaPrevia = false }) => {
  const { generados, adjuntosCultivo } = separarEstudiosConCultivo(estudios);
  if (!generados.length && adjuntosCultivo.length === 1) return adjuntosCultivo[0].archivo_cultivo_url;
  // Load the generated jsPDF blob and every cultivo ArrayBuffer with PDFDocument.load.
  // Copy each source page in order into one PDFDocument and return its object URL.
};
```

Refactor the current generator internally so it can return a Blob/ArrayBuffer for copying while preserving generarResultadosPortalPdf's current blob-url API.

- [ ] **Step 4: Run GREEN**

Run: npm test -- --runInBand src/utils/reportepdf.test.js src/utils/resultados-cultivo.test.js

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/utils/reporte-pdf.js src/utils/reportepdf.test.js
git commit -m "feat: combine cultivo PDFs with generated results"
```

### Task 4: Cargar, reemplazar y previsualizar en Captura

**Files:**
- Modify: src/pages/laboratorio/captura.jsx
- Modify: src/pages/laboratorio/captura.css
- Modify: src/pages/laboratorio/captura.test.jsx

- [ ] **Step 1: Write failing UI tests**

```jsx
test('muestra Subir PDF de cultivo solo en una venta con cultivo', async () => {
  await seleccionarVentaConCultivo();
  expect(screen.getByLabelText('Subir PDF de cultivo')).toBeInTheDocument();
});
test('rechaza una imagen antes de subirla', async () => {
  await seleccionarVentaConCultivo();
  fireEvent.change(screen.getByLabelText('Subir PDF de cultivo'), {
    target: { files: [new File(['x'], 'cultivo.png', { type: 'image/png' })] },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Solo se permiten archivos PDF');
});
```

- [ ] **Step 2: Run RED**

Run: npm test -- --runInBand src/pages/laboratorio/captura.test.jsx

Expected: FAIL because the file control and validation are absent.

- [ ] **Step 3: Implement the minimal flow**

Add a visible control beside Vista previa plus a labelled PDF-only file input. Upload to the new bucket under the study id, upsert its single metadata row, and remove an older object only after the replacement upload and database update succeed. Set the study to completado/guardado; disable the control while uploading or after validation. Call generarResultadosCombinadosPdf from vistaPrevia.

- [ ] **Step 4: Run GREEN**

Run: npm test -- --runInBand src/pages/laboratorio/captura.test.jsx

Expected: PASS with existing and new control tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/laboratorio/captura.jsx src/pages/laboratorio/captura.css src/pages/laboratorio/captura.test.jsx
git commit -m "feat: upload cultivo result PDFs from captura"
```

### Task 5: Entregar el PDF único desde Portal

**Files:**
- Modify: src/pages/portal-resultados.jsx
- Create: src/pages/portal-resultados.test.jsx

- [ ] **Step 1: Write the failing portal test**

```jsx
test('usa el compositor único con BHC y cultivo adjunto', async () => {
  mockRpc.mockResolvedValue({ data: respuestaConBhcYCultivo, error: null });
  render(<PortalResultados />);
  await userEvent.click(screen.getByRole('button', { name: 'Ver PDF' }));
  expect(generarResultadosCombinadosPdf).toHaveBeenCalledWith(expect.objectContaining({
    estudios: respuestaConBhcYCultivo.estudios,
  }));
});
```

- [ ] **Step 2: Run RED**

Run: npm test -- --runInBand src/pages/portal-resultados.test.jsx

Expected: FAIL because Portal still calls generarResultadosPortalPdf.

- [ ] **Step 3: Implement combined delivery**

Use generarResultadosCombinadosPdf, retain one Ver PDF button, and label cultivation rows PDF de cultivo adjunto rather than render an empty analite table. Keep balance and authorization branches unchanged.

- [ ] **Step 4: Run final verification**

Run: npm test -- --runInBand src/utils/resultados-cultivo.test.js src/utils/reportepdf.test.js src/pages/laboratorio/captura.test.jsx src/pages/portal-resultados.test.jsx && npm run build

Expected: focused tests pass and Vite exits 0.

- [ ] **Step 5: Review scope and commit**

Run: git diff --check && git status --short

Expected: no whitespace errors and only planned files plus the pre-existing unrelated DICOM edits.

```bash
git add src/pages/portal-resultados.jsx src/pages/portal-resultados.test.jsx
git commit -m "feat: deliver combined cultivo result PDFs"
```
