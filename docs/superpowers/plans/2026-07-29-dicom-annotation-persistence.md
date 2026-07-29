# DICOM Annotation Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each DICOM image's viewport and annotations so they survive closing and reopening its radiology study.

**Architecture:** A small `dicom-view-state` utility will define the versioned, serializable state format and its storage key. A Supabase table stores one state document for each `id_estudio` plus storage path. `VisorDicom` loads the states with the image metadata and `PanelDicom` restores, debounces, upserts, or deletes its own state through explicit callbacks.

**Tech Stack:** React 18, Cornerstone Core, Supabase/PostgreSQL RLS, Jest, React Testing Library.

---

### Task 1: Define the serializable DICOM view-state contract

**Files:**
- Create: `src/utils/dicom-view-state.js`
- Create: `src/utils/dicom-view-state.test.js`

- [ ] **Step 1: Write failing tests for serialization and legacy image keys**

  ```js
  import { crearEstadoVistaDicom, crearClaveImagenDicom } from "./dicom-view-state";

  test("serializa viewport y overlays sin campos temporales", () => {
    expect(crearEstadoVistaDicom({
      viewport: { scale: 1.5, voi: { windowWidth: 400, windowCenter: 40 }, translation: { x: 4, y: 8 }, invert: true },
      lineas: [{ px1: 1, py1: 2, px2: 3, py2: 4, dist: 5 }],
      anotaciones: [{ px: 4, py: 5, texto: "lesión" }],
      angulos: [], elipses: [], rects: [], bidis: [],
    })).toEqual(expect.objectContaining({ version: 1, viewport: expect.objectContaining({ scale: 1.5 }), overlays: expect.objectContaining({ lineas: expect.any(Array) }) }));
  });

  test("usa storage_path como clave para la imagen sin metadata", () => {
    expect(crearClaveImagenDicom({ storage_path: "123/imagen.dcm" })).toBe("123/imagen.dcm");
  });
  ```

- [ ] **Step 2: Run the utility tests and verify red**

  Run: `npm test -- dicom-view-state.test.js --runInBand`

  Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement only the versioned state helpers**

  ```js
  export const crearClaveImagenDicom = (imagen = {}) => String(imagen.storage_path || "").trim();

  export const crearEstadoVistaDicom = ({ viewport, lineas = [], anotaciones = [], angulos = [], elipses = [], rects = [], bidis = [] }) => ({
    version: 1,
    viewport: {
      scale: viewport?.scale ?? 1,
      voi: { windowWidth: viewport?.voi?.windowWidth ?? 2000, windowCenter: viewport?.voi?.windowCenter ?? 0 },
      translation: { x: viewport?.translation?.x ?? 0, y: viewport?.translation?.y ?? 0 },
      invert: Boolean(viewport?.invert), rotation: viewport?.rotation ?? 0,
      hflip: Boolean(viewport?.hflip), vflip: Boolean(viewport?.vflip),
    },
    overlays: { lineas, anotaciones, angulos, elipses, rects, bidis },
  });

  export const leerEstadoVistaDicom = (estado) =>
    estado?.version === 1 ? estado : null;
  ```

- [ ] **Step 4: Run the utility tests and verify green**

  Run: `npm test -- dicom-view-state.test.js --runInBand`

  Expected: PASS.

- [ ] **Step 5: Commit the contract**

  ```bash
  git add src/utils/dicom-view-state.js src/utils/dicom-view-state.test.js
  git commit -m "feat: define DICOM view state contract"
  ```

### Task 2: Add protected persistent storage for image state

**Files:**
- Create: `supabase/migrations/20260729090000_dicom_view_states.sql`

- [ ] **Step 1: Write the migration with table, uniqueness, timestamps, and RLS**

  ```sql
  create table if not exists public.estudio_dicom_estados_vista (
    id bigint generated always as identity primary key,
    id_estudio integer not null references public.estudios_radiologia(id_estudio) on delete cascade,
    id_imagen bigint references public.estudio_dicom_imagenes(id_imagen) on delete cascade,
    storage_path text not null,
    estado jsonb not null,
    actualizado_por uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_estudio_dicom_estado_vista unique (id_estudio, storage_path)
  );

  create index if not exists idx_estudio_dicom_estados_vista_estudio
    on public.estudio_dicom_estados_vista (id_estudio);

  alter table public.estudio_dicom_estados_vista enable row level security;

  create policy estudio_dicom_estados_vista_operacion_interna
    on public.estudio_dicom_estados_vista for all to authenticated
    using (public.es_empleado_interno_activo())
    with check (public.es_empleado_interno_activo());
  ```

- [ ] **Step 2: Add the update trigger and schema reload**

  ```sql
  create or replace function public.actualizar_updated_at_estudio_dicom_estado_vista()
  returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    new.actualizado_por = auth.uid();
    return new;
  end;
  $$;

  create trigger trg_actualizar_estudio_dicom_estado_vista
    before insert or update on public.estudio_dicom_estados_vista
    for each row execute function public.actualizar_updated_at_estudio_dicom_estado_vista();

  notify pgrst, 'reload schema';
  ```

- [ ] **Step 3: Verify migration syntax against the project baseline**

  Run: `npm test -- scripts/verify-staging-schema.test.js --runInBand`

  Expected: PASS; the migration is additive and does not alter existing image metadata.

- [ ] **Step 4: Commit the migration**

  ```bash
  git add supabase/migrations/20260729090000_dicom_view_states.sql
  git commit -m "feat: persist DICOM image view states"
  ```

### Task 3: Load, restore, and persist the active image state in the viewer

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx:235-416, 1914-2020, 2740-2860, 4290-4335`
- Modify: `src/pages/radiologia/pages/visor-dicom.test.jsx:38-210, 370-465`

- [ ] **Step 1: Write failing viewer tests for restore, autosave, and reset deletion**

  Extend the Supabase mock with `estudio_dicom_estados_vista` data and add tests that verify: a saved state is supplied to the matching `PanelDicom`; its viewport is applied after `displayImage`; a completed annotation triggers an `upsert`; and `Restaurar` deletes that state by `id_estudio` and `storage_path`.

  ```jsx
  test("restaura el viewport guardado para la imagen cargada", async () => {
    mockEstadosVista = [{ storage_path: "serie/1.dcm", estado: { version: 1, viewport: { scale: 1.5, voi: { windowWidth: 400, windowCenter: 40 }, translation: { x: 0, y: 0 } }, overlays: { lineas: [], anotaciones: [], angulos: [], elipses: [], rects: [], bidis: [] } } }];
    await renderVisor();
    await waitFor(() => expect(mockCornerstone.setViewport).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ scale: 1.5 })));
  });
  ```

- [ ] **Step 2: Run the focused viewer test and verify red**

  Run: `npm test -- visor-dicom.test.jsx --runInBand`

  Expected: FAIL because the viewer does not query or apply `estudio_dicom_estados_vista`.

- [ ] **Step 3: Load state rows with the image metadata**

  In `cargarImagenes`, query `estudio_dicom_estados_vista` by `id_estudio`, build a `Map` keyed by `storage_path`, and attach `estadoVista` to each `imagenesConUrl` object before grouping. Pass the current image metadata, its state, `onGuardarEstadoVista`, and `onEliminarEstadoVista` to each panel.

  ```jsx
  const { data: estadosVista, error: estadosError } = await supabase
    .from("estudio_dicom_estados_vista").select("id_imagen, storage_path, estado").eq("id_estudio", idEstudio);
  if (estadosError) throw estadosError;
  const estadosPorRuta = new Map((estadosVista || []).map((fila) => [fila.storage_path, fila.estado]));
  ```

- [ ] **Step 4: Restore and save state in `PanelDicom`**

  After `displayImage`, call `leerEstadoVistaDicom(estadoVista)`, set the stored viewport, replace the six overlay arrays with stored arrays, and redraw. Build the current document with `crearEstadoVistaDicom`; debounce viewport-only changes by 500 ms in a ref; call the save callback immediately after creating, editing, or deleting an overlay item. Propagate database failures through `onGuardadoEstadoFail` without clearing local state.

  ```jsx
  const guardarEstadoActual = (inmediato = false) => {
    const persistir = () => onGuardarEstadoVista?.(crearEstadoVistaDicom({
      viewport: csRef.current?.getViewport(divRef.current),
      lineas: medicionRef.current.lineas, anotaciones: anotacionRef.current.anotaciones,
      angulos: anguloRef.current.angulos, elipses: elipseRef.current.elipses,
      rects: rectRef.current.rects, bidis: bidiRef.current.bidis,
    }));
    if (inmediato) return persistir();
    clearTimeout(guardadoTimerRef.current);
    guardadoTimerRef.current = setTimeout(persistir, 500);
  };
  ```

- [ ] **Step 5: Upsert and delete state in `VisorDicom`**

  Implement the callbacks using the current study ID and image's normalized storage path. Upsert with `onConflict: "id_estudio,storage_path"`; delete only the current matching row. Show `showNotif("No se pudieron guardar las ediciones de la imagen", "error")` on a failed write.

  ```jsx
  const guardarEstadoVista = async (imagen, estado) => {
    const { error } = await supabase.from("estudio_dicom_estados_vista").upsert({
      id_estudio: Number(estudioId || estudioData?.id), id_imagen: imagen.id_imagen || null,
      storage_path: crearClaveImagenDicom(imagen), estado,
    }, { onConflict: "id_estudio,storage_path" });
    if (error) throw error;
  };
  ```

- [ ] **Step 6: Make `Restaurar` remove all persisted adjustments of its current image**

  Update both reset paths and `handleReset` to clear `lineas`, `anotaciones`, `angulos`, `elipses`, `rects`, and `bidis`, then invoke `onEliminarEstadoVista`. Existing context-menu deletions invoke `guardarEstadoActual(true)` after mutating their exact overlay array.

- [ ] **Step 7: Run focused tests and verify green**

  Run: `npm test -- visor-dicom.test.jsx dicom-view-state.test.js --runInBand`

  Expected: PASS, including restoration, autosave, per-tool deletion, and reset removal.

- [ ] **Step 8: Commit viewer persistence**

  ```bash
  git add src/pages/radiologia/pages/visor-dicom.jsx src/pages/radiologia/pages/visor-dicom.test.jsx
  git commit -m "feat: restore DICOM image annotations"
  ```

### Task 4: Verify the feature end to end

**Files:**
- Modify: `docs/superpowers/plans/2026-07-29-dicom-annotation-persistence.md`

- [ ] **Step 1: Run the focused verification commands**

  Run: `npm test -- visor-dicom.test.jsx dicom-view-state.test.js scripts/verify-staging-schema.test.js --runInBand`

  Expected: PASS.

- [ ] **Step 2: Build the production bundle**

  Run: `npm run build`

  Expected: Vite exits with code `0`.

- [ ] **Step 3: Perform the manual clinical workflow**

  Open a multi-image TAC, set W/L, pan, invert, draw a length and a text annotation, leave the study, reopen it, and verify the same image restores all five edits. Click `Restaurar`, reopen the study, and verify the image is clean. Delete one saved measurement from its contextual menu and verify that only that measurement remains absent after reopening.

- [ ] **Step 4: Commit the verified plan status**

  ```bash
  git add docs/superpowers/plans/2026-07-29-dicom-annotation-persistence.md
  git commit -m "docs: verify DICOM annotation persistence"
  ```
