# Calendario de citas por media hora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear citas desde bloques disponibles de 30 minutos entre 7:00 AM y 8:00 PM, usando exclusivamente la sucursal de la sesión.

**Architecture:** `CalendarioCitas` será dueño de la selección de bloque y abrirá el modal de alta existente con fecha y hora iniciales. `NuevaCitaModal` conservará los accesos actuales sin horario inicial, pero resolverá `id_sucursal` desde `useAuth()` y lo usará al persistir. La agenda indexará cada cita por tipo y bloque de media hora.

**Tech Stack:** React 18, React Testing Library, Jest, React Query, Supabase, CSS.

---

## File structure

- Modify: `src/pages/laboratorio/calendario-citas.jsx` — genera intervalos de media hora, indexa citas por intervalo y abre el modal desde bloques disponibles.
- Modify: `src/pages/laboratorio/calendario-citas.css` — dimensiona y hace visibles los botones de bloques disponibles.
- Modify: `src/pages/laboratorio/calendario-citas.test.jsx` — cubre los límites del horario y la apertura con el intervalo seleccionado.
- Modify: `src/components/nueva-cita-modal.jsx` — elimina la selección de sucursal, acepta horario inicial y persiste la sucursal de sesión.
- Create: `src/components/nueva-cita-modal.test.jsx` — cubre sucursal de sesión, ausencia de selector y bloqueo sin sucursal.

### Task 1: Agenda con intervalos de media hora

**Files:**
- Modify: `src/pages/laboratorio/calendario-citas.test.jsx`
- Modify: `src/pages/laboratorio/calendario-citas.jsx`
- Modify: `src/pages/laboratorio/calendario-citas.css`

- [ ] **Step 1: Escribir la prueba que describe los límites y bloques de la agenda**

En `src/pages/laboratorio/calendario-citas.test.jsx`, agregar estas aserciones al test de agenda:

```jsx
expect(screen.getByRole("rowheader", { name: "7:00 AM" })).toBeInTheDocument();
expect(screen.getByRole("rowheader", { name: "7:30 AM" })).toBeInTheDocument();
expect(screen.getByRole("rowheader", { name: "7:30 PM" })).toBeInTheDocument();
expect(screen.queryByRole("rowheader", { name: "8:00 PM" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla por el formato y los bloques ausentes**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: FAIL porque la implementación muestra `7 AM` y no contiene un bloque de `7:30 AM`.

- [ ] **Step 3: Implementar los intervalos e indexar cada cita por hora y minuto**

En `src/pages/laboratorio/calendario-citas.jsx`, sustituir `HORAS_CALENDARIO` y `formatearHora` por:

```jsx
const BLOQUES_CALENDARIO = Array.from({ length: 25 }, (_, indice) => {
  const minutosTotales = 7 * 60 + indice * 30;
  return {
    hora: Math.floor(minutosTotales / 60),
    minuto: minutosTotales % 60,
    valor: `${String(Math.floor(minutosTotales / 60)).padStart(2, "0")}:${String(minutosTotales % 60).padStart(2, "0")}`,
  };
});

const formatearHora = ({ hora, minuto }) => {
  const periodo = hora >= 12 ? "PM" : "AM";
  return `${hora % 12 || 12}:${String(minuto).padStart(2, "0")} ${periodo}`;
};

const obtenerBloqueCita = (cita) => {
  const fecha = new Date(cita.fecha_estudio);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${String(fecha.getHours()).padStart(2, "0")}:${fecha.getMinutes() < 30 ? "00" : "30"}`;
};
```

Inicializar `grupos` con `BLOQUES_CALENDARIO` y usar `obtenerBloqueCita(cita)` como clave. Renderizar `BLOQUES_CALENDARIO.map((bloque) => ...)` y usar `bloque.valor` para leer las citas y `formatearHora(bloque)` para el encabezado de fila.

- [ ] **Step 4: Convertir los espacios libres en botones accesibles y ajustar su estilo**

Renderizar cada celda sin citas como:

```jsx
<button
  type="button"
  className="cal-empty-slot"
  aria-label={`Crear cita de ${tipo.label} el ${fechaSeleccionada} a las ${bloque.valor}`}
  onClick={() => abrirNuevaCita(bloque.valor)}
/>
```

En `src/pages/laboratorio/calendario-citas.css`, reemplazar la regla de `.cal-empty-slot` por:

```css
.cal-empty-slot {
	display: block;
	width: 100%;
	min-height: 38px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
}

.cal-empty-slot:hover,
.cal-empty-slot:focus-visible {
	background: rgba(83, 185, 219, 0.12);
	outline: 2px solid rgba(119, 214, 246, 0.78);
	outline-offset: -2px;
}
```

Cambiar el alto mínimo de `.cal-hour` y `.cal-slot` de `84px` a `52px` para que cada fila corresponda a media hora.

- [ ] **Step 5: Ejecutar la prueba para comprobar el comportamiento verde**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: PASS.

- [ ] **Step 6: Confirmar que el proyecto compila**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/laboratorio/calendario-citas.jsx src/pages/laboratorio/calendario-citas.css src/pages/laboratorio/calendario-citas.test.jsx
git commit -m "feat: split appointment calendar into half-hour slots"
```

### Task 2: Abrir la cita con el horario seleccionado

**Files:**
- Modify: `src/pages/laboratorio/calendario-citas.test.jsx`
- Modify: `src/pages/laboratorio/calendario-citas.jsx`

- [ ] **Step 1: Simular el modal y escribir la prueba de apertura**

Agregar antes de los tests de calendario:

```jsx
jest.mock("../../components/nueva-cita-modal", () => (props) =>
  props.isOpen ? <div data-testid="nueva-cita-modal">{`${props.fechaInicial} ${props.horaInicial}`}</div> : null,
);
```

Agregar el test:

```jsx
test("abre nueva cita con la fecha y hora del bloque disponible", () => {
  render(<CalendarioCitas />);

  fireEvent.click(screen.getByRole("button", {
    name: "Crear cita de Lab el 2026-07-15 a las 07:30",
  }));

  expect(screen.getByTestId("nueva-cita-modal")).toHaveTextContent("2026-07-15 07:30");
});
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla por no existir el botón o el modal**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: FAIL porque `CalendarioCitas` aún no importa ni controla `NuevaCitaModal`.

- [ ] **Step 3: Añadir el estado y la apertura del modal**

En `src/pages/laboratorio/calendario-citas.jsx`, importar `NuevaCitaModal`, añadir estado y función:

```jsx
const [horarioNuevaCita, setHorarioNuevaCita] = useState(null);

const abrirNuevaCita = (horaInicial) => {
	setHorarioNuevaCita({ fechaInicial: fechaSeleccionada, horaInicial });
};
```

Después de `</main>` y dentro de `PageLayout`, renderizar:

```jsx
<NuevaCitaModal
	isOpen={Boolean(horarioNuevaCita)}
	fechaInicial={horarioNuevaCita?.fechaInicial}
	horaInicial={horarioNuevaCita?.horaInicial}
	onClose={() => setHorarioNuevaCita(null)}
	onCitaCreada={() => setHorarioNuevaCita(null)}
/>
```

- [ ] **Step 4: Ejecutar la prueba para comprobar el comportamiento verde**

Run: `npm test -- --runInBand src/pages/laboratorio/calendario-citas.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/laboratorio/calendario-citas.jsx src/pages/laboratorio/calendario-citas.test.jsx
git commit -m "feat: create appointments from calendar slots"
```

### Task 3: Sucursal de sesión en el formulario de citas

**Files:**
- Create: `src/components/nueva-cita-modal.test.jsx`
- Modify: `src/components/nueva-cita-modal.jsx`

- [ ] **Step 1: Escribir las pruebas de contrato del formulario**

Crear `src/components/nueva-cita-modal.test.jsx`, mockear `useAuth`, `supabase` y `useQueryClient`, y cubrir el contrato observable:

```jsx
test("no muestra selector de sucursal y precarga el horario recibido", async () => {
  render(<NuevaCitaModal isOpen fechaInicial="2026-07-15" horaInicial="07:30" />);

  expect(screen.queryByText(/^Sucursal$/i)).not.toBeInTheDocument();
  expect(document.querySelector('input[name="fecha"]')).toHaveValue("2026-07-15");
  expect(document.querySelector('input[name="hora"]')).toHaveValue("07:30");
});

test("bloquea la creación si la sesión no tiene sucursal", async () => {
  useAuth.mockReturnValue({ empleadoData: { id_sucursal: null } });
  render(<NuevaCitaModal isOpen />);

  fireEvent.click(screen.getByRole("button", { name: /crear cita/i }));

  expect(await screen.findByText(/usuario no tiene una sucursal asignada/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Ejecutar las pruebas para comprobar que fallan**

Run: `npm test -- --runInBand src/components/nueva-cita-modal.test.jsx`

Expected: FAIL porque el modal todavía muestra el selector y no conoce `empleadoData` ni las props de horario.

- [ ] **Step 3: Obtener sucursal desde la sesión y eliminar el selector**

En `src/components/nueva-cita-modal.jsx`, importar `useAuth` y reemplazar la firma por:

```jsx
import { useAuth } from "../context/auth-context";

const NuevaCitaModal = ({ isOpen, onClose, onCitaCreada, fechaInicial, horaInicial }) => {
  const { empleadoData } = useAuth();
```

Eliminar los estados `sucursales` y `sucursalSeleccionada`, la llamada `cargarSucursales`, la función `cargarSucursales`, la validación del selector y el bloque JSX etiquetado como `Sucursal`.

En el efecto de apertura, inicializar:

```jsx
const ahora = new Date();
setFormData((prev) => ({
  ...prev,
  fecha: fechaInicial || ahora.toISOString().split("T")[0],
  hora: horaInicial || ahora.toTimeString().slice(0, 5),
}));
```

Incluir `fechaInicial` y `horaInicial` en las dependencias del efecto.

- [ ] **Step 4: Bloquear una sesión sin sucursal y persistir la sucursal correcta**

Al inicio de `validarFormulario`, agregar:

```jsx
if (!empleadoData?.id_sucursal) {
  setError("El usuario no tiene una sucursal asignada. Solicite la asignación a un administrador.");
  return false;
}
```

En el payload de inserción usar:

```jsx
id_sucursal: Number(empleadoData.id_sucursal),
```

Eliminar el reinicio de `setSucursalSeleccionada("")` después de una creación exitosa.

- [ ] **Step 5: Ejecutar las pruebas del modal para comprobar el comportamiento verde**

Run: `npm test -- --runInBand src/components/nueva-cita-modal.test.jsx`

Expected: PASS.

- [ ] **Step 6: Ejecutar la regresión de la agenda y compilación**

Run: `npm test -- --runInBand src/components/nueva-cita-modal.test.jsx src/pages/laboratorio/calendario-citas.test.jsx && npm run build`

Expected: ambos tests pasan y Vite termina con exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/nueva-cita-modal.jsx src/components/nueva-cita-modal.test.jsx
git commit -m "feat: assign appointment branch from session"
```
