# Reemplazar alertas por ModalNotificacion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar las alertas nativas del código de producción y mostrar la misma información con `ModalNotificacion`.

**Architecture:** Cada componente afectado conserva el texto y control de flujo actuales, pero mantiene un estado local para la notificación y renderiza el modal existente. Los tipos son `advertencia` para validaciones, `error` para fallos y `exito` para confirmaciones.

**Tech Stack:** React 18, Jest, React Testing Library, `ModalNotificacion`.

---

### Task 1: Cubrir nuevo paciente y sus modales con pruebas

**Files:**
- Create: `src/pages/laboratorio/nuevo-paciente.test.jsx`
- Create: `src/pages/laboratorio/componentes/modal-agregar-paciente.test.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-agregar-doctor.test.jsx`

- [ ] **Step 1: Escribir pruebas que esperen el mensaje de una validación en el modal de notificación.**

```jsx
jest.mock('../../../components/ModalNotificacion', () => ({ isOpen, mensaje }) =>
  isOpen ? <div role="alert">{mensaje}</div> : null,
);

test('muestra una notificación al validar el teléfono del paciente', async () => {
  // Renderizar ModalAgregarPaciente con teléfono inválido y enviar el formulario.
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'El teléfono debe contener exactamente 10 dígitos numéricos',
  );
});
```

- [ ] **Step 2: Ejecutar las pruebas para verificar que fallan por la ausencia de una notificación.**

Run: `npm test -- --runInBand src/pages/laboratorio/nuevo-paciente.test.jsx src/pages/laboratorio/componentes/modal-agregar-paciente.test.jsx src/pages/laboratorio/componentes/modal-agregar-doctor.test.jsx`

Expected: FAIL porque el formulario invoca `window.alert` y no entrega un elemento con `role="alert"`.

- [ ] **Step 3: Implementar el estado y renderizado local de la notificación en los tres componentes.**

```jsx
import ModalNotificacion from '../../../components/ModalNotificacion';

const [notificacion, setNotificacion] = useState({
  isOpen: false,
  mensaje: '',
  tipo: 'exito',
});

const mostrarNotificacion = (mensaje, tipo = 'exito') =>
  setNotificacion({ isOpen: true, mensaje, tipo });

// Reemplazar una validación:
mostrarNotificacion('Por favor ingresa un correo válido', 'advertencia');

<ModalNotificacion
  isOpen={notificacion.isOpen}
  onClose={() => setNotificacion((actual) => ({ ...actual, isOpen: false }))}
  mensaje={notificacion.mensaje}
  tipo={notificacion.tipo}
/>
```

Reemplazar todas las llamadas de `alert()` de esos tres archivos, asignando `advertencia` a validaciones, `error` a `catch` y `exito` a altas, actualizaciones y la venta registrada.

- [ ] **Step 4: Ejecutar las pruebas focalizadas y confirmar que pasan.**

Run: `npm test -- --runInBand src/pages/laboratorio/nuevo-paciente.test.jsx src/pages/laboratorio/componentes/modal-agregar-paciente.test.jsx src/pages/laboratorio/componentes/modal-agregar-doctor.test.jsx`

Expected: PASS.

### Task 2: Sustituir alertas de los modales auxiliares de laboratorio

**Files:**
- Modify: `src/pages/laboratorio/componentes/modal-agregar-precio.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-analito.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-referencias.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-agregar.jsx`
- Modify: `src/pages/laboratorio/componentes/modal-agregar-analito-estudio.jsx`

- [ ] **Step 1: Crear una prueba fallida de validación para el modal de precio.**

```jsx
jest.mock('../../../components/ModalNotificacion', () => ({ isOpen, mensaje }) =>
  isOpen ? <div role="alert">{mensaje}</div> : null,
);

test('modal de precio notifica cuando falta el estudio', async () => {
  // Renderizar y enviar el formulario sin estudio.
  expect(await screen.findByRole('alert')).toHaveTextContent('Por favor selecciona un estudio');
});
```

- [ ] **Step 2: Ejecutar la prueba y verificar el fallo esperado.**

Run: `npm test -- --runInBand src/pages/laboratorio/componentes/modal-agregar-precio.test.jsx`

Expected: FAIL antes del cambio, porque aún usa `alert()`.

- [ ] **Step 3: Aplicar el mismo estado de notificación local a cada modal y reemplazar sus alertas.**

```jsx
const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: '', tipo: 'exito' });
const mostrarNotificacion = (mensaje, tipo = 'exito') =>
  setNotificacion({ isOpen: true, mensaje, tipo });

// Validaciones:
mostrarNotificacion('Por favor selecciona un estudio', 'advertencia');
// Capturas de error:
mostrarNotificacion('Error al guardar el precio', 'error');
```

Importar y renderizar `ModalNotificacion` en cada archivo. Conservar los callbacks que cierran sus modales de dominio; el modal de notificación se limita a cerrar su propio estado.

- [ ] **Step 4: Ejecutar las pruebas del modal y verificar que pasan.**

Run: `npm test -- --runInBand src/pages/laboratorio/componentes/modal-agregar-precio.test.jsx`

Expected: PASS.

### Task 3: Sustituir alertas en pantallas y configuraciones de laboratorio

**Files:**
- Modify: `src/pages/laboratorio/clientes.jsx`
- Modify: `src/pages/laboratorio/configuracion/precios.jsx`
- Modify: `src/pages/laboratorio/configuracion/tipo_muestra.jsx`
- Modify: `src/pages/laboratorio/configuracion/paquetes.jsx`
- Modify: `src/pages/laboratorio/configuracion/estudios-laboratorio.jsx`
- Modify: `src/hooks/use-catalogo-simple.js`
- Modify: `src/pages/laboratorio/componentes/pagina-catalogo-simple.jsx`

- [ ] **Step 1: Escribir pruebas fallidas para la validación de paquete y el guardado de cliente.**

```jsx
test('paquetes muestra una notificación si falta la búsqueda', async () => {
  // Enviar búsqueda vacía.
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Por favor, ingresa una clave o descripción de estudio',
  );
});
```

- [ ] **Step 2: Ejecutar la prueba y verificar que falla por el alert nativo.**

Run: `npm test -- --runInBand src/pages/laboratorio/configuracion/paquetes.test.jsx`

Expected: FAIL antes de la implementación.

- [ ] **Step 3: Añadir el patrón local de `ModalNotificacion` y reemplazar todas las alertas.**

```jsx
const cerrarNotificacion = () =>
  setNotificacion({ isOpen: false, mensaje: '', tipo: 'exito' });

mostrarNotificacion('Paquete guardado correctamente', 'exito');
mostrarNotificacion('Error al guardar paquete', 'error');
```

Para `use-catalogo-simple`, recibir `mostrarNotificacion` como opción del hook y usarlo en lugar de `alert`; actualizar `pagina-catalogo-simple.jsx`, su consumidor actual, para entregarle su función local y renderizar `ModalNotificacion`. No usar `window.alert` como reserva.

- [ ] **Step 4: Ejecutar las pruebas relevantes y verificar que pasan.**

Run: `npm test -- --runInBand src/pages/laboratorio/configuracion/paquetes.test.jsx src/pages/laboratorio/configuracion/estudios-laboratorio.test.jsx src/pages/laboratorio/clientes.test.jsx`

Expected: PASS.

### Task 4: Sustituir las alertas restantes y comprobar la eliminación global

**Files:**
- Modify: `src/pages/radiologia/pages/visor-dicom.jsx`

- [ ] **Step 1: Escribir una prueba fallida para la confirmación de URL copiada.**

```jsx
test('notifica al copiar la URL del visor', async () => {
  // Simular portapapeles y activar la acción de compartir.
  expect(await screen.findByRole('alert')).toHaveTextContent('URL copiada');
});
```

- [ ] **Step 2: Ejecutar la prueba y confirmar que falla antes del cambio.**

Run: `npm test -- --runInBand src/pages/radiologia/pages/visor-dicom.test.jsx`

Expected: FAIL antes de la sustitución.

- [ ] **Step 3: Sustituir la alerta por ModalNotificacion con tipo exito.**

```jsx
mostrarNotificacion('URL copiada', 'exito');
```

Si el visor ya tiene un mecanismo de notificación local equivalente, conectarlo a `ModalNotificacion` sin cambiar el comportamiento del portapapeles.

- [ ] **Step 4: Verificar que no haya alertas nativas de producción ni regresiones de compilación.**

Run: `rg -n "alert\\s*\\(" src --glob '!**/*.test.*' && npm test -- --runInBand src/pages/laboratorio/nuevo-paciente.test.jsx && npm run build`

Expected: la búsqueda no produce resultados; las pruebas y la compilación terminan correctamente.
