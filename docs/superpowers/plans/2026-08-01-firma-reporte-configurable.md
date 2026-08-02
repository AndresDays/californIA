# Firma configurable del reporte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conservar el color original de la firma y permitir ajustar por separado firma y datos profesionales en el reporte y PDF.

**Architecture:** Añadir una configuración `reporte_firma` por estudio, usarla en el visor y transmitirla al generador PDF. El visor expone controles numéricos independientes para posición y escala; el PDF aplica la misma geometría.

**Tech Stack:** React, Supabase JSONB, CSS, jsPDF, Jest.

---

### Task 1: Persistir la configuración de firma

**Files:**
- Modify: `supabase/migrations/20260801150000_reporte_encabezado_editable.sql`
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`

- [ ] Añadir `reporte_firma jsonb` y extender el guardado del reporte para persistirlo junto con encabezado y texto.
- [ ] Cargar `reporte_firma` con valores seguros por defecto: firma a 120%, datos a 100%, sin desplazamiento.

### Task 2: Renderizar y editar bloques independientes

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`
- Modify: `src/pages/radiologia/pages/ReporteRadiologia.css`
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`

- [ ] Escribir una prueba que compruebe que la firma no aplica filtro y que los dos bloques usan su configuración independiente.
- [ ] Quitar el filtro que convierte la firma en negra; aumentar su tamaño base.
- [ ] Añadir controles de X, Y y escala para firma y datos, visibles solo en edición.

### Task 3: Incluir firma configurable en PDF

**Files:**
- Modify: `src/utils/reporte-pdf.js`
- Test: `src/utils/reportepdf.test.js`

- [ ] Escribir una prueba que compruebe que el PDF recibe la URL y geometría de firma.
- [ ] Dibujar la firma con su color original y la configuración guardada; dibujar nombre, especialidad y cédula en su bloque independiente.
- [ ] Pasar configuración y datos de firma desde el visor al generador PDF.

### Task 4: Verificar

**Files:**
- Test: `src/pages/radiologia/pages/visor-dicom.test.jsx`
- Test: `src/utils/reportepdf.test.js`

- [ ] Ejecutar las pruebas específicas y `npm run build`.
