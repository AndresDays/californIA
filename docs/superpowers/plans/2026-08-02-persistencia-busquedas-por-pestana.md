# Persistencia de búsquedas por pestaña Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conservar los textos de búsqueda de las páginas cuando el usuario navega fuera de una pestaña y regresa durante la misma sesión del navegador.

**Architecture:** Un hook `useBusquedaPersistente` encapsulará la lectura y escritura de `sessionStorage` bajo claves estables, por ejemplo `california:busqueda:precios:termino`. Las páginas sustituirán únicamente sus pares `useState("")` de búsqueda por ese hook; no se modificarán consultas, filtros ni buscadores internos de modales. El hook elimina su clave al recibir texto vacío para no restaurar filtros obsoletos.

**Tech Stack:** React 18, Jest, React Testing Library, Web Storage API.

---

## Estructura de archivos

- Crear `src/hooks/use-busqueda-persistente.js`: única abstracción para estado de búsqueda temporal por página.
- Crear `src/hooks/use-busqueda-persistente.test.js`: contrato de restauración, escritura, aislamiento y limpieza del hook.
- Modificar las páginas de listados y los formularios de flujo que ya tienen campos de búsqueda: reemplazar su estado local, sin cambiar sus `onChange` existentes.
- Modificar pruebas representativas de precios y pacientes: probar que el término restaurado alimenta el filtro de la pantalla.

### Task 1: Hook de persistencia por sesión

**Files:**
- Create: `src/hooks/use-busqueda-persistente.js`
- Create: `src/hooks/use-busqueda-persistente.test.js`

- [ ] **Step 1: Escribir las pruebas que describen el contrato del hook**

```js
import { act, renderHook } from "@testing-library/react";
import { useBusquedaPersistente } from "./use-busqueda-persistente";

beforeEach(() => sessionStorage.clear());

test("restaura la búsqueda guardada para su clave", () => {
  sessionStorage.setItem("california:busqueda:precios:termino", "resonancia");
  const { result } = renderHook(() => useBusquedaPersistente("precios:termino"));
  expect(result.current[0]).toBe("resonancia");
});

test("guarda cambios y elimina una búsqueda vacía", () => {
  const { result } = renderHook(() => useBusquedaPersistente("precios:termino"));
  act(() => result.current[1]("rei"));
  expect(sessionStorage.getItem("california:busqueda:precios:termino")).toBe("rei");
  act(() => result.current[1](""));
  expect(sessionStorage.getItem("california:busqueda:precios:termino")).toBeNull();
});

test("aísla los campos de páginas distintas", () => {
  sessionStorage.setItem("california:busqueda:precios:termino", "tac");
  const { result } = renderHook(() => useBusquedaPersistente("pacientes:termino"));
  expect(result.current[0]).toBe("");
});
```

- [ ] **Step 2: Ejecutar la prueba para confirmar que falla**

Run: `npm test -- --runInBand src/hooks/use-busqueda-persistente.test.js`

Expected: FAIL porque no existe `./use-busqueda-persistente`.

- [ ] **Step 3: Implementar el hook mínimo**

```js
import { useEffect, useState } from "react";

const prefijo = "california:busqueda:";

const leerBusqueda = (clave) => {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(`${prefijo}${clave}`) || "";
};

export const useBusquedaPersistente = (clave) => {
  const [busqueda, setBusqueda] = useState(() => leerBusqueda(clave));

  useEffect(() => {
    const claveCompleta = `${prefijo}${clave}`;
    if (!busqueda) {
      sessionStorage.removeItem(claveCompleta);
      return;
    }
    sessionStorage.setItem(claveCompleta, busqueda);
  }, [busqueda, clave]);

  return [busqueda, setBusqueda];
};
```

- [ ] **Step 4: Ejecutar la prueba del hook**

Run: `npm test -- --runInBand src/hooks/use-busqueda-persistente.test.js`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-busqueda-persistente.js src/hooks/use-busqueda-persistente.test.js
git commit -m "feat: persist page searches for session"
```

### Task 2: Aplicar el hook a listados administrativos y de laboratorio

**Files:**
- Modify: `src/pages/usuarios.jsx:23`
- Modify: `src/pages/pacientes.jsx:24`
- Modify: `src/pages/laboratorio/clientes.jsx:21`
- Modify: `src/pages/laboratorio/doctores.jsx:32`
- Modify: `src/pages/laboratorio/entrega-resultados.jsx:91`
- Modify: `src/pages/laboratorio/reporte-ventas.jsx:37`
- Modify: `src/pages/laboratorio/turnos.jsx:78`
- Modify: `src/pages/laboratorio/recepcion/historial.jsx:13`
- Modify: `src/pages/laboratorio/configuracion/precios.jsx:15`
- Modify: `src/pages/laboratorio/configuracion/estudios-laboratorio.jsx:19`
- Modify: `src/pages/laboratorio/configuracion/analitos.jsx:17-18`
- Modify: `src/pages/laboratorio/configuracion/paquetes.jsx:15,22`
- Modify: `src/pages/laboratorio/configuracion/administrar-areas.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/administrar-equipos.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/administrar-metodos.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/administrar-niveles.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/administrar-recipientes.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/administrar-tecnicas.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/tipo_muestra.jsx:12`
- Modify: `src/pages/laboratorio/configuracion/precios.test.jsx`
- Modify: `src/pages/pacientes.test.jsx`

- [ ] **Step 1: Escribir pruebas de restauración en precios y pacientes**

En `precios.test.jsx`, antes de renderizar, guardar `"rei"` bajo `california:busqueda:precios:termino`; confirmar que el filtro `.or(...)` recibe `cliente.ilike.%rei%`. En `pacientes.test.jsx`, guardar `"Ana"` bajo `california:busqueda:pacientes:termino`; confirmar que el input visible contiene `Ana` y que `usePacientes` recibe `{ busqueda: "Ana" }`.

- [ ] **Step 2: Ejecutar ambas pruebas para confirmar que fallan**

Run: `npm test -- --runInBand src/pages/laboratorio/configuracion/precios.test.jsx src/pages/pacientes.test.jsx`

Expected: FAIL porque ambas páginas todavía inicializan su búsqueda con cadena vacía.

- [ ] **Step 3: Reemplazar cada estado de búsqueda por una clave estable**

Añadir el import relativo correcto de `useBusquedaPersistente` a cada página y reemplazar exactamente estos pares:

```js
// usuarios y pacientes
const [buscarUsuario, setBuscarUsuario] = useBusquedaPersistente("usuarios:termino");
const [buscarPaciente, setBuscarPaciente] = useBusquedaPersistente("pacientes:termino");

// clientes, doctores, entrega-resultados, reporte-ventas y precios
const [buscarCliente, setBuscarCliente] = useBusquedaPersistente("clientes:termino");
const [buscarDoctor, setBuscarDoctor] = useBusquedaPersistente("doctores:termino");
const [busquedaEntrega, setBusquedaEntrega] = useBusquedaPersistente("entrega-resultados:termino");
const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("reporte-ventas:estudio");
const [buscarPrecio, setBuscarPrecio] = useBusquedaPersistente("precios:termino");

// analitos
const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("analitos:estudio");
const [buscarAnalito, setBuscarAnalito] = useBusquedaPersistente("analitos:analito");

// paquetes
const [buscarPaquete, setBuscarPaquete] = useBusquedaPersistente("paquetes:paquete");
const [busquedaEstudio, setBusquedaEstudio] = useBusquedaPersistente("paquetes:estudio");
```

Usar estas claves literales para los demás campos: `usuarios:termino`, `pacientes:termino`, `clientes:termino`, `doctores:termino`, `entrega-resultados:termino`, `reporte-ventas:estudio`, `turnos:paciente`, `historial:cliente`, `precios:termino`, `estudios-laboratorio:termino`, `areas:termino`, `equipos:termino`, `metodos:termino`, `niveles:termino`, `recipientes:termino`, `tecnicas:termino`, `tipo-muestra:termino`.

- [ ] **Step 4: Ejecutar pruebas representativas**

Run: `npm test -- --runInBand src/pages/laboratorio/configuracion/precios.test.jsx src/pages/pacientes.test.jsx src/pages/usuarios-auth.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/usuarios.jsx src/pages/pacientes.jsx src/pages/laboratorio src/pages/laboratorio/configuracion
git commit -m "feat: retain administrative searches by tab"
```

### Task 3: Aplicar el hook a flujos de atención y radiología

**Files:**
- Modify: `src/pages/laboratorio/captura.jsx:51-52`
- Modify: `src/pages/laboratorio/nuevo-paciente.jsx:120,148`
- Modify: `src/pages/laboratorio/recepcion/cotizacion.jsx:20,23`
- Modify: `src/pages/laboratorio/recepcion/editar-solicitud.jsx:39,52`
- Modify: `src/pages/radiologia/pages/dashboard-radiologia.jsx:137`
- Modify: `src/pages/radiologia/pages/plantillas-radiologia.jsx:96`
- Modify: `src/pages/laboratorio/captura.test.jsx`
- Modify: `src/pages/radiologia/pages/dashboard-radiologia.test.jsx`

- [ ] **Step 1: Añadir dos pruebas de restauración de términos**

En `captura.test.jsx`, guardar `"biometría"` en `california:busqueda:captura:estudio`, renderizar y verificar que el input de estudio muestra ese valor. En `dashboard-radiologia.test.jsx`, guardar `"García"` en `california:busqueda:radiologia:termino`, renderizar y verificar que el filtro visible recibe ese valor.

- [ ] **Step 2: Ejecutar para confirmar el estado rojo**

Run: `npm test -- --runInBand src/pages/laboratorio/captura.test.jsx src/pages/radiologia/pages/dashboard-radiologia.test.jsx`

Expected: FAIL porque los campos nacen como cadena vacía.

- [ ] **Step 3: Cambiar los estados a `useBusquedaPersistente`**

```js
const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("captura:estudio");
const [buscarPaciente, setBuscarPaciente] = useBusquedaPersistente("captura:paciente");
const [busqueda, setBusqueda] = useBusquedaPersistente("radiologia:termino");
```

Usar las claves restantes: `nuevo-paciente:paciente`, `nuevo-paciente:estudio`, `cotizacion:folio`, `cotizacion:estudio`, `editar-solicitud:paciente`, `editar-solicitud:estudio`, `plantillas-radiologia:termino`. Mantener los `setBuscar... ("")` que ocurren al completar, cancelar o cambiar de paciente: el hook eliminará la clave y respetará esos reinicios intencionales.

- [ ] **Step 4: Ejecutar pruebas focalizadas**

Run: `npm test -- --runInBand src/pages/laboratorio/captura.test.jsx src/pages/laboratorio/nuevo-paciente-resumen.test.js src/pages/radiologia/pages/dashboard-radiologia.test.jsx src/pages/radiologia/pages/plantillas-radiologia.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/laboratorio/captura.jsx src/pages/laboratorio/nuevo-paciente.jsx src/pages/laboratorio/recepcion src/pages/radiologia/pages
git commit -m "feat: retain clinical and radiology searches by tab"
```

### Task 4: Verificación transversal y límites

**Files:**
- Verify: `src/components/nueva-cita-modal.jsx`
- Verify: `src/components/editar-cita-modal.jsx`
- Verify: `src/pages/laboratorio/componentes/modal-agregar-precio.jsx`
- Verify: `src/pages/laboratorio/componentes/modal-agregar-analito-estudio.jsx`
- Verify: `src/pages/radiologia/componentes/ModalAsignar.jsx`

- [ ] **Step 1: Confirmar que los buscadores de modales siguen con `useState` local**

Run: `rg -n 'useBusquedaPersistente' src/components src/pages/laboratorio/componentes src/pages/radiologia/componentes`

Expected: no coincidencias; los modales no deben restaurar texto al cerrarse y abrirse.

- [ ] **Step 2: Ejecutar toda la suite unitaria**

Run: `npm test -- --runInBand`

Expected: PASS, 0 failures.

- [ ] **Step 3: Compilar producción y revisar el diff**

Run: `npm run build && git diff --check && git status --short`

Expected: build exitosa, sin errores de espacios en el diff, y únicamente los archivos de esta característica más los cambios previos del usuario.

- [ ] **Step 4: Commit final si las tareas anteriores no se comprometieron por separado**

```bash
git add src/hooks src/pages docs/superpowers/specs/2026-08-02-persistencia-busquedas-por-pestana-design.md docs/superpowers/plans/2026-08-02-persistencia-busquedas-por-pestana.md
git commit -m "feat: preserve page searches during navigation"
```
