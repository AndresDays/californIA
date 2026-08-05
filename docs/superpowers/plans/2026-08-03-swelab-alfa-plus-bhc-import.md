# Swelab Alfa Plus BHC Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import BHC result batches from the Swelab Access database into CalifornIA as saved, never validated, clinical results.

**Architecture:** A Windows agent reads `Resultados.mdb` through the installed Access OLE DB provider without writing to it. It submits a normalized batch to an authenticated Supabase Edge Function, which validates folio/BHC matching, persists idempotent audit records, and updates only the selected `estudios_venta` row to `guardado`.

**Tech Stack:** PowerShell 5.1+, Windows Task Scheduler, Microsoft Access Database Engine, Supabase Edge Functions (Deno), PostgreSQL, Jest.

---

### Task 1: Persist idempotent import audit records

**Files:**
- Create: `supabase/migrations/20260803150000_swelab_bhc_import.sql`
- Test: `supabase/migrations/20260803150000_swelab_bhc_import.sql`

- [ ] **Step 1: Add the import and exception tables with unique source IDs**

Create `swelab_importaciones` keyed by the Access `Resultados.Id` and `swelab_importaciones_excepcion` for rejected batches. Include source folio, source timestamp, normalized payload, selected sale-study ID, status, and timestamps.

- [ ] **Step 2: Apply the migration to the target Supabase project**

Run: `supabase db push`

Expected: migration applies once and tables are visible in the project schema.

### Task 2: Add authenticated import endpoint

**Files:**
- Create: `supabase/functions/swelab-import/index.ts`
- Modify: `supabase/functions/_shared/request-auth.js`
- Test: `src/utils/swelab-import.test.js`

- [ ] **Step 1: Write failing normalizer tests**

Test a valid batch, duplicate source ID, unknown folio, non-BHC sale-study, duplicate BHC, and unmapped result.

- [ ] **Step 2: Implement the pure batch normalizer and tests**

Require a non-empty source ID, folio, BHC-only result keys, and numeric/string values. Group result keys into the JSON contract used by `estudios_venta.resultados`.

- [ ] **Step 3: Implement the Edge Function**

Verify `Authorization: Bearer $SWELAB_IMPORT_SECRET`; use the service role only inside the function. Resolve `ventas.folio`, require exactly one `estudios_venta.clave_estudio = 'BHC'` whose validation state is not `validado`, reject unknown mappings, record exceptions, and insert audit rows before updating `resultados`, `estado_captura = 'completado'`, and `estado_validacion = 'guardado'`.

- [ ] **Step 4: Deploy after staging verification**

Run: `supabase functions deploy swelab-import --no-verify-jwt`

Expected: a POST with the configured bearer secret returns a batch outcome without exposing service credentials.

### Task 3: Build Windows Access reader and installer

**Files:**
- Create: `integrations/swelab-agent/SwelabImportAgent.ps1`
- Create: `integrations/swelab-agent/install.ps1`
- Create: `integrations/swelab-agent/config.example.json`
- Create: `integrations/swelab-agent/README.md`

- [ ] **Step 1: Read source Access rows without writes**

Use `System.Data.OleDb` to join `Resultados` with `Conversiones`, read rows with `Estado = 2`, and only project `Id`, `Folio`, result value, unit, reference, timestamp, and `NombreEnSistema`.

- [ ] **Step 2: Keep a local checkpoint and retry queue**

Persist the latest successfully acknowledged Access IDs in `%ProgramData%\\CalifornIA\\swelab-agent\\state.json`. Never advance the checkpoint after HTTP or validation failure.

- [ ] **Step 3: Register automatic execution**

Create a Windows scheduled task running as `SYSTEM` at startup and every minute. Configure automatic restart behavior and write logs under the same ProgramData directory.

- [ ] **Step 4: Verify on the analyzer PC using one known test folio**

Run: `powershell -ExecutionPolicy Bypass -File .\\SwelabImportAgent.ps1 -Once -Verbose`

Expected: one BHC is submitted, appears Guardado in Captura, and requires manual validation.

### Task 4: Surface provenance in Capture

**Files:**
- Modify: `src/pages/laboratorio/captura.jsx`
- Modify: `src/pages/laboratorio/captura.css`
- Test: `src/utils/captura-row-status.test.js`

- [ ] **Step 1: Render source provenance for imported BHC**

Display the Swelab import timestamp and source folio next to the BHC capture fields; do not add any validation action.

- [ ] **Step 2: Verify full regression suite**

Run: `npm test -- --runInBand && npm run build`

Expected: application tests and production build pass.
