# Plantillas de Radiología Compartidas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que Radiólogo Director, Administrador y Desarrollador publiquen plantillas de organización que cualquier usuario del Visor pueda seleccionar.

**Architecture:** Separar los permisos de publicación de la lectura de plantillas compartidas. El Visor consultará exclusivamente registros de organización y conservará sus opciones Normal, Hallazgos y Limpiar.

**Tech Stack:** React, Supabase JS, PostgreSQL/RLS, Supabase Storage, Jest, Vite.

---

### Task 1: Centralizar los roles publicadores

**Files:**
- Create: `src/utils/plantillas-radiologia-permisos.js`
- Test: `src/utils/plantillas-radiologia-permisos.test.js`
- Modify: `src/pages/radiologia/pages/plantillas-radiologia.jsx`
- Modify: `src/components/header-principal.jsx`

- [ ] **Step 1: Write the failing policy test**

```js
import { puedePublicarPlantillasRadiologia } from "./plantillas-radiologia-permisos";

test.each(["radiologo", "admin", "administrador", "desarrollador"])(
	"permite publicar a %s",
	(rol) => expect(puedePublicarPlantillasRadiologia(rol)).toBe(true),
);
test.each(["tecnico_radiologia", "recepcionista"])(
	"niega publicar a %s",
	(rol) => expect(puedePublicarPlantillasRadiologia(rol)).toBe(false),
);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/utils/plantillas-radiologia-permisos.test.js`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the role helper and consume it**

```js
import { normalizarRolPermisos } from "./role-permissions";

const ROLES_PUBLICADORES = new Set(["radiologo", "admin", "administrador", "desarrollador"]);
export const puedePublicarPlantillasRadiologia = (rol) =>
	ROLES_PUBLICADORES.has(normalizarRolPermisos(rol));
```

Replace the inline role arrays in Plantillas and Header with this helper.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand src/utils/plantillas-radiologia-permisos.test.js src/components/header-principal.test.jsx`

Expected: PASS; Administrador sees Plantillas and a técnico does not.

- [ ] **Step 5: Commit**

Run: `git add src/utils/plantillas-radiologia-permisos.js src/utils/plantillas-radiologia-permisos.test.js src/pages/radiologia/pages/plantillas-radiologia.jsx src/components/header-principal.jsx src/components/header-principal.test.jsx && git commit -m "feat: authorize shared radiology template publishers"`

### Task 2: Forzar publicación de organización

**Files:**
- Modify: `src/pages/radiologia/pages/plantillas-radiologia.jsx`
- Test: `src/pages/radiologia/pages/plantillas-radiologia.test.jsx`

- [ ] **Step 1: Write the failing form test**

```jsx
render(<PlantillasRadiologia />);
fireEvent.click(await screen.findByRole("button", { name: /Nueva plantilla/i }));
expect(screen.queryByLabelText(/Visibilidad/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/pages/radiologia/pages/plantillas-radiologia.test.jsx`

Expected: FAIL because the form currently offers Privado.

- [ ] **Step 3: Remove the visibility input and set it in the payload**

```js
const payload = {
	...,
	visibilidad: "organizacion",
	...,
};
```

Keep historical private records manageable on the Plantillas page, but never create a new one.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --runInBand src/pages/radiologia/pages/plantillas-radiologia.test.jsx && git add src/pages/radiologia/pages/plantillas-radiologia.jsx src/pages/radiologia/pages/plantillas-radiologia.test.jsx && git commit -m "feat: publish radiology templates to organization"`

Expected: PASS; upload metadata has `visibilidad: "organizacion"`.

### Task 3: Mostrar sólo plantillas compartidas en el Visor

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] **Step 1: Write the failing selector test**

```js
expect(plantillasQuery.eq).toHaveBeenCalledWith("visibilidad", "organizacion");
expect(screen.queryByText(/Privado/i)).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: /Normal/i })).toBeInTheDocument();
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: FAIL because the Visor reads all visibilities and renders a private tab.

- [ ] **Step 3: Filter the query and remove private selector state**

```js
const { data, error } = await supabase
	.from("plantillas_radiologia")
	.select("id, nombre, descripcion, categoria, archivo_url, mime_type, contenido_html, membrete_base64, created_at")
	.eq("visibilidad", "organizacion")
	.order("created_at", { ascending: false });
```

Do not change `aplicarPlantillaReporte`, preserving Normal, Hallazgos and Limpiar.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx && git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx && git commit -m "feat: show shared templates in radiology viewer"`

Expected: PASS; only organization templates are selectable.

### Task 4: Separar RLS de lectura y publicación

**Files:**
- Create: `supabase/migrations/20260807130000_plantillas_radiologia_compartidas.sql`

- [ ] **Step 1: Review the failing policy contract**

Run: `rg -n "es_usuario_plantillas_radiologia|plantillas_radiologia_storage" supabase/migrations/20260510010000_plantillas_radiologia.sql`

Expected: the existing function excludes Administrador and uses one predicate for read and write.

- [ ] **Step 2: Add the migration**

```sql
create or replace function public.es_publicador_plantillas_radiologia()
returns boolean language sql security definer set search_path = public as $$
	select exists (
		select 1 from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true)
			and translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu') in ('radiologo', 'admin', 'administrador', 'desarrollador')
	);
$$;
```

Drop/recreate table and Storage policies: `SELECT` must expose only organization records/files; `INSERT`, `UPDATE`, and `DELETE` must require the new publicador function.

- [ ] **Step 3: Verify structure and commit**

Run: `git diff --check && git add supabase/migrations/20260807130000_plantillas_radiologia_compartidas.sql && git commit -m "feat: share radiology templates securely"`

Expected: clean migration with no broad write policy.

### Task 5: Final verification

**Files:**
- Verify: all files above

- [ ] **Step 1: Run focused tests and build**

Run: `npm test -- --runInBand src/utils/plantillas-radiologia-permisos.test.js src/pages/radiologia/pages/plantillas-radiologia.test.jsx src/components/header-principal.test.jsx src/pages/radiologia/pages/visor-dicom.test.jsx && npm run build`

Expected: all selected suites and Vite build exit 0.

- [ ] **Step 2: Verify scope**

Run: `git diff --check && git status --short`

Expected: only role policy, Plantillas, Header, Visor, tests and the RLS migration are changed.
