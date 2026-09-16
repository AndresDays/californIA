import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

jest.mock("./cotizacion.css", () => ({}));
jest.mock("../../../assets/empresaIcono.png", () => "empresaIcono.png");
jest.mock("../../../assets/pacienteIcono.png", () => "pacienteIcono.png");
jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "user-1" }, empleadoData: { nombre: "Ana", rol: "recepcionista" } }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));

jest.mock("../../../utils/generar-pdf-cotizacion", () => ({
	generarPDFCotizacion: jest.fn().mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" })),
	crearNombreArchivoCotizacion: (numero) => `Cotizacion ${numero}.pdf`,
}));

const COTIZACION = {
	id_cotizacion: 1,
	numero_cotizacion: "COT-01",
	nombre_paciente: "Ana Ruiz",
	fecha_cotizacion: "2026-09-12T18:00:00Z",
	total: 500,
	descuento: 0,
	descuento_porcentaje: 0,
	condiciones_paciente: "Paciente en ayunas de 8 horas",
	estudios: JSON.stringify([{ descripcion: "BIOMETRIA HEMATICA", precio: 500 }]),
};

jest.mock("../../../lib/supabase-client", () => {
	const cadena = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		single: jest.fn().mockResolvedValue({ data: {}, error: null }),
		order: jest.fn(),
	};
	return { supabase: { from: jest.fn(() => cadena), __cadena: cadena } };
});

import Cotizacion from "./cotizacion";
import { supabase } from "../../../lib/supabase-client";
import { generarPDFCotizacion } from "../../../utils/generar-pdf-cotizacion";

const renderCotizacion = async () => {
	supabase.__cadena.order.mockResolvedValue({ data: [COTIZACION], error: null });
	await act(async () => {
		render(<Cotizacion />);
	});
};

beforeEach(() => {
	jest.clearAllMocks();
	sessionStorage.clear();
});

test("el ticket lleva las condiciones capturadas en la cotización", async () => {
	await renderCotizacion();

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Ver" }));
	});

	expect(generarPDFCotizacion).toHaveBeenCalledWith(
		expect.objectContaining({ condiciones: "Paciente en ayunas de 8 horas" }),
	);
});

test("una cotización sin condiciones no manda nada al ticket", async () => {
	supabase.__cadena.order.mockResolvedValue({
		data: [{ ...COTIZACION, condiciones_paciente: null }],
		error: null,
	});
	await act(async () => {
		render(<Cotizacion />);
	});

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Ver" }));
	});

	expect(generarPDFCotizacion).toHaveBeenCalledWith(
		expect.objectContaining({ condiciones: "" }),
	);
});

// Las condiciones se guardan con la cotización y también se piden al leerla
// del historial: sin la columna en la consulta el ticket salía sin ellas.
test("el historial trae la columna de condiciones", async () => {
	await renderCotizacion();

	const consulta = supabase.__cadena.select.mock.calls
		.map(([columnas]) => String(columnas))
		.find((columnas) => columnas.includes("numero_cotizacion"));

	expect(consulta).toContain("condiciones_paciente");
});
