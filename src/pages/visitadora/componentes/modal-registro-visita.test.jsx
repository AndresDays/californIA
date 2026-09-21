import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../visitadora.css", () => ({}));

const mockGuardarVisita = jest.fn().mockResolvedValue(undefined);
const mockGuardarTarea = jest.fn().mockResolvedValue(undefined);
const mockGuardarAgenda = jest.fn().mockResolvedValue(undefined);
const mockActualizarContacto = jest.fn().mockResolvedValue(undefined);

jest.mock("../../../hooks/use-visitas-medicas", () => ({
	useGuardarVisita: () => ({ mutateAsync: mockGuardarVisita, isPending: false }),
}));
jest.mock("../../../hooks/use-tareas-seguimiento", () => ({
	useGuardarTarea: () => ({ mutateAsync: mockGuardarTarea, isPending: false }),
}));
jest.mock("../../../hooks/use-agenda-visitas", () => ({
	useGuardarAgenda: () => ({ mutateAsync: mockGuardarAgenda, isPending: false }),
}));
const mockClasificar = jest.fn();
jest.mock("../../../hooks/use-clasificar-visita", () => ({
	useClasificarVisita: () => ({ mutateAsync: mockClasificar, isPending: false }),
}));
jest.mock("../../../hooks/use-directorio-medicos", () => ({
	useActualizarContactoMedico: () => ({ mutateAsync: mockActualizarContacto, isPending: false }),
}));

import ModalRegistroVisita from "./modal-registro-visita";

const medico = {
	id_doctor: 7,
	nombre_completo: "Ramón Pérez",
	especialidad: "Ginecología",
	zona: "Centro",
	hospital: "Hospital del Valle",
	telefono: "3221234567",
	email: "ramon@ejemplo.mx",
	fecha_nacimiento: "1975-09-19",
};

// El modal abre en la captura de corrido; estas pruebas trabajan sobre los
// campos sueltos salvo que se pida lo contrario.
const mostrar = async ({ modo = "campos", ...props } = {}) => {
	const onGuardado = jest.fn();
	const onError = jest.fn();
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ModalRegistroVisita
					isOpen
					medico={medico}
					idEmpleado={4}
					onClose={jest.fn()}
					onGuardado={onGuardado}
					onError={onError}
					{...props}
				/>
			</QueryClientProvider>,
		);
	});
	if (modo === "campos") {
		await act(async () => {
			fireEvent.click(screen.getByRole("tab", { name: "Campo por campo" }));
		});
	}
	return { onGuardado, onError };
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z"));
	mockGuardarVisita.mockClear();
	mockGuardarTarea.mockClear();
	mockGuardarAgenda.mockClear();
	mockActualizarContacto.mockClear();
	mockClasificar.mockReset();
});
afterEach(() => jest.useRealTimers());

describe("Registro rápido de visita", () => {
	test("nace con la fecha de hoy y el médico ya puesto", async () => {
		await mostrar();
		expect(screen.getByLabelText("Fecha")).toHaveValue("2026-09-19");
		expect(screen.getByLabelText("Médico")).toHaveValue("Ramón Pérez");
	});

	// Los campos son los del informe semanal, que es el reporte que ella
	// entrega: capturar con otras palabras obligaba a traducir cada renglón.
	test("captura con los campos del informe de visitas", async () => {
		await mostrar();
		for (const etiqueta of [
			"Actividades",
			"Comentarios del médico",
			"Observaciones",
			"Seguimiento",
			"Convenio",
			"Especialidad",
			"Ubicación",
		]) {
			expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
		}
	});

	test("guarda la visita con lo capturado", async () => {
		const { onGuardado } = await mostrar();
		fireEvent.change(screen.getByLabelText("Actividades"), {
			target: { value: "Se presentaron laboratorio e imagen" },
		});
		fireEvent.change(screen.getByLabelText("Observaciones"), {
			target: { value: "Mostró interés en el convenio" },
		});
		fireEvent.change(screen.getByLabelText("Convenio"), { target: { value: "MIXTO" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({
				id_doctor: 7,
				medico_nombre: "Ramón Pérez",
				actividades: "Se presentaron laboratorio e imagen",
				observaciones: "Mostró interés en el convenio",
				tipo_convenio: "MIXTO",
				id_empleado: 4,
			}),
		);
		expect(onGuardado).toHaveBeenCalled();
	});

	// El seguimiento que se le olvidaba apuntar: guardar la visita tiene que
	// dejarlo solo en la bandeja de pendientes.
	test("crea el pendiente de seguimiento junto con la visita", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Pidió cotización" } });
		fireEvent.change(screen.getByLabelText("Seguimiento"), {
			target: { value: "Llevarle la lista de precios" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarTarea).toHaveBeenCalledWith(
			expect.objectContaining({
				id_doctor: 7,
				tipo: "seguimiento",
				descripcion: "Llevarle la lista de precios",
				fecha_objetivo: "2026-10-04",
			}),
		);
	});

	test("sin fecha de seguimiento no agenda pendiente", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "No estaba" } });
		fireEvent.change(screen.getByLabelText("Fecha de seguimiento"), { target: { value: "" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalled();
		expect(mockGuardarTarea).not.toHaveBeenCalled();
	});

	test("una visita que venía de la agenda queda marcada como realizada", async () => {
		await mostrar({ cita: { id_agenda: "a1", tipo_visita: "entrega_ordenes", objetivo: "Dejar órdenes" } });
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Entregadas" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_agenda: "a1", estatus: "realizada", resultado: "Entregadas" }),
		);
	});

	test("no guarda una visita sin actividades", async () => {
		const { onError } = await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith("Escribe al menos las actividades de la visita.");
	});
});

describe("Datos de contacto del médico", () => {
	test("trae lo que ya está capturado en su ficha", async () => {
		await mostrar();
		expect(screen.getByLabelText("Teléfono")).toHaveValue("3221234567");
		expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ramon@ejemplo.mx");
		// El cumpleaños se captura con tres listas, no con el calendario.
		expect(screen.getByLabelText("Día")).toHaveValue("19");
		expect(screen.getByLabelText("Mes")).toHaveValue("09");
		expect(screen.getByLabelText("Año")).toHaveValue("1975");
	});

	// El dato que le sacó en el consultorio se guarda en el catálogo, para que
	// el cumpleaños y el WhatsApp funcionen desde el directorio.
	test("lo que se complete se guarda en la ficha del médico", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Aceptó" } });
		fireEvent.change(screen.getByLabelText("Correo electrónico"), {
			target: { value: "nuevo@ejemplo.mx" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockActualizarContacto).toHaveBeenCalledWith({
			idDoctor: 7,
			nombre: "Ramón Pérez",
			telefono: "3221234567",
			email: "nuevo@ejemplo.mx",
			fechaNacimiento: "1975-09-19",
		});
	});

	test("si no se cambió nada no se toca la ficha", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Aceptó" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalled();
		expect(mockActualizarContacto).not.toHaveBeenCalled();
	});
});

describe("Corregir una visita ya registrada", () => {
	const visita = {
		id_visita: "v1",
		fecha: "2026-09-18",
		tipo_visita: "entrega_ordenes",
		actividades: "Se dejaron órdenes médicas",
		comentarios_medico: "Pidió precios",
		observaciones: "Mostró interés",
		seguimiento: "Llevar cotización",
		fecha_seguimiento: "2026-10-03",
		tipo_convenio: "MIXTO",
	};

	test("abre con todos los campos llenos, no sólo los de la cita", async () => {
		await mostrar({ visita });
		expect(screen.getByLabelText("Actividades")).toHaveValue("Se dejaron órdenes médicas");
		expect(screen.getByLabelText("Comentarios del médico")).toHaveValue("Pidió precios");
		expect(screen.getByLabelText("Observaciones")).toHaveValue("Mostró interés");
		expect(screen.getByLabelText("Seguimiento")).toHaveValue("Llevar cotización");
		expect(screen.getByLabelText("Convenio")).toHaveValue("MIXTO");
		expect(screen.getByLabelText("Fecha de seguimiento")).toHaveValue("2026-10-03");
		expect(screen.getByLabelText("Fecha")).toHaveValue("2026-09-18");
	});

	test("guardar actualiza la visita en vez de crear otra", async () => {
		await mostrar({ visita });
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Firmó convenio" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ id_visita: "v1", actividades: "Firmó convenio" }),
		);
	});

	// El pendiente de seguimiento ya se creó al registrarla; corregirla no debe
	// dejar un segundo recordatorio del mismo médico.
	test("corregirla no duplica el pendiente de seguimiento", async () => {
		await mostrar({ visita });
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Firmó" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
		});
		expect(mockGuardarTarea).not.toHaveBeenCalled();
	});
});

describe("Objetivo, actividades y nombre del médico", () => {
	const cita = { id_agenda: "a1", tipo_visita: "entrega_ordenes", objetivo: "Dejar talonario de órdenes" };

	// El objetivo es con lo que se programó la visita: sirve de referencia al
	// escribir lo que de verdad pasó, pero no se corrige aquí.
	test("el objetivo de la cita se enseña sin poder editarlo", async () => {
		await mostrar({ cita });
		expect(screen.getByText("Objetivo de la visita")).toBeInTheDocument();
		expect(screen.getByText("Dejar talonario de órdenes")).toBeInTheDocument();
		expect(screen.queryByDisplayValue("Dejar talonario de órdenes")).not.toBeInTheDocument();
	});

	test("las actividades empiezan vacías aunque la cita traiga objetivo", async () => {
		await mostrar({ cita });
		expect(screen.getByLabelText("Actividades")).toHaveValue("");
	});

	test("el nombre del médico se puede corregir y se guarda corregido", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "Ramón Pérez Gómez" } });
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Se presentaron servicios" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ medico_nombre: "Ramón Pérez Gómez" }),
		);
		// Y el catálogo queda con el nombre bien escrito, no sólo esta visita.
		expect(mockActualizarContacto).toHaveBeenCalledWith(
			expect.objectContaining({ idDoctor: 7, nombre: "Ramón Pérez Gómez" }),
		);
	});

	test("sin nombre no guarda la visita", async () => {
		const { onError } = await mostrar();
		fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "  " } });
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Algo" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith("La visita necesita el nombre del médico.");
	});
});

describe("Captura de corrido", () => {
	// Parada en el consultorio no hay tiempo de saltar entre siete campos: se
	// escribe todo seguido y cada cosa se marca con su etiqueta.
	test("abre en el campo grande, no en los campos sueltos", async () => {
		await mostrar({ modo: "libre" });
		expect(screen.getByLabelText("Lo que pasó en la visita")).toBeInTheDocument();
		expect(screen.queryByLabelText("Comentarios del médico")).not.toBeInTheDocument();
	});

	test("lo escrito se desglosa en las columnas del informe", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: {
				value: [
					"Se presentaron laboratorio e imagen",
					"Comentarios del médico: pidió precios de resonancia",
					"Observaciones: recibe los miércoles",
					"Seguimiento: volver en 15 días",
					"Convenio: MIXTO",
				].join("\n"),
			},
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({
				actividades: "Se presentaron laboratorio e imagen",
				comentarios_medico: "pidió precios de resonancia",
				observaciones: "recibe los miércoles",
				seguimiento: "volver en 15 días",
				tipo_convenio: "MIXTO",
			}),
		);
	});

	test("guarda también el texto tal como se escribió", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Entrega de órdenes" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ captura_libre: "Entrega de órdenes" }),
		);
	});

	test("el botón de cada etiqueta la mete en el renglón", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Se dejaron órdenes" },
		});
		fireEvent.click(screen.getByRole("button", { name: "+ Seguimiento" }));
		expect(screen.getByLabelText("Lo que pasó en la visita")).toHaveValue(
			"Se dejaron órdenes\nSeguimiento: ",
		);
	});

	test("sin nada escrito no guarda", async () => {
		const { onError } = await mostrar({ modo: "libre" });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith("Escribe al menos las actividades de la visita.");
	});

	// Cambiar de modo no debe obligar a reescribir lo que ya se dictó.
	test("al pasar a campos, lo escrito se reparte", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Visita de seguimiento\nComentarios: quiere paquetes" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("tab", { name: "Campo por campo" }));
		});
		expect(screen.getByLabelText("Actividades")).toHaveValue("Visita de seguimiento");
		expect(screen.getByLabelText("Comentarios del médico")).toHaveValue("quiere paquetes");
	});

	test("una visita ya registrada se reabre con su texto", async () => {
		await mostrar({
			modo: "libre",
			visita: { id_visita: "v1", captura_libre: "Actividades: Entrega\nSeguimiento: Llamar" },
		});
		expect(screen.getByLabelText("Lo que pasó en la visita")).toHaveValue(
			"Actividades: Entrega\nSeguimiento: Llamar",
		);
	});
});

describe("Texto libre sin etiquetas", () => {
	const dictado =
		"Se presentaron los servicios de laboratorio e imagen y se dejaron órdenes. " +
		"Mostró interés en el convenio y pidió precios de resonancia. " +
		"Recibe representantes los miércoles. Dar seguimiento en 15 días.";

	// Lo que ella pidió: escribir de corrido, sin marcar nada, y que el sistema
	// reconozca qué es qué.
	test("reparte el dictado sin una sola etiqueta", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: dictado },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		const guardada = mockGuardarVisita.mock.calls[0][0];
		expect(guardada.actividades).toContain("Se presentaron los servicios");
		expect(guardada.comentarios_medico).toContain("Mostró interés");
		expect(guardada.observaciones).toContain("Recibe representantes");
		expect(guardada.seguimiento).toContain("Dar seguimiento en 15 días");
	});

	// Sin ver dónde cayó cada frase el reparto no es confiable.
	test("enseña el reparto antes de guardar", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: dictado },
		});
		const previa = screen.getByText("Así va a quedar en el informe").closest("div");
		expect(previa).toHaveTextContent("Comentarios del médico: Mostró interés");
		expect(previa).toHaveTextContent("Seguimiento: Dar seguimiento en 15 días");
	});

	test("sin escribir nada no hay vista previa", async () => {
		await mostrar({ modo: "libre" });
		expect(screen.queryByText("Así va a quedar en el informe")).not.toBeInTheDocument();
	});

	// La etiqueta sigue sirviendo cuando el reparto no acierta.
	test("la etiqueta escrita a mano manda sobre el reparto", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Observaciones: Mostró interés y pidió precios" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		const guardada = mockGuardarVisita.mock.calls[0][0];
		expect(guardada.observaciones).toBe("Mostró interés y pidió precios");
		expect(guardada.comentarios_medico).toBe("");
	});
});

describe("Acomodar el dictado con IA", () => {
	const dictado = "Se dejaron órdenes. No fue posible abordarlo. Quedó de mandarme su base de datos.";

	test("usa lo que devolvió la IA para la vista previa y para guardar", async () => {
		mockClasificar.mockResolvedValue({
			fuente: "ia",
			desglose: {
				actividades: "Se dejaron órdenes.",
				comentarios_medico: "Quedó de mandarme su base de datos.",
				observaciones: "No fue posible abordarlo.",
				seguimiento: "",
				tipo_convenio: "",
			},
		});
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), { target: { value: dictado } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Acomodar con IA" }));
		});
		expect(screen.getByText(/acomodado con IA/)).toBeInTheDocument();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ observaciones: "No fue posible abordarlo." }),
		);
	});

	// Sin señal o sin llave configurada, registrar la visita no se detiene.
	test("si la IA no contesta, avisa y se queda el reparto local", async () => {
		mockClasificar.mockResolvedValue({
			fuente: "local",
			motivo: "Sin conexión",
			desglose: { actividades: dictado, comentarios_medico: "", observaciones: "", seguimiento: "", tipo_convenio: "" },
		});
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), { target: { value: dictado } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Acomodar con IA" }));
		});
		expect(screen.getByText(/No se pudo acomodar con IA/)).toBeInTheDocument();
	});

	// Seguir escribiendo después de acomodar dejaría guardado un reparto que ya
	// no corresponde al texto.
	test("cambiar el texto descarta lo que había acomodado", async () => {
		mockClasificar.mockResolvedValue({
			fuente: "ia",
			desglose: { actividades: "Se dejaron órdenes.", comentarios_medico: "", observaciones: "", seguimiento: "", tipo_convenio: "" },
		});
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), { target: { value: dictado } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Acomodar con IA" }));
		});
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: `${dictado} Dar seguimiento en 15 días.` },
		});
		expect(screen.queryByText(/acomodado con IA/)).not.toBeInTheDocument();
	});

	test("no se llama a la IA sola: sólo cuando se pide", async () => {
		await mostrar({ modo: "libre" });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), { target: { value: dictado } });
		expect(mockClasificar).not.toHaveBeenCalled();
	});
});
