# CIA-192 — Módulo Visitadora: informes, programación y comisiones por médico

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan checkbox (`- [ ]`) para seguimiento.

**Objetivo:** darle a la visitadora una ventana propia en la aplicación donde capture su reporte semanal de visitas médicas y su programación semanal (hoy los hace en Excel a mano), y sobre esos mismos médicos generar un concentrado mensual que calcule solo cuánto ingreso generó cada médico y cuánta comisión le toca según su porcentaje (10 %, 15 %, 20 %, el que sea).

**Arquitectura:** tres pantallas nuevas bajo `/visitadora`, tres tablas nuevas en Supabase (`visitas_medicas`, `programacion_visitas`, `comisiones_doctor`) más una tabla de cierre (`comisiones_mensuales`). El concentrado **no guarda** los importes: los calcula en vivo desde `ventas` (igual que hace `reporte-ventas`), y sólo congela el mes cuando el administrador lo cierra. Cálculo puro en `src/utils/comisiones-medicos.js` para que sea testeable sin base de datos.

**Stack:** React 18, Supabase JS, @tanstack/react-query, xlsx 0.18 (ya es dependencia), jsPDF, Jest 29.

---

## Contexto: de dónde salen los datos

La visitadora entrega hoy dos archivos:

**`Reporte_visitas_Medicas_AGOSTO_2026.xlsx`** — una hoja por semana (`03-07 AGO`, `10-14 AGO`), fila 1 título, fila 2 semana y zona, fila 3 encabezados, y de la fila 4 en adelante una visita por renglón con estas columnas:

| Columna Excel | Campo |
| --- | --- |
| 📅 Fecha | `fecha` |
| 👨‍⚕️ Médico / Empresa | `medico_nombre` (+ `id_doctor` si empata con el catálogo) |
| 🩺 Especialidad / Giro | `especialidad` |
| 📍 Ubicación | `ubicacion` |
| 📝 Actividades | `actividades` |
| 💬 Comentarios del Médico | `comentarios_medico` |
| 🔍 Observaciones | `observaciones` |
| ✍🏻 Seguimiento | `seguimiento` |
| Tipo de convenio | `tipo_convenio` |

**`Programacion_semanal_del_17_al_21_AGO.xlsx`** — una hoja por semana, fila 1 título con el rango, fila 2 encabezados, y un renglón por día: `Día`, `Zona`, `Médicos programados` (varios nombres en una sola celda), `Objetivos`.

El origen del dinero ya existe: `ventas.id_doctor` referencia a `doctores.id_doctor`, y `ventas.total` es lo facturado. `agruparRemitentesAdmin` en `src/utils/reporte-administrativo.js` ya agrupa ingreso por médico remitente — el concentrado es esa misma idea, pero por mes y multiplicada por el porcentaje del médico.

### Decisiones tomadas (y por qué)

1. **La base de la comisión es `ventas.total`.** El usuario lo describió como «nos mandó 50,000 pesos de pacientes, le tocan 5,000»: 50,000 es lo que la clínica cobró. `total` incluye IVA. Si después se decide comisionar sobre `subtotal`, es una constante en `src/utils/comisiones-medicos.js`, no un cambio de esquema.
2. **Sólo cuentan las ventas con `estado = 'activo'`.** Una venta cancelada no genera comisión. Es el mismo filtro que usa el reporte de ventas.
3. **El porcentaje tiene vigencia, no es un campo suelto en `doctores`.** En el reporte de agosto ya aparece «conforme incremente su flujo de pacientes se podrá aumentar su porcentaje». Si el porcentaje fuera un solo número mutable, subirle a un médico de 10 % a 15 % en octubre recalcularía agosto y septiembre hacia atrás y descuadraría lo ya pagado. Por eso `comisiones_doctor` guarda `(id_doctor, porcentaje, vigente_desde)` y el cálculo de un mes usa **el porcentaje vigente al último día de ese mes**.
4. **El concentrado se calcula en vivo mientras el mes está abierto.** Congelarlo cada noche obligaría a un job y a resolver qué pasa con las ventas que se capturan tarde. Cuando el administrador cierra el mes, ahí sí se escribe el snapshot en `comisiones_mensuales` y a partir de entonces la pantalla muestra lo congelado.
5. **La visitadora ve el concentrado pero no lo edita.** Necesita saber qué contestarle al médico que le pregunta por sus comisiones (pasa en tres visitas del reporte de agosto), pero cambiar porcentajes y marcar pagos es del administrador.
6. **`tipo_convenio` es texto libre con sugerencias, no un enum.** En el Excel real conviven `MIXTO`, `PUNTOS`, `N/A`, `PENDIENTE`, `Descuento para Pacientes`, `30% de Descuento para los pacientes` y hasta un párrafo entero. Un `check` constraint rechazaría datos reales; el `datalist` guía sin bloquear.
7. **Los médicos programados se guardan como `jsonb` array `[{nombre, id_doctor}]`,** no como el texto corrido de la celda. Permite ligar cada nombre al catálogo cuando exista y seguir exportando la celda tal cual concatenando; el texto corrido no permitiría lo contrario.

---

## Estructura de archivos

**Migración**
- Crear: `supabase/migrations/20260828120000_visitadora_comisiones.sql` — tablas, índices, RLS y rol `visitadora`.

**Lógica pura (con test)**
- Crear: `src/utils/comisiones-medicos.js` — porcentaje vigente, concentrado mensual, totales.
- Crear: `src/utils/comisiones-medicos.test.js`
- Crear: `src/utils/importar-informe-visitas.js` — lee los dos formatos de Excel de la visitadora.
- Crear: `src/utils/importar-informe-visitas.test.js`
- Crear: `src/utils/exportar-informe-visitas.js` — regresa el xlsx con el mismo formato que ella entrega.
- Crear: `src/utils/exportar-informe-visitas.test.js`

**Datos**
- Crear: `src/hooks/use-visitas-medicas.js`
- Crear: `src/hooks/use-programacion-visitas.js`
- Crear: `src/hooks/use-comisiones-medicos.js`

**Pantallas**
- Crear: `src/pages/visitadora/informe-visitas.jsx` + `.css` + `.test.jsx`
- Crear: `src/pages/visitadora/programacion-semanal.jsx` + `.css` + `.test.jsx`
- Crear: `src/pages/visitadora/concentrado-comisiones.jsx` + `.css` + `.test.jsx`
- Crear: `src/pages/visitadora/componentes/modal-visita.jsx`
- Crear: `src/pages/visitadora/componentes/modal-porcentaje-doctor.jsx`

**Integración**
- Modificar: `src/App.jsx` — tres rutas nuevas.
- Modificar: `src/components/sidebar-menu.js` — sección «Visitadora».
- Modificar: `src/utils/role-permissions.js` — rol `visitadora` y sus rutas.
- Modificar: `src/utils/role-permissions.test.js` — cobertura del rol nuevo.

---

## Boceto de las tres pantallas

### 1. Informe de visitas — `/visitadora/informe`

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Informe de visitas médicas          [◀ Semana del 17 al 21 de agosto ▶]        │
│                          [+ Nueva visita] [Importar Excel] [Exportar] [PDF]    │
├───────────────────────────────────────────────────────────────────────────────┤
│ Visitas: 21   Médicos nuevos: 8   Con convenio: 14   Pendientes: 4   Zona: […] │
├──────┬─────────────────┬──────────────┬───────────┬────────────┬──────┬───────┤
│Fecha │ Médico/Empresa  │ Especialidad │ Ubicación │ Actividades│ Conv.│ Acción│
├──────┼─────────────────┼──────────────┼───────────┼────────────┼──────┼───────┤
│17ago │ Dr. Saul Ruiz ✓ │ Ginecólogo   │ N.M. Joya │ Seguimien… │MIXTO │ ✎  🗑 │
│17ago │ Dra. A. López   │ Ginecólogo   │ Versalles │ Presenta…  │MIXTO │ ✎  🗑 │
│…                                                                              │
└───────────────────────────────────────────────────────────────────────────────┘
      ✓ = ligado al catálogo de doctores (cuenta para comisiones)
```

Al hacer clic en un renglón se abre el detalle con los cuatro campos largos (actividades, comentarios del médico, observaciones, seguimiento), que en la tabla van truncados.

### 2. Programación semanal — `/visitadora/programacion`

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Programación semanal    [◀ Del 17 al 21 de agosto ▶]   [Copiar semana anterior]│
│                                          [Importar Excel] [Exportar] [Imprimir]│
├─────────┬──────────────────┬────────────────────────────┬─────────────────────┤
│ Día     │ Zona             │ Médicos programados        │ Objetivos           │
├─────────┼──────────────────┼────────────────────────────┼─────────────────────┤
│ Lunes   │ Torre Coralia    │ ⊕Camila Ross ⊕Mona Khalaf  │ Seguimiento a…      │
│         │                  │ ⊕Sergio Manolo  [+ añadir] │                     │
├─────────┼──────────────────┼────────────────────────────┼─────────────────────┤
│ Martes  │ Neomédica        │ ⊕Felipe Magaña …           │ Fortalecer…         │
└─────────┴──────────────────┴────────────────────────────┴─────────────────────┘
       ⊕ chip; en verde si empató con el catálogo, en gris si es nombre suelto
```

Cada renglón se edita en línea. «Copiar semana anterior» arrastra zonas y objetivos porque la ruta se repite; los médicos se ajustan a mano.

### 3. Concentrado de médicos y comisiones — `/visitadora/comisiones`

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Concentrado de médicos       [◀ Agosto 2026 ▶]      Estado: ABIERTO           │
│                        [Exportar Excel] [PDF]        [Cerrar mes] (admin)      │
├───────────────────────────────────────────────────────────────────────────────┤
│  Ingreso del mes            Comisión a pagar          Médicos que enviaron     │
│    $ 412,500.00               $ 58,375.00                     23               │
├──────────────────────┬──────────┬───────┬──────────────┬────────────┬─────────┤
│ Médico               │ Órdenes  │  %    │ Ingreso      │ Comisión   │ Estado  │
├──────────────────────┼──────────┼───────┼──────────────┼────────────┼─────────┤
│ Dr. Juan Díaz        │    18    │ 10 %  │ $  50,000.00 │ $ 5,000.00 │ Pagado  │
│ Dra. María López     │    31    │ 20 %  │ $ 100,000.00 │ $20,000.00 │ Pendient│
│ Dr. Saúl Ruiz        │    12    │ 15 %  │ $  47,500.00 │ $ 7,125.00 │ Pendient│
│ Dr. Jorge Mendoza    │     4    │  — ✎  │ $  12,300.00 │      —     │ Sin %   │
├──────────────────────┴──────────┴───────┴──────────────┴────────────┴─────────┤
│ TOTAL                     65             $ 412,500.00   $ 58,375.00            │
└───────────────────────────────────────────────────────────────────────────────┘
```

El `✎` junto al porcentaje abre el modal que fija el porcentaje del médico con su fecha de vigencia. Los médicos con ingreso pero sin porcentaje asignado salen arriba marcados «Sin %» — es justo el hueco que hoy provoca los reclamos de comisión que aparecen en el reporte de agosto. Al hacer clic en un renglón se despliegan los folios que componen el ingreso, para poder aclarar con el médico de dónde salió la cifra.

---

## Tareas

### Tarea 1: Esquema de base de datos

**Archivos:** Crear `supabase/migrations/20260828120000_visitadora_comisiones.sql`

- [ ] **Paso 1: escribir la migración**

```sql
-- La visitadora (representante médico) entregaba su informe semanal y su
-- programación en Excel, y las comisiones de los médicos se calculaban a mano:
-- por eso en el reporte de agosto hay tres médicos reclamando comisiones que
-- nadie sabía si estaban pagadas. Estas tablas mueven los dos Excel a la
-- aplicación y dejan que la comisión salga de las ventas ya capturadas.

create table if not exists public.visitas_medicas (
	id_visita uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	fecha date not null,
	id_doctor integer references public.doctores(id_doctor),
	medico_nombre text not null,
	especialidad text,
	ubicacion text,
	zona text,
	actividades text,
	comentarios_medico text,
	observaciones text,
	seguimiento text,
	-- Texto libre a propósito: en el Excel real conviven "MIXTO", "PUNTOS",
	-- "N/A" y párrafos completos describiendo el convenio.
	tipo_convenio text,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

create index if not exists idx_visitas_medicas_fecha on public.visitas_medicas (fecha desc);
create index if not exists idx_visitas_medicas_doctor on public.visitas_medicas (id_doctor);

create table if not exists public.programacion_visitas (
	id_programacion uuid primary key default gen_random_uuid(),
	id_empleado integer references public.empleados(id_empleado),
	semana_inicio date not null,
	dia_semana smallint not null check (dia_semana between 1 and 7),
	zona text,
	-- [{ "nombre": "Camila Ross", "id_doctor": 42 }] — se guarda el nombre tal
	-- cual lo escribe ella y, cuando empata con el catálogo, también el id.
	medicos_programados jsonb not null default '[]'::jsonb,
	objetivos text,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now(),
	unique (id_empleado, semana_inicio, dia_semana)
);

-- El porcentaje lleva fecha de vigencia porque a los médicos se les sube
-- conforme aumenta su flujo de pacientes. Sin vigencia, subirle a uno de 10% a
-- 15% recalcularía los meses ya pagados.
create table if not exists public.comisiones_doctor (
	id_comision uuid primary key default gen_random_uuid(),
	id_doctor integer not null references public.doctores(id_doctor) on delete cascade,
	porcentaje numeric(5,2) not null check (porcentaje >= 0 and porcentaje <= 100),
	vigente_desde date not null,
	notas text,
	created_at timestamp with time zone default now(),
	unique (id_doctor, vigente_desde)
);

create index if not exists idx_comisiones_doctor_vigencia
	on public.comisiones_doctor (id_doctor, vigente_desde desc);

-- Mientras el mes está abierto el concentrado se calcula en vivo desde ventas.
-- Al cerrarlo se congela aquí para que un cambio posterior de porcentaje o una
-- venta capturada tarde no muevan lo que ya se pagó.
create table if not exists public.comisiones_mensuales (
	id_mensual uuid primary key default gen_random_uuid(),
	id_doctor integer not null references public.doctores(id_doctor),
	periodo date not null,
	ordenes integer not null default 0,
	ingreso_generado numeric(12,2) not null default 0,
	porcentaje numeric(5,2) not null default 0,
	comision numeric(12,2) not null default 0,
	estado text not null default 'cerrado' check (estado in ('cerrado', 'pagado')),
	cerrado_por integer references public.empleados(id_empleado),
	cerrado_en timestamp with time zone default now(),
	pagado_en timestamp with time zone,
	referencia_pago text,
	unique (id_doctor, periodo)
);

alter table public.visitas_medicas enable row level security;
alter table public.programacion_visitas enable row level security;
alter table public.comisiones_doctor enable row level security;
alter table public.comisiones_mensuales enable row level security;

create or replace function public.es_usuario_visitadora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.empleados e
		where e.auth_uuid = auth.uid()
		and translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu')
			in ('visitadora', 'visitador', 'administrador', 'admin', 'desarrollador')
	);
$$;

create or replace function public.es_usuario_admin_comisiones()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.empleados e
		where e.auth_uuid = auth.uid()
		and translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu')
			in ('administrador', 'admin', 'desarrollador')
	);
$$;
```

Más las políticas: `select/insert/update/delete` sobre `visitas_medicas` y `programacion_visitas` para `es_usuario_visitadora()`; `select` sobre `comisiones_doctor` y `comisiones_mensuales` para `es_usuario_visitadora()` pero `insert/update/delete` sólo para `es_usuario_admin_comisiones()`. Cerrar con `NOTIFY pgrst, 'reload schema';`.

- [ ] **Paso 2: verificar contra staging**

Ejecutar: `npm run verify:staging`

Esperado: el script reconoce las cuatro tablas nuevas sin diferencias pendientes.

---

### Tarea 2: Cálculo de comisiones (lógica pura)

**Archivos:** Crear `src/utils/comisiones-medicos.js` y su test.

- [ ] **Paso 1: escribir los tests que fallan**

```js
import {
	porcentajeVigente,
	construirConcentradoMensual,
	totalesConcentrado,
} from './comisiones-medicos';

describe('porcentajeVigente', () => {
	test('toma el porcentaje vigente al cierre del mes', () => {
		const historial = [
			{ porcentaje: 10, vigente_desde: '2026-01-01' },
			{ porcentaje: 15, vigente_desde: '2026-08-15' },
			{ porcentaje: 20, vigente_desde: '2026-10-01' },
		];
		expect(porcentajeVigente(historial, '2026-08')).toBe(15);
		expect(porcentajeVigente(historial, '2026-07')).toBe(10);
		expect(porcentajeVigente(historial, '2026-12')).toBe(20);
	});

	test('regresa null si el médico no tenía porcentaje ese mes', () => {
		expect(porcentajeVigente([{ porcentaje: 10, vigente_desde: '2026-09-01' }], '2026-08')).toBeNull();
		expect(porcentajeVigente([], '2026-08')).toBeNull();
	});
});

describe('construirConcentradoMensual', () => {
	const doctores = [
		{ id_doctor: 1, nombre: 'Juan Díaz' },
		{ id_doctor: 2, nombre: 'María López' },
	];
	const comisiones = [
		{ id_doctor: 1, porcentaje: 10, vigente_desde: '2026-01-01' },
		{ id_doctor: 2, porcentaje: 20, vigente_desde: '2026-01-01' },
	];

	test('calcula ingreso y comisión por médico', () => {
		const ventas = [
			{ id_doctor: 1, total: 30000, estado: 'activo' },
			{ id_doctor: 1, total: 20000, estado: 'activo' },
			{ id_doctor: 2, total: 100000, estado: 'activo' },
		];
		expect(construirConcentradoMensual({ ventas, doctores, comisiones, periodo: '2026-08' }))
			.toEqual([
				{ idDoctor: 2, nombre: 'María López', ordenes: 1, ingreso: 100000, porcentaje: 20, comision: 20000, sinPorcentaje: false },
				{ idDoctor: 1, nombre: 'Juan Díaz', ordenes: 2, ingreso: 50000, porcentaje: 10, comision: 5000, sinPorcentaje: false },
			]);
	});

	test('ignora las ventas canceladas', () => {
		const ventas = [
			{ id_doctor: 1, total: 50000, estado: 'activo' },
			{ id_doctor: 1, total: 90000, estado: 'cancelado' },
		];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: '2026-08' });
		expect(fila).toMatchObject({ ordenes: 1, ingreso: 50000, comision: 5000 });
	});

	test('marca al médico que generó ingreso sin porcentaje asignado', () => {
		const ventas = [{ id_doctor: 9, total: 12300, estado: 'activo' }];
		const [fila] = construirConcentradoMensual({
			ventas,
			doctores: [...doctores, { id_doctor: 9, nombre: 'Jorge Mendoza' }],
			comisiones,
			periodo: '2026-08',
		});
		expect(fila).toMatchObject({ idDoctor: 9, ingreso: 12300, porcentaje: null, comision: 0, sinPorcentaje: true });
	});

	test('redondea la comisión a dos decimales', () => {
		const ventas = [{ id_doctor: 1, total: 1234.56, estado: 'activo' }];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: '2026-08' });
		expect(fila.comision).toBe(123.46);
	});

	test('omite las ventas sin médico remitente', () => {
		const ventas = [{ id_doctor: null, total: 5000, estado: 'activo' }];
		expect(construirConcentradoMensual({ ventas, doctores, comisiones, periodo: '2026-08' })).toEqual([]);
	});
});
```

- [ ] **Paso 2: correr los tests y verlos fallar**

Ejecutar: `npm test -- comisiones-medicos.test.js --runInBand`

Esperado: FAIL, el módulo no existe.

- [ ] **Paso 3: implementar**

Las filas se ordenan por ingreso descendente, salvo que los `sinPorcentaje` con ingreso se listan primero en la pantalla (eso lo hace la vista, no el util, para que el util quede con un solo criterio de orden). `comision = redondear(ingreso * porcentaje / 100)`.

- [ ] **Paso 4: correr los tests y verlos pasar**

Ejecutar: `npm test -- comisiones-medicos.test.js --runInBand`

---

### Tarea 3: Importar y exportar los Excel de la visitadora

**Archivos:** Crear `src/utils/importar-informe-visitas.js`, `src/utils/exportar-informe-visitas.js` y sus tests.

- [ ] **Paso 1: tests de importación con la forma real del archivo**

Cubrir: encabezados con emoji y espacios de más; hojas con nombre `03-07 AGO`; fechas que llegan como `Date` de Excel y como texto; la fila 15 del archivo real donde una fecha quedó capturada como `1900-01-06` (Excel interpretó «6» como serial) — debe reportarse como fila con fecha sospechosa en lugar de importarse en silencio; filas vacías al final; celda de médicos programados con nombres separados por bloques de espacios.

- [ ] **Paso 2: verlos fallar** — `npm test -- informe-visitas --runInBand`

- [ ] **Paso 3: implementar `leerInformeVisitas(workbook)` y `leerProgramacionSemanal(workbook)`**

Ambas regresan `{ filas, advertencias }`. `advertencias` alimenta un panel de revisión previa antes de guardar: la importación nunca escribe directo, se muestra lo que se va a insertar y el usuario confirma.

- [ ] **Paso 4: tests del exportador** — que el xlsx generado conserve los mismos encabezados y el mismo orden de columnas que ella usa hoy, para que el archivo que salga del sistema sea intercambiable con el suyo.

- [ ] **Paso 5: implementar los exportadores** reusando el patrón de `src/utils/exportar-tabla.js`.

---

### Tarea 4: Hooks de datos

**Archivos:** Crear los tres hooks en `src/hooks/`.

- [ ] **Paso 1: `use-visitas-medicas.js`** — `useQuery` por rango de semana, más mutaciones de alta/edición/baja que invalidan `['visitas-medicas']`. Seguir el manejo de errores de `use-reporte-ventas.js` (degradar cuando falta una columna en vez de tirar la pantalla).
- [ ] **Paso 2: `use-programacion-visitas.js`** — query por `semana_inicio` y `upsert` por `(id_empleado, semana_inicio, dia_semana)`.
- [ ] **Paso 3: `use-comisiones-medicos.js`** — carga en paralelo las ventas del mes (`fecha_venta` acotada con `crearRangoFechaMexico`), el catálogo de doctores y el historial de `comisiones_doctor`; si el mes está cerrado, lee `comisiones_mensuales` en lugar de calcular.

---

### Tarea 5: Pantalla de informe de visitas

**Archivos:** Crear `src/pages/visitadora/informe-visitas.jsx`, `.css`, `.test.jsx`, y `componentes/modal-visita.jsx`.

- [ ] **Paso 1: test de render** — la tabla muestra las visitas de la semana, el navegador de semanas cambia el rango consultado, y el botón de exportar llama al exportador con las filas visibles.
- [ ] **Paso 2: implementar** sobre `PageLayout` + `AdminCatalogPage`, igual que `doctores.jsx`. Los cuatro campos largos se truncan en la tabla y se ven completos en el modal.
- [ ] **Paso 3: modal de visita** con autocompletar de médico contra `doctores` (reusar `search-autocomplete.jsx`): al empatar guarda `id_doctor`, y ese es el enlace que hace que la visita cuente para el concentrado. Si no empata, guarda sólo el nombre y la fila se marca como no ligada.
- [ ] **Paso 4: importación** — el botón abre el archivo, corre `leerInformeVisitas`, muestra la revisión previa con las advertencias y hasta entonces inserta.

---

### Tarea 6: Pantalla de programación semanal

**Archivos:** Crear `src/pages/visitadora/programacion-semanal.jsx`, `.css`, `.test.jsx`.

- [ ] **Paso 1: test de render** — cinco renglones de lunes a viernes aunque la semana esté vacía; editar un renglón dispara el upsert; «Copiar semana anterior» trae zonas y objetivos.
- [ ] **Paso 2: implementar** con edición en línea y chips de médicos (verde si `id_doctor`, gris si nombre suelto).
- [ ] **Paso 3: importar y exportar** con el mismo flujo de revisión previa de la tarea anterior.

---

### Tarea 7: Concentrado de médicos y comisiones

**Archivos:** Crear `src/pages/visitadora/concentrado-comisiones.jsx`, `.css`, `.test.jsx`, y `componentes/modal-porcentaje-doctor.jsx`.

- [ ] **Paso 1: test de render** — las tres tarjetas de resumen suman lo mismo que la tabla; los médicos sin porcentaje salen primero; el administrador ve «Cerrar mes» y la visitadora no; con el mes cerrado la pantalla lee el snapshot y no recalcula.
- [ ] **Paso 2: implementar la tabla y el resumen** con `construirConcentradoMensual`.
- [ ] **Paso 3: modal de porcentaje** — captura `porcentaje`, `vigente_desde` (por omisión el primer día del mes en curso) y `notas`, e inserta un renglón nuevo en `comisiones_doctor`; muestra el historial de porcentajes previos del médico para que quede claro que no se está sobrescribiendo nada.
- [ ] **Paso 4: cierre de mes** — escribe el snapshot en `comisiones_mensuales` dentro de una sola llamada y pide confirmación explícita indicando el total a pagar.
- [ ] **Paso 5: detalle por médico** — desplegar los folios que componen el ingreso del mes.
- [ ] **Paso 6: exportar** a Excel y PDF con `exportarExcel` / `exportarPDF`.

---

### Tarea 8: Rutas, menú y permisos

**Archivos:** Modificar `src/App.jsx`, `src/components/sidebar-menu.js`, `src/utils/role-permissions.js` y su test.

- [ ] **Paso 1: tests de permisos**

```js
test('la visitadora entra a sus tres pantallas y no a caja ni configuración', () => {
	expect(puedeAccederRuta('visitadora', '/visitadora/informe')).toBe(true);
	expect(puedeAccederRuta('visitadora', '/visitadora/comisiones')).toBe(true);
	expect(puedeAccederRuta('visitadora', '/doctores')).toBe(true);
	expect(puedeAccederRuta('visitadora', '/cierre-caja')).toBe(false);
	expect(puedeAccederRuta('visitadora', '/configuracion/precios')).toBe(false);
});

test('los roles de laboratorio no ven el menú de visitadora', () => {
	const ids = filtrarMenuPorRol(sidebarItems, 'quimico').map((item) => item.id);
	expect(ids).not.toContain('visitadora');
});
```

- [ ] **Paso 2: verlos fallar** — `npm test -- role-permissions --runInBand`
- [ ] **Paso 3: implementar** `VISITADORA_PATHS` (`/dashboard`, `/visitadora/*`, `/doctores`, `/pacientes`, `/perfil`) y la rama correspondiente en `filtrarMenuPorRol`, siguiendo el patrón de `esRecepcionista`.
- [ ] **Paso 4: sección en el sidebar** con submenú Informe / Programación / Concentrado.
- [ ] **Paso 5: rutas `lazy` en `App.jsx`** bajo `<P>`.

---

### Tarea 9: Validación final

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Recorrido manual: importar los dos Excel de agosto, verificar que las 51 visitas y las 5 filas de programación entran completas, asignar 10 % / 15 % / 20 % a tres médicos con ventas y comprobar contra `reporte-ventas` que el ingreso del concentrado coincide.

---

## Fuera de alcance (fase 2)

- **Porcentaje por tipo de estudio.** El reporte de agosto ya trae casos: «15 % general y 20 % en resonancia magnética de corazón». Requiere una tabla `comisiones_doctor_estudio` y comisionar sobre `estudios_venta` en lugar de sobre `ventas.total`. Por ahora esa excepción se captura en `notas` y se ve en el modal.
- **Convenios de descuento a paciente.** `Descuento para Pacientes` y `30 % de descuento` no son comisión al médico sino precio al paciente; ya existe `clientes_descuento` para eso y conviene ligarlo, no duplicarlo.
- **Esquema de puntos.** `PUNTOS` aparece en cuatro visitas y no está definido en ningún lado; hay que documentarlo antes de modelarlo.
- **Recordatorio automático de seguimiento.** Casi toda visita deja un «dar seguimiento a…»; convertirlo en tarea con fecha es un módulo aparte.
