import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("./historial.css", () => ({}));

jest.mock("../../../assets/lupaIcono.png", () => "lupaIcono.png");
jest.mock("../../../assets/notaIcono.png", () => "notaIcono.png");
jest.mock("../../../assets/pacienteIcono.png", () => "pacienteIcono.png");
jest.mock("../../../assets/calendarioIcono.png", () => "calendarioIcono.png");

jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "user-123", email: "test@test.com" } }),
}));

const pacienteImagen = {
	id_paciente: 25,
	nombre: "PALOMA MORO MIER",
	sexo: "F",
	fecha_nacimiento: "1990-01-01",
	telefono: null,
	email: null,
};

const estudioRadiologia = {
	id_estudio: 16,
	id_venta: null,
	tipo_estudio: "US",
	descripcion: "DX",
	estado: "recibido",
	fecha_estudio: "2026-07-14T21:30:00Z",
};

jest.mock("../../../lib/supabase-client", () => {
	const createChain = (table) => {
		const state = { eq: {} };
		const chain = {
			select: jest.fn(() => chain),
			limit: jest.fn(() => chain),
			eq: jest.fn((field, value) => {
				state.eq[field] = value;
				return chain;
			}),
			ilike: jest.fn(() => Promise.resolve({ data: [pacienteImagen], error: null })),
			or: jest.fn(() => Promise.resolve({ data: [pacienteImagen], error: null })),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			order: jest.fn(() => {
				if (table === "ventas") return Promise.resolve({ data: [], error: null });
				if (table === "estudios_radiologia" && state.eq.id_paciente === 25) {
					return Promise.resolve({ data: [estudioRadiologia], error: null });
				}
				if (table === "estudios_radiologia") {
					return Promise.resolve({ data: [], error: null });
				}
				return Promise.resolve({ data: [], error: null });
			}),
		};
		return chain;
	};

	return {
		supabase: {
			from: jest.fn((table) => createChain(table)),
		},
	};
});

import Historial from "./historial";

describe("Historial", () => {
	beforeEach(() => jest.clearAllMocks());

	test("muestra estudios de radiologia directos en el historial del paciente", async () => {
		await act(async () => {
			render(<Historial />);
		});

		fireEvent.change(screen.getByPlaceholderText("Buscar Cliente..."), {
			target: { value: "Paloma" },
		});

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
		});

		expect(await screen.findByText("IMG-16")).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(screen.getByText("IMG-16"));
		});

		expect(screen.getByText("US - DX")).toBeInTheDocument();
		expect(
			screen.getByText("Estudio de imagen registrado en radiología"),
		).toBeInTheDocument();
		const visorLink = screen.getByRole("link", { name: "Abrir visor" });
		expect(visorLink).toHaveAttribute("href", "/visor-paciente/16");
		expect(visorLink).toHaveAttribute("target", "_blank");
		expect(visorLink).toHaveAttribute("rel", "noopener noreferrer");
	});

	// Igual que en editar solicitud: el ícono de calendario deja elegir un día
	// y la tabla se queda con las visitas de esa fecha.
	test("el ícono de calendario filtra las visitas por día", async () => {
		await act(async () => {
			render(<Historial />);
		});
		fireEvent.change(screen.getByPlaceholderText("Buscar Cliente..."), {
			target: { value: "Paloma" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
		});
		expect(await screen.findByText("IMG-16")).toBeInTheDocument();

		const elegirDia = (iso) => {
			fireEvent.click(screen.getByRole("button", { name: "Filtrar visitas por día" }));
			for (let intento = 0; intento < 36 && !screen.queryByLabelText(iso); intento += 1) {
				fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
			}
			fireEvent.click(screen.getByLabelText(iso));
		};

		elegirDia("2026-07-13");
		expect(screen.queryByText("IMG-16")).not.toBeInTheDocument();
		expect(screen.getByText("Sin visitas en ese día")).toBeInTheDocument();

		elegirDia("2026-07-14");
		expect(screen.getByText("IMG-16")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Quitar filtro de día" }));
		expect(screen.getByText("IMG-16")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Quitar filtro de día" })).not.toBeInTheDocument();
	});
});
