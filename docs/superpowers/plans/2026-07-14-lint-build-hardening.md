# Lint y Build Hardening Plan

> **For agentic workers:** Este plan debe ejecutarse en una rama separada. No
> mezclar con cambios de infraestructura, restore, S3 o documentos comerciales.

**Goal:** Volver a hacer que `npm run lint` sea ejecutable y despues reducir los
errores reales hasta que pueda usarse como gate de CI/Vercel.

**Estado actual medido:** despues de sincronizar dependencias con `npm install
--cache /tmp/california-npm-cache`, `npm run lint` llega a ESLint 9 y reporta
221 problemas: 172 errores y 49 warnings.

**Decision operativa:** Vercel puede usar `npm run build` temporalmente para no
bloquear staging/produccion por deuda de lint, pero el lint debe volver como gate
cuando este plan termine.

## Fase 1: estabilizar toolchain local

- [ ] Corregir cache local de npm o documentar uso de `--cache /tmp/...` si
  aparece `root-owned files` en `~/.npm`.
- [ ] Confirmar que `node_modules/eslint/package.json` coincide con
  `package-lock.json`.
- [ ] Ejecutar `npm run lint` y guardar conteo inicial en el PR.
- [ ] Confirmar que Vercel usa la misma version de Node del proyecto.

## Fase 2: separar errores por tipo

Clasificar el output de ESLint en estas categorias:

- [ ] Errores reales simples:
  - `no-unused-vars`
  - `no-undef`
  - `no-empty`
  - unused eslint-disable
- [ ] Errores por orden de declaracion:
  - `Cannot access variable before it is declared`
- [ ] Errores de React Hooks/Compiler:
  - `set-state-in-effect`
  - `purity`
  - memoization skipped
- [ ] Warnings de dependencies:
  - `react-hooks/exhaustive-deps`

## Fase 3: resolver errores simples

- [ ] Eliminar imports, variables y parametros no usados.
- [ ] Nombrar errores ignorados como `_err` o remover catch vacios.
- [ ] Reemplazar bloques vacios por manejo explicito o comentario util.
- [ ] Arreglar `process is not defined` en frontend leyendo `import.meta.env`.
- [ ] Ejecutar lint y confirmar baja del conteo.

## Fase 4: resolver orden de declaracion

- [ ] Mover funciones usadas por efectos antes del `useEffect`.
- [ ] Donde aplique, envolver callbacks con `useCallback`.
- [ ] Evitar cambios funcionales simultaneos; cada archivo debe mantener el
  mismo comportamiento.
- [ ] Priorizar archivos compartidos y rutas criticas:
  - `src/components/editar-cita-modal.jsx`
  - `src/pages/usuarios.jsx`
  - `src/pages/radiologia/pages/visor-dicom.jsx`
  - modales de laboratorio.

## Fase 5: resolver reglas de React Hooks nuevas

- [ ] Evaluar si el proyecto quiere adoptar todas las reglas de
  `eslint-plugin-react-hooks@7`.
- [ ] Si una regla es demasiado agresiva para el codigo actual, degradarla a
  warning temporalmente con comentario en `eslint.config.js`.
- [ ] Reemplazar `Date.now()` durante render por estado, memo estable o valores
  calculados en handlers/eventos.
- [ ] Revisar setState en effects caso por caso para no introducir loops.

## Fase 6: reactivar gate

- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run test` pasa.
- [ ] `npm run build` pasa.
- [ ] Vercel vuelve a usar `npm run lint && npm run build` o un pipeline
  equivalente.
- [ ] Documentar en PR el conteo inicial y final.
