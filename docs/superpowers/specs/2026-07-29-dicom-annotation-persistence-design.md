# DICOM Annotation Persistence Design

## Goal

Persist the visual edits and annotations made to every DICOM image of a radiology study so they are restored when the study is opened again.

## Scope

Each saved state is associated with the study and its individual image key. The key is the DICOM metadata row when it exists and otherwise the image storage path, which also covers legacy single-file studies. It includes viewport changes (window/level, zoom, pan, inversion, rotation, horizontal/vertical flips) and overlay content (lengths, text annotations, angles, ellipses, rectangles, and bidirectional measurements).

## Storage

Create a dedicated database table keyed by `id_estudio` and a stable image storage path, with an optional `id_imagen` reference when DICOM metadata exists. It stores one versioned JSON state document per image, along with timestamps and the user who last changed it. This avoids mixing many image states into the study record and keeps the image metadata table immutable.

## User Interaction

- When an image loads, the viewer fetches and applies its saved viewport and overlay state before rendering it as ready.
- Any completed editing action queues an automatic save for the current image. Rapid viewport changes are debounced; completed annotations save immediately.
- `Restaurar` removes the current image's persisted state and clears every viewport adjustment and overlay element for that image.
- Existing per-tool deletion controls remove only their targeted measurement or annotation, then persist the updated state.
- Saving failures leave the edit visible locally and show a clear notification so a radiologist does not silently lose work.

## Data Model

The JSON document contains a serializable Cornerstone viewport subset and overlay arrays in their existing image-coordinate form. Temporary drawing/hover/UI fields are excluded. The schema version allows future viewer changes to safely ignore unsupported state.

## Security and Access

Database policies follow the existing radiology-study access model: permitted radiology staff can read and update saved view state only for studies they can access. Patient-facing viewers never load or expose annotations.

## Testing

Tests cover serializing/deserializing one image's viewport and overlays, autosave on a completed edit, restoration when re-opening an image, reset deletion, per-tool deletion persistence, and a failed save notification.
