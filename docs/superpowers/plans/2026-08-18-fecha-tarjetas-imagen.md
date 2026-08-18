# Fecha de tarjetas de imagen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar la hora civil de Ciudad de México en las tarjetas de imagen creadas desde `nuevo-paciente` y reparar los registros históricos que tienen la firma del desfase.

**Architecture:** `ventas.fecha_venta` conserva el instante UTC porque es `timestamptz`; sólo `estudios_radiologia.fecha_estudio`, una columna sin zona, recibirá la hora local sin sufijo UTC. Una migración ajustará seis horas únicamente en las filas ligadas a una venta donde ambas fechas representan el mismo instante defectuoso.

**Tech Stack:** React, JavaScript, Jest, Supabase/PostgreSQL migrations.

---

### Task 1: Formatear la hora civil de Ciudad de México

**Files:**
- Modify: `src/utils/fecha-mexico.js`
- Test: `src/utils/fecha-mexico.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { crearRangoFechaMexico, formatearFechaHoraMexicoLocal } from './fecha-mexico';

it('convierte un instante UTC nocturno a fecha y hora civil de México sin zona', () => {
  expect(formatearFechaHoraMexicoLocal(new Date('2026-08-18T00:27:00.000Z')))
    .toBe('2026-08-17T18:27:00');
});
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `npm test -- src/utils/fecha-mexico.test.js --runInBand`

Expected: FAIL porque `formatearFechaHoraMexicoLocal` no existe.

- [ ] **Step 3: Implementar el helper mínimo**

```js
export const formatearFechaHoraMexicoLocal = (fecha = new Date()) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(fecha));
  const valores = Object.fromEntries(partes.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}`;
};
```

- [ ] **Step 4: Ejecutar la prueba para comprobar que pasa**

Run: `npm test -- src/utils/fecha-mexico.test.js --runInBand`

Expected: PASS.

### Task 2: Persistir el valor local en las tarjetas nuevas

**Files:**
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx:17-83,383-398,515-530`
- Test: `src/utils/fecha-mexico.test.js`

- [ ] **Step 1: Reemplazar la conversión local ad hoc**

Importar `formatearFechaHoraMexicoLocal`, conservar `const ahora = new Date()`, eliminar `fechaMexico`, usar `ahora.toISOString()` para `fecha_venta` y `fechaProgramada`, y cambiar sólo `fecha_estudio` por `formatearFechaHoraMexicoLocal(ahora)`.

- [ ] **Step 2: Ejecutar la regresión de fecha**

Run: `npm test -- src/utils/fecha-mexico.test.js --runInBand`

Expected: PASS.

### Task 3: Reparar las tarjetas históricas afectadas

**Files:**
- Create: `supabase/migrations/20260818130000_corregir_fecha_estudios_imagen_nuevo_paciente.sql`

- [ ] **Step 1: Crear una migración idempotente y acotada**

```sql
update public.estudios_radiologia as er
set fecha_estudio = er.fecha_estudio - interval '6 hours'
from public.ventas as v
where er.id_venta = v.id_venta
  and er.fecha_estudio = timezone('UTC', v.fecha_venta);
```

La igualdad impide actualizar estudios DICOM independientes o tarjetas cuyo valor no fue generado junto con su venta.

- [ ] **Step 2: Revisar estáticamente el alcance de la migración**

Run: `rg -n "id_venta = v.id_venta|fecha_estudio = timezone\('UTC', v.fecha_venta\)|interval '6 hours'" supabase/migrations/20260818130000_corregir_fecha_estudios_imagen_nuevo_paciente.sql`

Expected: las tres restricciones aparecen una vez.

### Task 4: Verificación integral

**Files:**
- Verify: `src/utils/fecha-mexico.test.js`
- Verify: `src/pages/laboratorio/nuevo-paciente.jsx`
- Verify: `supabase/migrations/20260818130000_corregir_fecha_estudios_imagen_nuevo_paciente.sql`

- [ ] **Step 1: Ejecutar pruebas focalizadas**

Run: `npm test -- src/utils/fecha-mexico.test.js src/utils/cita-nuevo-paciente.test.js --runInBand`

Expected: PASS sin fallas.

- [ ] **Step 2: Construir el cliente**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Revisar el diff final**

Run: `git diff --check && git diff -- src/utils/fecha-mexico.js src/utils/fecha-mexico.test.js src/pages/laboratorio/nuevo-paciente.jsx supabase/migrations/20260818130000_corregir_fecha_estudios_imagen_nuevo_paciente.sql`

Expected: sin errores de espacios y con cambios únicamente en el alcance acordado.
