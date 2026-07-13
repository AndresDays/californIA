# Staging Schema Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an empty Supabase project reproducible from this repository without copying production rows or secrets.

**Architecture:** A generated, schema-only baseline migration captures production's current public schema at migration version `20260712093000`. A staging-only bootstrap marks the older incremental migrations as already represented by that baseline, applies the baseline, and leaves later migrations to `supabase db push`. Static tests prevent a data-bearing dump or a production project reference from entering this workflow.

**Tech Stack:** Supabase CLI, PostgreSQL `pg_dump` through Docker, Node.js ESM, Jest, Vercel Preview environment variables.

---

### Task 1: Make the schema dump safe and reproducible

**Files:**
- Create: `scripts/build-staging-baseline.js`
- Create: `scripts/build-staging-baseline.test.js`
- Create: `supabase/migrations/20260508000000_schema_baseline.sql` (generated; reviewed output)

- [ ] **Step 1: Write the failing tests for dump validation**

```js
import { buildBaseline, validateSchemaDump } from './build-staging-baseline.js';

test('rejects a dump containing table data', () => {
  expect(() => validateSchemaDump('COPY public.pacientes (id) FROM stdin;'))
    .toThrow('The schema dump must not contain table data');
});

test('removes Supabase-managed schemas from the baseline', () => {
  const output = buildBaseline([
    'CREATE SCHEMA public;',
    'CREATE SCHEMA storage;',
    'CREATE TABLE public.pacientes (id_paciente integer);',
    'CREATE TABLE storage.objects (id uuid);',
  ].join('\n'));

  expect(output).toContain('CREATE TABLE public.pacientes');
  expect(output).not.toContain('CREATE SCHEMA public');
  expect(output).not.toContain('storage.objects');
});
```

- [ ] **Step 2: Run the tests and confirm they fail because the helper does not exist**

Run: `npm test -- scripts/build-staging-baseline.test.js --runInBand`

Expected: FAIL with a missing module or missing named export error.

- [ ] **Step 3: Implement the schema-only builder**

Create `scripts/build-staging-baseline.js` with exported `validateSchemaDump(source)` and `buildBaseline(source)` functions. `validateSchemaDump` must throw when `source` contains a PostgreSQL data statement matching `^(COPY|INSERT INTO) ` or a `-- Data for Name:` section. `buildBaseline` must split the dump into object blocks, retain only blocks whose schema is `public`, and remove the `CREATE SCHEMA public` / public-schema comment blocks. It must preserve public functions, tables, sequences, constraints, indexes, triggers, grants, RLS enablement, and policies. Prefix the generated file with `create extension if not exists pgcrypto;` because the baseline uses `gen_random_uuid()`.

The executable section must require one argument and write the reviewed output:

```js
if (process.argv.length !== 3) {
  throw new Error('Usage: node scripts/build-staging-baseline.js <schema-dump.sql>');
}

const source = readFileSync(process.argv[2], 'utf8');
const output = buildBaseline(source);
writeFileSync(
  new URL('../supabase/migrations/20260508000000_schema_baseline.sql', import.meta.url),
  output,
);
```

- [ ] **Step 4: Generate and inspect the baseline migration**

Run:

```bash
node scripts/build-staging-baseline.js /tmp/california-production-schema-extracted.sql
rg -n '^(COPY|INSERT INTO)|-- Data for Name:|CREATE SCHEMA (public|storage)|storage\.' supabase/migrations/20260508000000_schema_baseline.sql
```

Expected: the final `rg` command prints no matches. Confirm the file creates `public.ventas`, `public.citas`, `public.empleados`, `public.pacientes`, `public.doctores`, and `public.sucursales`.

- [ ] **Step 5: Run the builder tests**

Run: `npm test -- scripts/build-staging-baseline.test.js --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit the baseline generation work**

```bash
git add scripts/build-staging-baseline.js scripts/build-staging-baseline.test.js supabase/migrations/20260508000000_schema_baseline.sql
git commit -m "feat: add reproducible Supabase schema baseline"
```

### Task 2: Add an explicit staging bootstrap guard

**Files:**
- Create: `scripts/bootstrap-staging.js`
- Create: `scripts/bootstrap-staging.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing guard tests**

```js
import { getLegacyVersions, validateStagingProject } from './bootstrap-staging.js';

test('selects only migrations represented by the baseline', () => {
  expect(getLegacyVersions([
    '20260508000000_schema_baseline.sql',
    '20260509000000_link_ventas_citas.sql',
    '20260712093000_portal_resultados_seguro.sql',
    '20260713000000_future_change.sql',
  ])).toEqual(['20260509000000', '20260712093000']);
});

test('rejects the production Supabase reference', () => {
  expect(() => validateStagingProject('yufpytzzywcxkmuxhlxb'))
    .toThrow('Refusing to bootstrap the production project');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- scripts/bootstrap-staging.test.js --runInBand`

Expected: FAIL with a missing module or missing named export error.

- [ ] **Step 3: Implement the bootstrap script**

Create `scripts/bootstrap-staging.js` with these constants and guards:

```js
export const BASELINE_VERSION = '20260508000000';
export const LEGACY_VERSION_MAX = '20260712093000';
export const PRODUCTION_PROJECT_REF = 'yufpytzzywcxkmuxhlxb';

export function validateStagingProject(projectRef) {
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error('A valid staging project reference is required');
  if (projectRef === PRODUCTION_PROJECT_REF) throw new Error('Refusing to bootstrap the production project');
}

export function getLegacyVersions(files) {
  return files
    .map((file) => file.match(/^(\d+)_/u)?.[1])
    .filter((version) => version && version > BASELINE_VERSION && version <= LEGACY_VERSION_MAX)
    .sort();
}
```

In its executable section, require `SUPABASE_STAGING_PROJECT_REF`, call `validateStagingProject`, run `supabase link --project-ref <ref>`, then run `supabase migration repair <legacy versions> --status applied --yes`, followed by `supabase db push --include-all --yes`. Use `execFileSync` with argument arrays; do not shell-interpolate the project reference.

- [ ] **Step 4: Add the npm script**

Add this entry under `scripts` in `package.json`:

```json
"bootstrap:staging": "node scripts/bootstrap-staging.js"
```

- [ ] **Step 5: Run the bootstrap tests**

Run: `npm test -- scripts/bootstrap-staging.test.js --runInBand`

Expected: PASS.

- [ ] **Step 6: Verify against the empty staging project**

Run:

```bash
SUPABASE_STAGING_PROJECT_REF=oavjusrxvmbqebwdqwyy npm run bootstrap:staging
supabase migration list
```

Expected: `20260508000000` and every migration through `20260712093000` show as applied remotely; no command targets `yufpytzzywcxkmuxhlxb`.

- [ ] **Step 7: Commit the bootstrap guard**

```bash
git add package.json scripts/bootstrap-staging.js scripts/bootstrap-staging.test.js
git commit -m "feat: add guarded staging bootstrap"
```

### Task 3: Verify required tables and document environment bootstrap

**Files:**
- Create: `scripts/verify-staging-schema.js`
- Create: `scripts/verify-staging-schema.test.js`
- Modify: `README.md`

- [ ] **Step 1: Write the failing expected-table test**

```js
import { REQUIRED_TABLES, buildVerificationQuery } from './verify-staging-schema.js';

test('checks every operational base table in one query', () => {
  expect(REQUIRED_TABLES).toEqual(expect.arrayContaining([
    'pacientes', 'citas', 'ventas', 'estudios_venta', 'empleados', 'doctores', 'sucursales',
  ]));
  expect(buildVerificationQuery()).toContain("to_regclass('public.pacientes')");
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- scripts/verify-staging-schema.test.js --runInBand`

Expected: FAIL with a missing module or missing named export error.

- [ ] **Step 3: Implement the schema verifier**

Create `scripts/verify-staging-schema.js` with:

```js
export const REQUIRED_TABLES = [
  'analitos', 'citas', 'clientes', 'doctores', 'empleados', 'empresas',
  'estudio_analitos', 'estudios_radiologia', 'estudios_venta', 'pacientes',
  'precios_estudios', 'sucursales', 'ventas',
];

export function buildVerificationQuery() {
  return `select ${REQUIRED_TABLES
    .map((table) => `to_regclass('public.${table}') as ${table}`)
    .join(', ')};`;
}
```

When executed, require `DATABASE_URL`, invoke Docker with an argument array equivalent to:

```bash
docker run --rm -e DATABASE_URL public.ecr.aws/supabase/postgres:17.6.1.044 \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$VERIFY_QUERY"'
```

Pass the generated query as `VERIFY_QUERY` through Docker's environment, throw if any returned column is empty, and never print either secret.

- [ ] **Step 4: Run the verifier tests**

Run: `npm test -- scripts/verify-staging-schema.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Document the staging environment**

Add a `## Staging` section to `README.md` containing:

```markdown
1. Run `SUPABASE_STAGING_PROJECT_REF=<staging-ref> npm run bootstrap:staging` once for a new empty project.
2. Obtain the staging Project URL and publishable key from Settings > API.
3. In Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the Preview environment and restrict them to the `staging` branch.
4. Add `https://staging.californiadiagnostica.com` to Supabase Auth redirect URLs.
5. Keep production Twilio credentials out of staging. Use only sandbox credentials or leave WhatsApp secrets unset.
```

- [ ] **Step 6: Run complete verification**

Run:

```bash
npm test -- --runInBand
npm run build
SUPABASE_STAGING_PROJECT_REF=oavjusrxvmbqebwdqwyy npm run bootstrap:staging
```

Expected: tests and build pass; bootstrap completes without touching production.

- [ ] **Step 7: Commit documentation and verification**

```bash
git add README.md scripts/verify-staging-schema.js scripts/verify-staging-schema.test.js
git commit -m "docs: document isolated staging bootstrap"
```

### Task 4: Seed only non-clinical staging reference data

**Files:**
- Create: `supabase/migrations/20260712094000_staging_reference_seed.sql`
- Create: `scripts/staging-reference-seed.test.js`

- [ ] **Step 1: Write the failing seed-boundary tests**

```js
import { readFileSync } from 'node:fs';

const seed = readFileSync(
  new URL('../supabase/migrations/20260712094000_staging_reference_seed.sql', import.meta.url),
  'utf8',
);

test('seeds only staging reference records', () => {
  expect(seed).toContain("'STAGING - NO PRODUCCION'");
  expect(seed).toContain("'STAGING-DX-PRUEBA'");
  expect(seed).not.toMatch(/insert into public\.(pacientes|citas|ventas|empleados|doctores)/i);
});
```

- [ ] **Step 2: Run the test and confirm it fails because the seed does not exist**

Run: `npm test -- scripts/staging-reference-seed.test.js --runInBand`

Expected: FAIL with `ENOENT` for the new migration.

- [ ] **Step 3: Create the minimal reference seed**

Create `supabase/migrations/20260712094000_staging_reference_seed.sql` with exactly these non-clinical records:

```sql
insert into public.sucursales (nombre)
values ('STAGING - NO PRODUCCION');

insert into public.estudios_imagen_catalogo (
  clave,
  descripcion,
  empresa_operativa,
  modalidad,
  area,
  requiere_contraste,
  requiere_interpretacion,
  dias_proceso,
  activo
)
values (
  'STAGING-DX-PRUEBA',
  'RADIOGRAFIA DE PRUEBA - SOLO STAGING',
  'CDC',
  'radiografia',
  'Pruebas',
  false,
  true,
  1,
  true
)
on conflict (clave) do update set
  descripcion = excluded.descripcion,
  updated_at = now();

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio)
values ('Estudio', 'STAGING-DX-PRUEBA', 'RADIOGRAFIA DE PRUEBA - SOLO STAGING', 'Particular', 1.00);
```

- [ ] **Step 4: Run the seed-boundary test**

Run: `npm test -- scripts/staging-reference-seed.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Apply and inspect the staging seed**

Run:

```bash
SUPABASE_STAGING_PROJECT_REF=oavjusrxvmbqebwdqwyy npm run bootstrap:staging
```

Expected: the staging database contains one explicitly named staging branch and one `STAGING-DX-PRUEBA` catalog entry, with no patient, appointment, sale, employee, or doctor rows inserted by this migration.

- [ ] **Step 6: Commit the staging-only seed**

```bash
git add supabase/migrations/20260712094000_staging_reference_seed.sql scripts/staging-reference-seed.test.js
git commit -m "feat: seed non-clinical staging reference data"
```
