// El tipo de estudio decide la columna del calendario. Una cita agendada en la
// columna equivocada se corrige desde la edición, sin tener que elegir antes
// una empresa, y arrastrada a otra columna pide elegir el estudio del tipo
// nuevo. La duración sigue a los estudios: una hora por resonancia.
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("./nueva-cita-modal.css", () => ({}));

const mockUpdate = jest.fn();

jest.mock("../lib/supabase-client", () => {
	const datosPorTabla = {
		empresas: [],
		estudios_lab_catalogo: [],
		paquetes: [],
		tipos_estudio: [
			{ id_tipo_estudio: 9, nombre: "Tomografia" },
			{ id_tipo_estudio: 11, nombre: "Resonancia" },
		],
		estudios_imagen_catalogo: [
			{ id: 7, clave: "TAC-CR", descripcion: "TAC DE CRANEO SIMPLE", modalidad: "tomografia", area: "Tomografia" },
			{ id: 8, clave: "RM-CR", descripcion: "RM DE CRANEO", modalidad: "resonancia", area: "Resonancia" },
			{ id: 9, clave: "RM-ROD", descripcion: "RM DE RODILLA", modalidad: "resonancia", area: "Resonancia" },
		],
		precios_estudios: [],
	};
	const crearCadena = (tabla) => {
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			range: jest.fn(() => cadena),
			ilike: jest.fn(() => cadena),
			update: jest.fn((payload) => {
				mockUpdate(payload);
				return cadena;
			}),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			single: jest.fn(() => Promise.resolve({ data: null, error: null })),
			then: (resolve) => Promise.resolve({ data: datosPorTabla[tabla] || [], error: null }).then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

jest.mock("../utils/clientes-seleccionables", () => ({
	consultarClientesSeleccionables: jest.fn(() => Promise.resolve({ data: [], error: null })),
}));

import EditarCitaModal from "./editar-cita-modal";

const CITA = {
	id_cita: 15,
	nombre_paciente: "JUAN PEREZ",
	tipo_estudio: "TAC DE CRANEO SIMPLE",
	fecha_estudio: "2026-11-20T09:00:00",
	estado: "pendiente",
	id_tipo_estudio: 9,
};

const abrir = async (props = {}) => {
	await act(async () => {
		render(<EditarCitaModal isOpen cita={CITA} onClose={jest.fn()} onCitaActualizada={jest.fn()} {...props} />);
	});
};

const buscar = (texto) => {
	fireEvent.change(screen.getByPlaceholderText("Buscar estudio para agregar..."), { target: { value: texto } });
};

const duracion = () => screen.getByTestId("cita-duracion-valor").textContent;

beforeEach(() => mockUpdate.mockClear());

test("el tipo de estudio se puede cambiar sin elegir empresa y se guarda", async () => {
	await abrir();
	const tipo = screen.getByRole("combobox", { name: "Tipo de estudio" });
	expect(tipo).not.toBeDisabled();
	expect(tipo).toHaveValue("9");

	fireEvent.change(tipo, { target: { value: "11" } });
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
	});

	expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id_tipo_estudio: 11 }));
});

test("con un tipo elegido la búsqueda sólo ofrece sus estudios", async () => {
	await abrir();
	buscar("craneo");
	expect(screen.getByRole("option", { name: /TAC DE CRANEO SIMPLE/ })).toBeInTheDocument();
	expect(screen.queryByRole("option", { name: /RM DE CRANEO/ })).not.toBeInTheDocument();
});

test("arrastrada a otra columna: toma el tipo, vacía los estudios y pide elegir uno", async () => {
	await abrir({ cambio: { tipoEstudio: "Resonancia", columna: "Resonancia", fecha_estudio: "2026-11-20T10:30:00" } });

	expect(screen.getByText(/La cita pasa a Resonancia: elige qué estudio es./)).toBeInTheDocument();
	expect(screen.getByRole("combobox", { name: "Tipo de estudio" })).toHaveValue("11");
	expect(document.querySelector(".estudio-item")).toBeNull();
	expect(screen.getByDisplayValue("10:30")).toBeInTheDocument();

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
	});
	expect(mockUpdate).not.toHaveBeenCalled();
	expect(screen.getByText("Elige qué estudio de Resonancia es la cita")).toBeInTheDocument();

	// Elegir dos resonancias pone la cita en dos horas.
	buscar("rm de");
	await act(async () => {
		fireEvent.click(screen.getByRole("option", { name: /RM DE CRANEO/ }));
	});
	expect(duracion()).toBe("1 h");
	buscar("rodilla");
	await act(async () => {
		fireEvent.click(screen.getByRole("option", { name: /RM DE RODILLA/ }));
	});
	expect(duracion()).toBe("2 h");

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
	});
	expect(mockUpdate).toHaveBeenCalledWith(
		expect.objectContaining({
			id_tipo_estudio: 11,
			tipo_estudio: "RM DE CRANEO, RM DE RODILLA",
			fecha_estudio: "2026-11-20T10:30:00-06:00",
			duracion_minutos: 120,
		}),
	);
});

test("abrir una cita guardada no le cambia la duración, pero avisa cuál corresponde", async () => {
	await abrir({ cita: { ...CITA, tipo_estudio: "TAC DE CRANEO SIMPLE, RM DE CRANEO", duracion_minutos: 30 } });

	expect(duracion()).toBe("30 min");
	expect(screen.getByText(/Por los estudios corresponden 1 h 30 min/)).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Usar 1 h 30 min" }));
	expect(duracion()).toBe("1 h 30 min");
});

test("la duración se alarga a mano de media en media hora", async () => {
	await abrir();
	fireEvent.click(screen.getByRole("button", { name: "Media hora más" }));
	fireEvent.click(screen.getByRole("button", { name: "Media hora más" }));
	expect(duracion()).toBe("1 h 30 min");

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
	});
	expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ duracion_minutos: 90 }));
});
