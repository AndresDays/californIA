# Laboratory Study Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one multipage 50 x 30 mm label PDF, grouped by laboratory sample container, whenever a laboratory sale ticket is generated or reprinted.

**Architecture:** A dedicated `generarEtiquetasEstudiosLaboratorio` utility owns filtering, grouping, CODE128 creation, page layout, and opening the single PDF. The two ticket call sites supply patient and study data; reprints enrich stored sale-study keys with the current laboratory-catalog metadata before invoking the label utility.

**Tech Stack:** React 18, Supabase JS, jsPDF 3, JsBarcode, Jest 29.

---

## File structure

- Create: `src/utils/generar-etiquetas-estudios-laboratorio.js` - pure grouping export plus 50 x 30 mm PDF renderer.
- Create: `src/utils/generar-etiquetas-estudios-laboratorio.test.js` - unit coverage of grouping and rendered PDF calls.
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx` - send the selected laboratory-study metadata and patient sex/age to the label generator after the ticket.
- Modify: `src/pages/laboratorio/recepcion/editar-solicitud.jsx` - enrich reprinted sale studies from `estudios_lab_catalogo`, then generate the same label PDF.

### Task 1: Group laboratory studies by container

**Files:**
- Create: `src/utils/generar-etiquetas-estudios-laboratorio.js`
- Test: `src/utils/generar-etiquetas-estudios-laboratorio.test.js`

- [ ] **Step 1: Write the failing grouping tests**

```js
import { agruparEstudiosPorRecipiente } from './generar-etiquetas-estudios-laboratorio';

describe('agruparEstudiosPorRecipiente', () => {
	test('junta claves de laboratorio que usan el mismo recipiente', () => {
		expect(agruparEstudiosPorRecipiente([
			{ modulo: 'laboratorio', clave: 'EGO', tipo_muestra: 'Orina', recipiente: 'Frasco estéril' },
			{ modulo: 'laboratorio', clave: 'UROC', tipo_muestra: 'Orina', recipiente: 'Frasco estéril' },
			{ modulo: 'laboratorio', clave: 'BHC', tipo_muestra: 'Sangre', recipiente: 'Tubo lila' },
		])).toEqual([
			{ recipiente: 'Frasco estéril', tipoMuestra: 'Orina', claves: ['EGO', 'UROC'] },
			{ recipiente: 'Tubo lila', tipoMuestra: 'Sangre', claves: ['BHC'] },
		]);
	});

	test('omite imagen, laboratorio sin recipiente y claves vacias', () => {
		expect(agruparEstudiosPorRecipiente([
			{ modulo: 'imagen', clave: 'RX', recipiente: 'N/A' },
			{ modulo: 'laboratorio', clave: 'QS6', recipiente: '' },
			{ modulo: 'laboratorio', clave: '', recipiente: 'Tubo amarillo' },
		])).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: FAIL because `generar-etiquetas-estudios-laboratorio` does not exist.

- [ ] **Step 3: Implement the smallest grouping API**

```js
export const agruparEstudiosPorRecipiente = (estudios = []) => {
	const grupos = new Map();
	for (const estudio of estudios) {
		const recipiente = String(estudio.recipiente || '').trim();
		const clave = String(estudio.clave || estudio.clave_estudio || '').trim();
		if (estudio.modulo !== 'laboratorio' || !recipiente || !clave) continue;
		const grupo = grupos.get(recipiente) || {
			recipiente,
			tipoMuestra: String(estudio.tipo_muestra || '').trim(),
			claves: [],
		};
		grupo.claves.push(clave);
		grupos.set(recipiente, grupo);
	}
	return [...grupos.values()];
};
```

- [ ] **Step 4: Run the focused grouping tests**

Run: `npm test -- generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: PASS with both grouping tests green.

- [ ] **Step 5: Commit the grouping behavior**

```bash
git add src/utils/generar-etiquetas-estudios-laboratorio.js src/utils/generar-etiquetas-estudios-laboratorio.test.js
git commit -m "feat: group laboratory labels by container"
```

### Task 2: Render one 50 x 30 mm page per group

**Files:**
- Modify: `src/utils/generar-etiquetas-estudios-laboratorio.js`
- Modify: `src/utils/generar-etiquetas-estudios-laboratorio.test.js`

- [ ] **Step 1: Add the failing PDF-rendering test**

```js
test('genera un solo PDF con una pagina de 50 x 30 mm por recipiente', async () => {
	await generarEtiquetasEstudiosLaboratorio({
		folio: '0708260010', paciente: 'Alvarez Gonzalez Jose', sexo: 'Masculino', edad: '28 años',
		estudios: [
			{ modulo: 'laboratorio', clave: 'EGO', tipo_muestra: 'Orina', recipiente: 'Frasco estéril' },
			{ modulo: 'laboratorio', clave: 'BHC', tipo_muestra: 'Sangre', recipiente: 'Tubo lila' },
		],
	});
	expect(jsPDF).toHaveBeenCalledWith({ unit: 'mm', format: [50, 30] });
	expect(mockDoc.addPage).toHaveBeenCalledWith([50, 30]);
	expect(JsBarcode).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), '0708260010', expect.objectContaining({ format: 'CODE128' }));
	expect(mockDoc.text).toHaveBeenCalledWith('EGO', expect.any(Number), expect.any(Number));
	expect(mockDoc.text).toHaveBeenCalledWith('BHC', expect.any(Number), expect.any(Number));
	expect(window.open).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: FAIL because `generarEtiquetasEstudiosLaboratorio` is not exported.

- [ ] **Step 3: Implement the renderer**

```js
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';

const crearBarcode = (folio) => {
	const canvas = document.createElement('canvas');
	JsBarcode(canvas, String(folio), { format: 'CODE128', width: 1.25, height: 34, displayValue: true, fontSize: 8, margin: 0 });
	return canvas.toDataURL('image/png');
};

export const generarEtiquetasEstudiosLaboratorio = async ({ folio, paciente, sexo, edad, estudios }) => {
	const grupos = agruparEstudiosPorRecipiente(estudios);
	if (!grupos.length) return false;
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30] });
	const barcode = crearBarcode(folio);
	grupos.forEach((grupo, indice) => {
		if (indice) pdf.addPage([50, 30]);
		const encabezado = [sexo, edad, grupo.tipoMuestra, grupo.recipiente].filter(Boolean).join(' - ');
		pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.text(String(paciente || '').toUpperCase(), 25, 4, { align: 'center', maxWidth: 46 });
		pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.8); pdf.text(encabezado, 25, 8, { align: 'center', maxWidth: 46 });
		pdf.addImage(barcode, 'PNG', 4, 9, 42, 15);
		pdf.setFontSize(7.5); pdf.text(grupo.claves.join(', '), 4, 28, { maxWidth: 42 });
	});
	window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
	return true;
};
```

- [ ] **Step 4: Run the focused test suite**

Run: `npm test -- generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: PASS; one `jsPDF` instance, one open operation, and one `addPage` for the second recipient.

- [ ] **Step 5: Commit the renderer**

```bash
git add src/utils/generar-etiquetas-estudios-laboratorio.js src/utils/generar-etiquetas-estudios-laboratorio.test.js
git commit -m "feat: render laboratory container labels"
```

### Task 3: Generate labels after a new laboratory sale ticket

**Files:**
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx`
- Test: `src/utils/generar-etiquetas-estudios-laboratorio.test.js`

- [ ] **Step 1: Add the expected new-sale call contract test**

Create a mock for `generarEtiquetasEstudiosLaboratorio` and assert the new-sale success path passes `folio`, `nombreCompleto`, `sexo`, formatted `edad`, and the original `estudiosSeleccionados`. Keep image studies in the input; Task 1 is responsible for filtering them.

```js
expect(generarEtiquetasEstudiosLaboratorio).toHaveBeenCalledWith(expect.objectContaining({
	folio: 'folio-generado',
	paciente: 'Paciente de prueba',
	sexo: 'Femenino',
	edad: '32 años',
	estudios: expect.any(Array),
}));
```

- [ ] **Step 2: Run the focused new-sale test to verify it fails**

Run: `npm test -- nuevo-paciente.test.jsx --runInBand`

Expected: FAIL because the label generator is not imported or called.

- [ ] **Step 3: Import and call the label generator after the ticket**

```js
import { generarEtiquetasEstudiosLaboratorio } from '../../utils/generar-etiquetas-estudios-laboratorio';

await generarTicketVenta({ /* existing payload */ });
await generarEtiquetasEstudiosLaboratorio({
	folio,
	paciente: nombreCompleto,
	sexo,
	edad: edad ? `${edad} años` : '',
	estudios: estudiosSeleccionados,
});
```

Do not change the sale persistence payload or ticket PDF.

- [ ] **Step 4: Run the new-sale and labels tests**

Run: `npm test -- nuevo-paciente.test.jsx generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit the new-sale integration**

```bash
git add src/pages/laboratorio/nuevo-paciente.jsx src/utils/generar-etiquetas-estudios-laboratorio.test.js
git commit -m "feat: print sample labels with new sales"
```

### Task 4: Generate enriched labels on ticket reprint

**Files:**
- Modify: `src/pages/laboratorio/recepcion/editar-solicitud.jsx`
- Test: `src/utils/generar-etiquetas-estudios-laboratorio.test.js`

- [ ] **Step 1: Add the failing reprint-enrichment test**

Mock the catalog query so `EGO` returns `{ clave: 'EGO', tipo_muestra: 'Orina', recipiente: 'Frasco estéril' }`; assert the label-generator receives a laboratory study containing those properties and patient sex/derived age.

```js
expect(generarEtiquetasEstudiosLaboratorio).toHaveBeenCalledWith(expect.objectContaining({
	folio: orden.folio,
	paciente: orden.pacientes.nombre,
	sexo: orden.pacientes.sexo,
	edad: '28 años',
	estudios: [expect.objectContaining({ modulo: 'laboratorio', clave: 'EGO', tipo_muestra: 'Orina', recipiente: 'Frasco estéril' })],
}));
```

- [ ] **Step 2: Run the focused reprint test to verify it fails**

Run: `npm test -- editar-solicitud.test.jsx --runInBand`

Expected: FAIL because no catalog-enriched label call exists.

- [ ] **Step 3: Enrich only the reprinted laboratory catalog matches and generate labels**

```js
import { generarEtiquetasEstudiosLaboratorio } from '../../../utils/generar-etiquetas-estudios-laboratorio';

const claves = (orden.estudios_venta || []).map(({ clave_estudio }) => clave_estudio).filter(Boolean);
const { data: estudiosCatalogo, error: errorCatalogo } = await supabase
	.from('estudios_lab_catalogo')
	.select('clave, tipo_muestra, recipiente')
	.in('clave', claves);
if (errorCatalogo) throw errorCatalogo;
const porClave = new Map((estudiosCatalogo || []).map((estudio) => [estudio.clave, estudio]));
const estudiosEtiquetas = (orden.estudios_venta || []).map((estudio) => ({
	...estudio,
	clave: estudio.clave_estudio,
	modulo: porClave.has(estudio.clave_estudio) ? 'laboratorio' : 'imagen',
	...(porClave.get(estudio.clave_estudio) || {}),
}));
await generarEtiquetasEstudiosLaboratorio({ folio: orden.folio, paciente: paciente?.nombre, sexo: paciente?.sexo, edad: edadStr, estudios: estudiosEtiquetas });
```

Place it after `generarTicketVenta` inside `imprimirTicketOrden`; preserve the existing ticket reprint payload and error notification behavior.

- [ ] **Step 4: Run the reprint and label suites**

Run: `npm test -- editar-solicitud.test.jsx generar-etiquetas-estudios-laboratorio.test.js --runInBand`

Expected: PASS; catalog matches become labels and unmatched/image studies do not.

- [ ] **Step 5: Commit the reprint integration**

```bash
git add src/pages/laboratorio/recepcion/editar-solicitud.jsx src/utils/generar-etiquetas-estudios-laboratorio.test.js
git commit -m "feat: print sample labels on ticket reprint"
```

### Task 5: Verify the complete change

**Files:**
- Verify: `src/utils/generar-etiquetas-estudios-laboratorio.js`
- Verify: `src/pages/laboratorio/nuevo-paciente.jsx`
- Verify: `src/pages/laboratorio/recepcion/editar-solicitud.jsx`

- [ ] **Step 1: Run all focused tests**

Run: `npm test -- generarTicketVenta.test.js generar-etiquetas-estudios-laboratorio.test.js nuevo-paciente.test.jsx editar-solicitud.test.jsx --runInBand`

Expected: PASS. If either page does not yet have a focused test file, run the generator suites and record the page-level gap instead of claiming coverage that does not exist.

- [ ] **Step 2: Build the application**

Run: `npm run build`

Expected: Vite build exits 0.

- [ ] **Step 3: Perform local visual validation**

Register or reprint a sale containing at least `EGO`, `UROC` with `Frasco estéril`, and `BHC` with `Tubo lila`. Confirm one label PDF opens, it has two 50 x 30 mm pages, its first page lists `EGO, UROC`, its second lists `BHC`, and both show the ticket folio barcode.

- [ ] **Step 4: Commit verification-only cleanup if needed**

```bash
git status --short
```

Expected: no uncommitted files. If verification required a legitimate test adjustment, commit it with `test: cover laboratory label behavior`.

## Self-review

- Spec coverage: Tasks 1-2 cover filtering, grouping, single multipage PDF, page size, barcode, and displayed fields. Task 3 covers new sales. Task 4 covers reprints and catalog enrichment. Task 5 covers automated and local visual validation.
- Placeholder scan: no deferred behavior or unspecified error handling remains; absence of label groups returns without opening a window.
- Type consistency: all boundaries use `folio`, `paciente`, `sexo`, `edad`, and `estudios`; study groups use `recipiente`, `tipoMuestra`, and `claves`.
