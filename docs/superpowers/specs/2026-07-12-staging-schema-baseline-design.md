# Staging Schema Baseline Design

## Goal

Allow a newly created Supabase project to be initialized from this repository without production clinical data, then run every existing migration successfully.

## Current State

The first tracked migration, `20260509000000_link_ventas_citas.sql`, alters `public.ventas` and `public.citas`. The repository has no earlier migration that creates those tables, nor the other operational tables used by the application. Production contains this unversioned base schema, so it works there; an empty staging database does not.

## Selected Approach

Create one additive initial-schema migration whose timestamp precedes every existing migration. It will recreate the pre-migration operational baseline required by the tracked migration history. Existing migrations remain unchanged and continue to own their incremental changes.

The baseline is schema-only. It must not include rows from production or authentication users.

## Data Boundaries

Excluded from staging:

- Patients, appointments, sales, payments, radiology studies, reports, DICOM files, and attachments.
- Production employee and external-doctor accounts.
- Any production Storage object.
- Twilio, WhatsApp, and other production secrets.

Included in staging:

- Database structure, indexes, constraints, functions, RLS policies, and Storage bucket definitions required by the app.
- A minimal, reviewed seed dataset for reference catalogs and an explicitly created test administrator.
- Staging-only Edge Function secrets. WhatsApp remains disconnected or uses a sandbox sender.

## Architecture

1. Extract the current production **schema only** using a privileged, read-only database connection. The extraction is an input for review, never committed unchanged because it represents the final production state rather than the historical baseline.
2. Derive a baseline migration containing only the objects that must exist before `20260509000000_link_ventas_citas.sql`.
3. Apply that baseline plus the existing migrations to a clean local Supabase instance and then to the empty staging project.
4. Add a schema smoke-check that verifies the application-required base tables before deployment.
5. Add a documented staging bootstrap procedure for sample catalog data, a test administrator, secrets, and Vercel Preview variables.

## Error Handling and Safety

- The bootstrap command must stop before applying migrations when required base tables are absent.
- A failed deployment must leave the staging project linked back to staging, never production.
- Scripts must use explicit project references for remote operations.
- Secret values must be configured with `supabase secrets set` or Vercel environment settings and must never be committed.
- Production schema extraction must not copy table rows or Storage objects.

## Verification

Success requires all of the following:

1. A clean Supabase database can apply the new baseline followed by all existing migrations.
2. The schema smoke-check confirms the base table list used by the application.
3. The project builds and its existing tests continue to pass.
4. The staging deployment uses the staging Supabase URL and public key only in the Vercel Preview environment.
5. Creating a test patient, appointment, and sale in staging does not create or modify a production row.

## Non-Goals

- Migrating production data to staging.
- Rewriting historical migrations solely for style.
- Automatically creating real user accounts or enabling outbound WhatsApp on staging.
