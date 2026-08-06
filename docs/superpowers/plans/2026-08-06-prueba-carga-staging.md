# Prueba de carga de staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar una prueba de carga reproducible con k6 para 5, 10 y 15 usuarios concurrentes en staging.

**Architecture:** Un script de k6 consume únicamente variables de entorno de staging y un token temporal. Ejecuta solicitudes de solo lectura a la aplicación y a Supabase; el reporte se genera localmente y no contiene secretos.

**Tech Stack:** k6 OSS, JavaScript, Node.js test runner y Markdown.

---

### Task 1: Definir la prueba de carga

**Files:**
- Create: `load-tests/california-staging.js`
- Test: `tests/load/california-staging-load.test.mjs`

- [ ] **Step 1: Ejecutar la prueba de contrato antes de crear el script**

Run: `node --test tests/load/california-staging-load.test.mjs`

Expected: FAIL because `load-tests/california-staging.js` does not exist.

- [ ] **Step 2: Crear el script de k6 con tres escenarios**

El script debe validar las cuatro variables requeridas en `setup`, definir escenarios secuenciales de 5, 10 y 15 VUs durante tres minutos y consultar solo rutas de lectura.

- [ ] **Step 3: Ejecutar la prueba de contrato**

Run: `node --test tests/load/california-staging-load.test.mjs`

Expected: PASS, 2 tests.

### Task 2: Documentar ejecución y resultados

**Files:**
- Create: `docs/operations/load-testing.md`
- Modify: `README.md`

- [ ] **Step 1: Documentar variables, ejecución en staging y criterios de aprobación**

Incluir el comando de k6, la prohibición de producción y una tabla de resultados para 5, 10 y 15 usuarios.

- [ ] **Step 2: Enlazar la guía desde el README**

- [ ] **Step 3: Verificar que la aplicación sigue compilando**

Run: `npm run build`

Expected: exit code 0.
