import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./nueva-cita-modal.css", () => ({}), { virtual: true });
jest.mock("../assets/calendarioIcono.png", () => "calendario.png", { virtual: true });
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("../context/auth-context", () => ({
	useAuth: () => ({ empleadoData: { id_sucursal: 1 } }),
}));

const mockInserts = [];
const mockPacientesConsultados = [];

jest.mock("../lib/supabase-client", () => {
	const consultaVacia = () => {
		const consulta = {
			select: () => consulta,
			eq: (columna, valor) => {
				if (columna === "telefono") mockPacientesConsultados.push(valor);
				return consulta;
			},
			ilike: () => consulta,
			order: () => Promise.resolve({ data: [], error: null }),
			range: () => Promise.resolve({ data: [], error: null }),
			maybeSingle: () => Promise.resolve({ data: null, error: null }),
			then: (resolver) => Promise.resolve({ data: [], error: null }).then(resolver),
		};
		return consulta;
	};

	return {
		supabase: {
			from: (tabla) => {
				if (tabla === "citas") {
					return {
						insert: (filas) => {
							mockInserts.push(Array.isArray(filas) ? filas[0] : filas);
							return {
								select: () => ({
									single: () => Promise.resolve({ data: { id_cita: 1 }, error: null }),
								}),
							};
						},
					};
				}
				return consultaVacia();
			},
		},
	};
});

jest.mock("../utils/clientes-seleccionables", () => ({
	consultarClientesSeleccionables: () =>
		Promise.resolve({ data: [{ id_cliente: 7, nombre: "IMSS" }], error: null }),
}));

import NuevaCitaModal from "./nueva-cita-modal";

const abrir = (props = {}) =>
	render(
		<NuevaCitaModal
			isOpen
			onClose={jest.fn()}
			fechaInicial="2026-09-04"
			horaInicial="10:00"
			{...props}
		/>,
	);

const elegirUnRenglon = () =>
	fireEvent.click(screen.getByRole("button", { name: "Un renglón" }));

const escribirRenglon = (texto) =>
	fireEvent.change(screen.getByLabelText("Estudio, paciente, teléfono y cliente"), {
		target: { value: texto },
	});

beforeEach(() => {
	mockInserts.length = 0;
	mockPacientesConsultados.length = 0;
	localStorage.clear();
});

// Agendar por telefono es teclear con el paciente esperando en la linea: seis
// campos son cinco saltos de tabulador de mas. En este modo se escribe todo de
// corrido en un renglon.
describe("NuevaCitaModal: capturar la cita en un renglón", () => {
	test("arranca en el formulario completo, como estaba", () => {
		abrir();

		expect(screen.getByLabelText("Nombre Completo")).toBeInTheDocument();
		expect(screen.queryByLabelText("Estudio, paciente, teléfono y cliente")).not.toBeInTheDocument();
	});

	test("al elegir un renglón desaparecen los seis campos", () => {
		abrir();

		elegirUnRenglon();

		expect(screen.getByLabelText("Estudio, paciente, teléfono y cliente")).toBeInTheDocument();
		expect(screen.queryByLabelText("Nombre Completo")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Teléfono")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Empresa")).not.toBeInTheDocument();
		expect(
			screen.queryByPlaceholderText("Buscar estudio para agregar..."),
		).not.toBeInTheDocument();
	});

	// La fecha y la hora son el hueco de la agenda, y la columna no admite nulo:
	// se quedan en los dos modos.
	test("la fecha y la hora siguen ahí", () => {
		abrir();
		elegirUnRenglon();

		expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
		expect(screen.getByLabelText("Hora")).toBeInTheDocument();
	});

	test("guarda el nombre, el teléfono y el estudio del renglón", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("biometria hematica, Laura Mendez Rios 4771234567");

		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockInserts[0]).toMatchObject({
			nombre_paciente: "Laura Mendez Rios",
			telefono_paciente: "4771234567",
			tipo_estudio: "biometria hematica",
			estado: "pendiente",
		});
	});

	// El cliente se escribe al final del renglón y se guarda por su id.
	test("guarda el cliente del renglón", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("rayos x, Ana Lopez 3221220777 imss");

		expect(await screen.findByText(/Cliente: IMSS/)).toBeInTheDocument();
		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockInserts[0]).toMatchObject({
			nombre_paciente: "Ana Lopez",
			telefono_paciente: "3221220777",
			id_cliente: 7,
		});
	});

	// El hueco donde se abrio el modal manda: en este modo no se teclea la fecha.
	test("la cita cae en el hueco del calendario", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("rayos x - Juan Perez");

		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockInserts[0].fecha_estudio).toBe("2026-09-04T10:00:00-06:00");
	});

	// El paciente se engancha por telefono, igual que en el formulario completo.
	test("busca al paciente con el teléfono que sacó del renglón", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("ultrasonido, Ana Lopez 322 122 0777");

		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockPacientesConsultados).toContain("3221220777");
	});

	// Sin telefono no hay a quien enlazar: consultar con la cadena vacia
	// engancharia la cita al primer paciente sin telefono.
	test("sin teléfono no consulta pacientes", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("rayos x, Juan Perez");

		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockPacientesConsultados).toHaveLength(0);
		expect(mockInserts[0].telefono_paciente).toBeNull();
	});

	// El estudio se escribe a mano y puede no estar en el catalogo: se cotiza al
	// pasar la cita a estudio, que es donde se conoce el convenio.
	test("la cita del renglón se guarda sin importe", async () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("tomografia de craneo, Ana Lopez");

		fireEvent.submit(screen.getByRole("button", { name: "Crear Cita" }).closest("form"));

		await waitFor(() => expect(mockInserts).toHaveLength(1));
		expect(mockInserts[0].monto).toBe(0);
	});

	// Es la unica forma de notar que el nombre se partio donde no debia.
	test("muestra lo que entendió antes de guardar", () => {
		abrir();
		elegirUnRenglon();
		escribirRenglon("rayos x, Ana Lopez 3221220777");

		// getByText normaliza los espacios, asi que se compara por partes.
		const resumen = screen.getByText(/Paciente: Ana Lopez/);
		expect(resumen).toHaveTextContent("Tel: 3221220777");
		expect(resumen).toHaveTextContent("Estudio: rayos x");
	});

	test("un renglón vacío no resume nada", () => {
		abrir();
		elegirUnRenglon();

		expect(screen.queryByText(/^Paciente: /)).not.toBeInTheDocument();
	});

	// Quien agenda por telefono lo hace todo el dia: no tiene por que elegir el
	// modo en cada cita.
	test("recuerda el modo elegido para la siguiente cita", () => {
		const primera = abrir();
		elegirUnRenglon();
		primera.unmount();

		abrir();
		expect(screen.getByLabelText("Estudio, paciente, teléfono y cliente")).toBeInTheDocument();
	});

	test("volver al formulario completo también se recuerda", () => {
		const primera = abrir();
		elegirUnRenglon();
		fireEvent.click(screen.getByRole("button", { name: "Formulario completo" }));
		primera.unmount();

		abrir();
		expect(screen.getByLabelText("Nombre Completo")).toBeInTheDocument();
	});
});
