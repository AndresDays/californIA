# DICOM Viewer Session Cache Design

## Goal

Restore an opened DICOM study immediately when returning to its viewer route during the same browser session.

## Design

A module-level cache keyed by `estudioId` retains loaded series, signed image IDs, active series, active panel images, and grid choice. On mount the viewer hydrates from cache before requesting Supabase; it fetches only when no entry exists. A manual refresh can invalidate the entry.

## Scope

The cache is memory-only, so it does not persist across a full browser reload and does not replace saved annotations. Signed URLs remain valid for their existing 15-minute lifetime.

## Testing

Tests verify revisiting the same study reuses cached data without repeating image metadata and signed-URL queries.
