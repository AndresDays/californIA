import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../visitadora.css", () => ({}));
const mockGuardarVisita = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../hooks/use-visitas-medicas", () => ({
	useGuardarVisita: () => ({ mutateAsync: mockGuardarVisita, isPending: false }),
}));
const mockClasificar = jest.fn();
jest.mock("../../../hooks/use-clasificar-visita", () => ({
	useClasificarVisita: () => ({ mutateAsync: mockClasificar, isPending: false }),
}));
const mockGuardarTarea = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../hooks/use-tareas-seguimiento", () => ({
	useGuardarTarea: () => ({ mutateAsync: mockGuardarTarea, isPending: false }),
}));
jest.mock("../../../hooks/use-agenda-visitas", () => ({
	useGuardarAgenda: () => ({ mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false }),
}));
jest.mock("../../../hooks/use-directorio-medicos", () => ({
	useActualizarContactoMedico: () => ({
		mutateAsync: jest.fn().mockResolvedValue(undefined),
		isPending: false,
	}),
}));

// El informe de visitas usa el mismo modal que la agenda: así los dos lados
// capturan con los mismos campos.
import ModalRegistroVisita from "./modal-registro-visita";

const props = {
	isOpen: true,
	visita: null,
	semana: { desde: "2026-09-14", hasta: "2026-09-18" },
	idEmpleado: 4,
};

beforeEach(() => {
	mockGuardarVisita.mockClear();
	mockClasificar.mockReset();
});

describe("El modal del informe de visitas", () => {
	// Volver a la pestaña refresca los catálogos y vuelve a dibujar la pantalla.
	// Lo capturado vive en el modal, así que tiene que sobrevivir a esos
	// redibujados: antes se perdía todo lo escrito.
	test("conserva lo capturado cuando la pantalla se vuelve a dibujar", () => {
		const { rerender } = render(
			<ModalRegistroVisita {...props} doctores={[{ id_doctor: 3, nombre: "Saúl Ruiz" }]} />,
		);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), {
			target: { value: "CLINICA DEL VALLE" },
		});
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Se entregaron listas de precios" },
		});

		// Otra lista de doctores: la referencia nueva es lo que llega tras un
		// refetch al recuperar el foco.
		rerender(
			<ModalRegistroVisita
				{...props}
				doctores={[
					{ id_doctor: 3, nombre: "Saúl Ruiz" },
					{ id_doctor: 7, nombre: "Ana Lara" },
				]}
			/>,
		);

		expect(screen.getByLabelText("Médico / Empresa")).toHaveValue("CLINICA DEL VALLE");
		expect(screen.getByLabelText("Lo que pasó en la visita")).toHaveValue("Se entregaron listas de precios");
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	// Es la misma captura que la de registrar visita en la agenda: el espacio
	// abierto para escribir de corrido y «Acomodar con IA».
	test("captura de corrido y guarda lo que acomodó la IA", async () => {
		mockClasificar.mockResolvedValue({
			fuente: "ia",
			desglose: {
				actividades: "Se presentaron los servicios de imagen.",
				comentarios_medico: "",
				observaciones: "Pidió precios de resonancia.",
				seguimiento: "Llamar en 15 días.",
				tipo_convenio: "",
			},
		});
		render(<ModalRegistroVisita {...props} doctores={[]} />);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), { target: { value: "Dr. Ruiz" } });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "presente imagen, pidio precios de resonancia, llamarle en 15 dias" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Acomodar con IA" }));
		});
		expect(screen.getByText(/acomodado con IA/)).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({
				fecha: "2026-09-14",
				medico_nombre: "Dr. Ruiz",
				actividades: "Se presentaron los servicios de imagen.",
				observaciones: "Pidió precios de resonancia.",
				seguimiento: "Llamar en 15 días.",
				captura_libre: "presente imagen, pidio precios de resonancia, llamarle en 15 dias",
				id_empleado: 4,
			}),
		);
	});

	test("campo por campo guarda cada columna y no deja captura libre", async () => {
		render(<ModalRegistroVisita {...props} doctores={[]} />);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), { target: { value: "Dr. Ruiz" } });
		fireEvent.click(screen.getByRole("tab", { name: "Campo por campo" }));
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Entrega de órdenes" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ actividades: "Entrega de órdenes", captura_libre: null }),
		);
	});

	test("al editar una visita del Excel arma el texto con sus columnas", () => {
		render(
			<ModalRegistroVisita
				{...props}
				doctores={[]}
				visita={{ id_visita: 9, fecha: "2026-09-15", medico_nombre: "Dr. Ruiz", actividades: "Entrega de órdenes" }}
			/>,
		);
		expect(screen.getByLabelText("Lo que pasó en la visita").value).toContain("Entrega de órdenes");
	});
});

// El informe y la agenda capturan la misma visita: los campos tienen que ser
// los mismos de los dos lados, que es lo que se entrega en el reporte.
describe("los campos del informe son los de la agenda", () => {
	const etiquetas = [
		"Médico / Empresa",
		"Fecha",
		"Tipo de visita",
		"Teléfono",
		"Correo electrónico",
		"Especialidad",
		"Ubicación",
		"Fecha de seguimiento",
	];

	test.each(etiquetas)("el modal del informe tiene %s", (etiqueta) => {
		render(<ModalRegistroVisita {...props} doctores={[]} />);

		expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
	});

	// Aquí no se sale de un consultorio: la visita se liga con el catálogo a
	// mano, y ese enlace es el que la hace contar para las comisiones.
	test("ofrece el catálogo de doctores y liga la visita con el elegido", async () => {
		render(
			<ModalRegistroVisita
				{...props}
				doctores={[{ id_doctor: 3, nombre: "Saúl Ruiz", especialidad: "Pediatría" }]}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Doctor del catálogo"), {
			target: { value: "3" },
		});
		expect(screen.getByLabelText("Médico / Empresa")).toHaveValue("Saúl Ruiz");
		expect(screen.getByLabelText("Especialidad")).toHaveValue("Pediatría");

		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Entrega de órdenes" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});

		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ id_doctor: 3, medico_nombre: "Saúl Ruiz" }),
		);
	});

	// Saliendo del consultorio el médico ya está dado: el select sobra.
	test("desde la agenda no se ofrece el catálogo", () => {
		render(
			<ModalRegistroVisita
				{...props}
				medico={{ id_doctor: 7, nombre_completo: "Ramón Pérez" }}
				doctores={[{ id_doctor: 3, nombre: "Saúl Ruiz" }]}
			/>,
		);

		expect(screen.queryByLabelText("Doctor del catálogo")).not.toBeInTheDocument();
	});
});
