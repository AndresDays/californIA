import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../visitadora.css", () => ({}));

const mockGuardarAgenda = jest.fn().mockResolvedValue(undefined);
const mockAgregarNota = jest.fn().mockResolvedValue(undefined);
const mockGuardarMedico = jest.fn().mockResolvedValue(42);

jest.mock("../../../hooks/use-agenda-visitas", () => ({
	useGuardarAgenda: () => ({ mutateAsync: mockGuardarAgenda, isPending: false }),
}));
jest.mock("../../../hooks/use-directorio-medicos", () => ({
	useAgregarNotaMedico: () => ({ mutateAsync: mockAgregarNota, isPending: false }),
	useGuardarMedico: () => ({ mutateAsync: mockGuardarMedico, isPending: false }),
}));

import ModalCita from "./modal-cita";

const medico = { id_doctor: 7, nombre_completo: "Ramón Pérez", especialidad: "Ginecología", zona: "Centro" };

const mostrar = async (props = {}) => {
	const onGuardado = jest.fn();
	const onError = jest.fn();
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ModalCita
					isOpen
					medico={medico}
					fecha="2026-09-23"
					idEmpleado={4}
					onClose={jest.fn()}
					onGuardado={onGuardado}
					onError={onError}
					{...props}
				/>
			</QueryClientProvider>,
		);
	});
	return { onGuardado, onError };
};

beforeEach(() => {
	mockGuardarAgenda.mockClear();
	mockAgregarNota.mockClear();
	mockGuardarMedico.mockClear();
});

describe("Programar visita", () => {
	test("guarda la cita con su día y su hora", async () => {
		const { onGuardado } = await mostrar();
		fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "16:30" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_doctor: 7, fecha: "2026-09-23", hora: "16:30" }),
		);
		expect(onGuardado).toHaveBeenCalled();
	});

	// La nota es del médico, no de la cita: se guarda en su ficha para leerla
	// después en la pestaña de Datos del directorio.
	test("la nota se guarda en la ficha del médico", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Notas del médico"), {
			target: { value: "Prefiere que le llamen antes de ir" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockAgregarNota).toHaveBeenCalledWith({
			idDoctor: 7,
			nota: "Prefiere que le llamen antes de ir",
			fecha: "2026-09-23",
		});
	});

	test("sin nota no se toca la ficha", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalled();
		expect(mockAgregarNota).not.toHaveBeenCalled();
	});
});

describe("Editar la visita de una tarjeta", () => {
	const cita = {
		id_agenda: "a1",
		id_doctor: 7,
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		fecha: "2026-09-23",
		hora: "16:00:00",
		tipo_visita: "seguimiento",
		zona: "Centro",
	};

	// Se edita la visita de ese médico: volver a preguntar cuál era pedía un
	// dato que ya se sabía y dejaba cambiarlo sin querer.
	test("no pregunta de nuevo por el médico", async () => {
		await mostrar({ cita, medico: undefined });
		expect(screen.queryByLabelText("Médico")).not.toBeInTheDocument();
		expect(screen.getByText(/Ramón Pérez/)).toBeInTheDocument();
	});

	test("guarda sobre la misma visita, con su médico", async () => {
		await mostrar({ cita, medico: undefined, medicos: [] });
		fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "18:00" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({
				id_agenda: "a1",
				id_doctor: 7,
				medico_nombre: "Ramón Pérez",
				hora: "18:00",
			}),
		);
	});

	test("programar una visita nueva sí deja elegir médico", async () => {
		await mostrar({ medico: undefined, medicos: [{ id_doctor: 9, nombre_completo: "Ana Ruiz" }] });
		expect(screen.getByLabelText("Médico")).toBeInTheDocument();
	});
});

describe("Médico que todavía no está en el directorio", () => {
	const abrirAlta = async () => {
		const resultado = await mostrar({ medico: undefined, medicos: [] });
		fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "nuevo" } });
		return resultado;
	};

	test("pide nombre, especialidad, teléfono y correo", async () => {
		await abrirAlta();
		expect(screen.getByLabelText("Nombre del médico")).toBeInTheDocument();
		expect(screen.getByLabelText("Especialidad")).toBeInTheDocument();
		expect(screen.getByLabelText("Teléfono")).toBeInTheDocument();
		expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
	});

	// Se da de alta antes que la cita para que la visita nazca ligada a su
	// expediente y no como un nombre suelto.
	test("da de alta al médico y liga la visita a su expediente", async () => {
		await abrirAlta();
		fireEvent.change(screen.getByLabelText("Nombre del médico"), {
			target: { value: "Marta Lugo" },
		});
		fireEvent.change(screen.getByLabelText("Especialidad"), { target: { value: "Pediatría" } });
		fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "3221234567" } });
		fireEvent.change(screen.getByLabelText("Correo electrónico"), {
			target: { value: "marta@ejemplo.mx" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarMedico).toHaveBeenCalledWith({
			doctor: {
				nombre: "Marta Lugo",
				especialidad: "Pediatría",
				telefono: "3221234567",
				email: "marta@ejemplo.mx",
			},
			ficha: expect.objectContaining({ estatus: "prospecto", fecha_primer_contacto: "2026-09-23" }),
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_doctor: 42, medico_nombre: "Marta Lugo" }),
		);
	});

	test("sin nombre no da de alta a nadie", async () => {
		const { onError } = await abrirAlta();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarMedico).not.toHaveBeenCalled();
		expect(mockGuardarAgenda).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith("Escribe el nombre del médico nuevo.");
	});

	test("elegir un médico del catálogo no enseña el alta", async () => {
		await mostrar({ medico: undefined, medicos: [{ id_doctor: 9, nombre_completo: "Ana Ruiz" }] });
		fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "9" } });
		expect(screen.queryByLabelText("Nombre del médico")).not.toBeInTheDocument();
	});
});

describe("El médico nuevo que ya estaba en el directorio", () => {
	const directorio = [
		{ id_doctor: 9, nombre_completo: "Ramón Pérez", telefono: "3221234567", especialidad: "Ginecología" },
	];

	const abrirAlta = async () => {
		const resultado = await mostrar({ medico: undefined, medicos: directorio });
		fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "nuevo" } });
		return resultado;
	};

	// Capturarlo dos veces partiría su historial en dos y descuadraría sus
	// comisiones.
	test("no lo crea otra vez: liga la visita al que ya existe", async () => {
		const { onGuardado } = await abrirAlta();
		fireEvent.change(screen.getByLabelText("Nombre del médico"), {
			target: { value: "dr. ramon perez" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarMedico).not.toHaveBeenCalled();
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_doctor: 9, medico_nombre: "Ramón Pérez" }),
		);
		expect(onGuardado.mock.calls[0][0]).toContain("ya estaba en el directorio");
	});

	test("también lo reconoce por teléfono aunque el nombre no empate", async () => {
		await abrirAlta();
		fireEvent.change(screen.getByLabelText("Nombre del médico"), { target: { value: "R. Pérez" } });
		fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "+52 322 123 4567" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarMedico).not.toHaveBeenCalled();
		expect(mockGuardarAgenda).toHaveBeenCalledWith(expect.objectContaining({ id_doctor: 9 }));
	});

	test("al que de verdad es nuevo sí lo da de alta", async () => {
		await abrirAlta();
		fireEvent.change(screen.getByLabelText("Nombre del médico"), { target: { value: "Marta Lugo" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarMedico).toHaveBeenCalled();
	});
});

describe("Objetivos del día o de la semana", () => {
	const objetivosPeriodo = [
		{ id_objetivo: "o1", desde: "2026-09-21", hasta: "2026-09-27", texto: "Levantar pedido de órdenes" },
		{ id_objetivo: "o2", desde: "2026-09-23", hasta: "2026-09-23", texto: "Presentar el paquete nuevo" },
	];

	// Se tecleaba lo mismo en cada cita de la semana.
	test("la cita nace con los objetivos de ese día", async () => {
		await mostrar({ objetivosPeriodo, fecha: "2026-09-23" });
		expect(screen.getByLabelText(/Objetivo de la visita/)).toHaveValue(
			"Levantar pedido de órdenes\nPresentar el paquete nuevo",
		);
	});

	test("un día sin objetivos propios sólo trae los de la semana", async () => {
		await mostrar({ objetivosPeriodo, fecha: "2026-09-22" });
		expect(screen.getByLabelText(/Objetivo de la visita/)).toHaveValue("Levantar pedido de órdenes");
	});

	test("al mover la cita de día se traen los objetivos del día nuevo", async () => {
		await mostrar({ objetivosPeriodo, fecha: "2026-09-22" });
		fireEvent.change(screen.getByLabelText("Día de visita"), { target: { value: "2026-09-23" } });
		expect(screen.getByLabelText(/Objetivo de la visita/)).toHaveValue(
			"Levantar pedido de órdenes\nPresentar el paquete nuevo",
		);
	});

	// Lo que ella escribió no se pisa al cambiar de día.
	test("si ya escribió su objetivo, cambiar de día no lo borra", async () => {
		await mostrar({ objetivosPeriodo, fecha: "2026-09-22" });
		fireEvent.change(screen.getByLabelText(/Objetivo de la visita/), {
			target: { value: "Cobrar la comisión pendiente" },
		});
		fireEvent.change(screen.getByLabelText("Día de visita"), { target: { value: "2026-09-23" } });
		expect(screen.getByLabelText(/Objetivo de la visita/)).toHaveValue("Cobrar la comisión pendiente");
	});

	test("sin objetivos del periodo el campo queda vacío", async () => {
		await mostrar({ fecha: "2026-09-23" });
		expect(screen.getByLabelText(/Objetivo de la visita/)).toHaveValue("");
	});
});
