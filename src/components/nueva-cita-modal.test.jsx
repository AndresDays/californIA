import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./nueva-cita-modal.css", () => ({}), { virtual: true });
jest.mock("../assets/calendarioIcono.png", () => "calendario.png", { virtual: true });
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("../context/auth-context", () => ({
	useAuth: () => ({ empleadoData: { id_sucursal: 1, id_empleado: 3, nombre: "Ana Ruiz" } }),
}));

const CLIENTES = [{ id_cliente: 7, nombre: "Particular" }];
const TIPOS = [
	{ id_tipo_estudio: 4, nombre: "TOMOGRAFIA" },
	{ id_tipo_estudio: 9, nombre: "LABORATORIO" },
];
const ESTUDIOS_LAB = [
	{ id: 11, clave: "TRAC", descripcion: "TACROLIMUS", area: "Quimica" },
];
const ESTUDIOS_IMAGEN = [
	{
		id: 21,
		id_empresa: 2,
		clave: "TAC-CRANEO-SIMPLE",
		descripcion: "TAC DE CRANEO SIMPLE",
		empresa_operativa: "CDI",
		modalidad: "tomografia",
		area: "Imagen",
	},
];

// Cada tabla responde a la cadena de llamadas que el modal arma; se devuelve el
// mismo objeto para que el orden de select/eq/order no importe.
const respuestaDeTabla = (tabla) => {
	const datos = {
		clientes: CLIENTES,
		tipos_estudio: TIPOS,
		estudios_lab_catalogo: ESTUDIOS_LAB,
		estudios_imagen_catalogo: ESTUDIOS_IMAGEN,
		precios_estudios: [],
		convenios_facturacion: [],
	}[tabla] ?? [];

	const consulta = {
		select: () => consulta,
		eq: () => consulta,
		ilike: () => consulta,
		order: () => Promise.resolve({ data: datos, error: null }),
		range: () => Promise.resolve({ data: datos, error: null }),
		maybeSingle: () => Promise.resolve({ data: null, error: null }),
		then: (resolver) => Promise.resolve({ data: datos, error: null }).then(resolver),
	};
	return consulta;
};

const insertsDeCitas = [];

jest.mock("../lib/supabase-client", () => ({
	supabase: {
		from: (tabla) => {
			if (tabla === "citas") {
				return {
					// El modal inserta un arreglo de una fila.
					insert: (filas) => {
						insertsDeCitas.push(Array.isArray(filas) ? filas[0] : filas);
						return {
							select: () => ({
								single: () => Promise.resolve({ data: { id_cita: 1 }, error: null }),
							}),
						};
					},
				};
			}
			return respuestaDeTabla(tabla);
		},
	},
}));

import NuevaCitaModal from "./nueva-cita-modal";

const abrirModal = () =>
	render(<NuevaCitaModal isOpen onClose={jest.fn()} fechaInicial="2026-08-27" horaInicial="10:00" />);

describe("NuevaCitaModal: la busqueda ofrece el catalogo de imagen", () => {
	// La cita se agendaba solo con el catálogo de laboratorio, así que buscar
	// "TAC" con tomografía elegida devolvía tacrolimus y no el estudio de imagen.
	// Los tres campos son de texto: se escriben los nombres, no se eligen ids.
	const escribir = (campo, valor) =>
		fireEvent.change(document.querySelector(`#${campo}`), {
			target: { value: valor },
		});

	test("con tomografia escrita aparece el estudio de imagen y no el de laboratorio", async () => {
		abrirModal();
		await waitFor(() =>
			expect(document.querySelector("#cita-tipo")).not.toBeNull(),
		);

		escribir("cita-cliente", "Particular");
		fireEvent.focus(document.querySelector("#cita-tipo"));
		await waitFor(() =>
			expect(
				[...document.querySelectorAll('[role="listbox"] > *')].some(
					(opcion) => opcion.textContent === "TOMOGRAFIA",
				),
			).toBe(true),
		);

		escribir("cita-tipo", "TOMOGRAFIA");
		fireEvent.change(screen.getByPlaceholderText("Buscar estudio para agregar..."), {
			target: { value: "TAC" },
		});

		expect(await screen.findByText(/TAC DE CRANEO SIMPLE/)).toBeInTheDocument();
		expect(screen.queryByText(/TACROLIMUS/)).not.toBeInTheDocument();
	});

	// Antes habia que pasar por empresa para llegar al cliente y por el cliente
	// para llegar al tipo. Agendar por telefono no aguanta esa cascada: los dos
	// campos se escriben en el orden que sea, y la busqueda de estudios ya no
	// espera a que haya un cliente.
	test("se puede escribir el tipo de estudio sin haber puesto cliente", async () => {
		abrirModal();
		await waitFor(() =>
			expect(document.querySelector("#cita-tipo")).not.toBeNull(),
		);

		const campoTipo = document.querySelector("#cita-tipo");
		expect(campoTipo).not.toBeDisabled();
		fireEvent.change(campoTipo, { target: { value: "ULTRASONIDO" } });
		expect(campoTipo.value).toBe("ULTRASONIDO");

		const busqueda = screen.getByPlaceholderText("Buscar estudio para agregar...");
		expect(busqueda).not.toBeDisabled();
	});
});

// Agendar por telefono se hace con datos a medias: quien llama muchas veces
// solo deja el nombre y el resto se completa al llegar.
describe("NuevaCitaModal: ningun campo es obligatorio", () => {
	beforeEach(() => {
		insertsDeCitas.length = 0;
	});

	const guardar = async () => {
		fireEvent.click(screen.getByRole("button", { name: /Crear Cita/i }));
		await waitFor(() => expect(insertsDeCitas).toHaveLength(1));
		return insertsDeCitas[0];
	};

	test("se agenda sin llenar nada y los campos vacios viajan como null", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		const fila = await guardar();

		expect(fila.nombre_paciente).toBeNull();
		expect(fila.telefono_paciente).toBeNull();
		expect(fila.correo_paciente).toBeNull();
		expect(fila.id_cliente).toBeNull();
		expect(fila.id_tipo_estudio).toBeNull();
		expect(fila.id_paciente).toBeNull();
	});

	// fecha_estudio es NOT NULL en la base y una cita sin fecha no aparecería
	// en el calendario, así que se toma la del hueco donde se abrió el modal.
	test("sin fecha capturada toma la del hueco del calendario", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		const fila = await guardar();

		expect(fila.fecha_estudio).toBe("2026-08-27T10:00:00-06:00");
	});

	test("lo escrito se convierte en el id del catalogo cuando coincide", async () => {
		abrirModal();
		await waitFor(() =>
			expect(document.querySelector("#cita-cliente")).not.toBeNull(),
		);

		const escribir = (campo, valor) =>
			fireEvent.change(document.querySelector(`#${campo}`), {
				target: { value: valor },
			});

		// Se teclea en minusculas y sin el nombre completo, como en una llamada.
		escribir("cita-cliente", "particular");
		escribir("cita-tipo", "tomografia");

		const fila = await guardar();

		expect(fila.id_cliente).toBe(7);
		expect(fila.id_tipo_estudio).toBe(4);
	});

	// Un convenio que no esta en el catalogo no puede bloquear el agendado: la
	// cita se guarda sin el id en lugar de rechazarse.
	test("un cliente que no esta en el catalogo no impide agendar", async () => {
		abrirModal();
		await waitFor(() =>
			expect(document.querySelector("#cita-cliente")).not.toBeNull(),
		);

		fireEvent.change(document.querySelector("#cita-cliente"), {
			target: { value: "Seguros del Norte" },
		});
		fireEvent.change(document.querySelector("#cita-tipo"), {
			target: { value: "Ultrasonido de abdomen" },
		});

		const fila = await guardar();

		expect(fila.id_cliente).toBeNull();
		// Lo que pidio el paciente se conserva en la columna de texto, que es lo
		// unico que queda cuando el estudio no esta en el catalogo.
		expect(fila.tipo_estudio).toBe("Ultrasonido de abdomen");
	});

	test("un telefono a medias si se rechaza, porque despues no se puede llamar", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		fireEvent.change(document.querySelector('input[name="contacto"]'), {
			target: { value: "123" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Crear Cita/i }));

		expect(await screen.findByText(/10 d[ií]gitos/i)).toBeInTheDocument();
		expect(insertsDeCitas).toHaveLength(0);
	});

	// Hay quien no deja telefono sino correo: antes ese dato no tenia donde ir.
	test("con contacto de correo el dato viaja en su columna", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		fireEvent.change(screen.getByLabelText("Tipo de contacto"), {
			target: { value: "correo" },
		});
		fireEvent.change(document.querySelector('input[name="contacto"]'), {
			target: { value: "laura@correo.com" },
		});

		const fila = await guardar();

		expect(fila.correo_paciente).toBe("laura@correo.com");
		expect(fila.telefono_paciente).toBeNull();
	});

	test("un correo mal escrito se rechaza", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		fireEvent.change(screen.getByLabelText("Tipo de contacto"), {
			target: { value: "correo" },
		});
		fireEvent.change(document.querySelector('input[name="contacto"]'), {
			target: { value: "laura@" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Crear Cita/i }));

		expect(await screen.findByText(/correo no tiene un formato/i)).toBeInTheDocument();
		expect(insertsDeCitas).toHaveLength(0);
	});

	// La columna del calendario ya dijo de que es la cita: teclearlo otra vez
	// sobra, y una cita sin tipo no cae en su columna al recargar la agenda.
	test("el tipo de estudio se preselecciona con la columna donde se abrio", async () => {
		render(
			<NuevaCitaModal
				isOpen
				onClose={jest.fn()}
				fechaInicial="2026-08-27"
				horaInicial="10:00"
				tipoEstudioInicial="Laboratorio"
			/>,
		);

		await waitFor(() =>
			expect(document.querySelector("#cita-tipo").value).toBe("LABORATORIO"),
		);

		const fila = await guardar();

		expect(fila.id_tipo_estudio).toBe(9);
	});

	// Cuando algo no cuadra en la agenda hay que saber a quien preguntarle.
	test("la cita guarda y muestra quien la creo", async () => {
		abrirModal();
		await screen.findAllByRole("combobox");

		expect(screen.getByText(/Creada por: Ana Ruiz/)).toBeInTheDocument();

		const fila = await guardar();

		expect(fila.id_empleado_creador).toBe(3);
		expect(fila.creado_por_nombre).toBe("Ana Ruiz");
	});
});
// Cliente y tipo se escriben, pero la lista de opciones tiene que estar a la
// vista: era un <datalist>, y el navegador no lo abre cuando el campo ya trae
// texto -que es lo que pasa desde que el tipo llega puesto desde la columna del
// calendario-, así que la lista no se veía nunca.
describe("NuevaCitaModal: las opciones se despliegan al enfocar", () => {
	const opcionesVisibles = () =>
		[...document.querySelectorAll('[role="listbox"] > *')].map((o) => o.textContent);

	test("el campo de cliente ofrece el catálogo al enfocarlo, sin escribir nada", async () => {
		abrirModal();
		await waitFor(() => expect(document.querySelector("#cita-cliente")).not.toBeNull());

		fireEvent.focus(document.querySelector("#cita-cliente"));

		await waitFor(() => expect(opcionesVisibles()).toContain("Particular"));
	});

	test("con el tipo ya puesto por la columna, la lista sigue saliendo", async () => {
		render(
			<NuevaCitaModal
				isOpen
				onClose={jest.fn()}
				fechaInicial="2026-08-27"
				horaInicial="10:00"
				tipoEstudioInicial="LABORATORIO"
			/>,
		);
		await waitFor(() =>
			expect(document.querySelector("#cita-tipo").value).toBe("LABORATORIO"),
		);

		fireEvent.focus(document.querySelector("#cita-tipo"));

		await waitFor(() => expect(opcionesVisibles()).toContain("LABORATORIO"));
	});

	test("elegir de la lista llena el campo", async () => {
		abrirModal();
		await waitFor(() => expect(document.querySelector("#cita-cliente")).not.toBeNull());

		fireEvent.focus(document.querySelector("#cita-cliente"));
		await waitFor(() => expect(opcionesVisibles()).toContain("Particular"));

		fireEvent.mouseDown(
			[...document.querySelectorAll('[role="listbox"] > *')].find(
				(o) => o.textContent === "Particular",
			),
		);

		expect(document.querySelector("#cita-cliente").value).toBe("Particular");
	});
});
