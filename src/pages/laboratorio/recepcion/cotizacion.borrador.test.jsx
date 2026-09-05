// Lo capturado en cotización tiene que seguir ahí al volver de otra pestaña, y
// la descripción de cada estudio de la tabla abre su detalle.
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: ({ isOpen, mensaje }) => (isOpen ? <div role="alert">{mensaje}</div> : null),
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "user-123" } }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../../utils/generar-pdf-cotizacion", () => ({
	generarPDFCotizacion: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../lib/supabase-client", () => {
	const cadena = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		order: jest.fn().mockResolvedValue({ data: [], error: null }),
		single: jest.fn().mockResolvedValue({ data: null, error: null }),
		insert: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
	};
	return { supabase: { from: jest.fn(() => cadena) } };
});

import Cotizacion from "./cotizacion";

const PREFIJO = "california:borrador:cotizacion:";
const guardar = (clave, valor) =>
	sessionStorage.setItem(`${PREFIJO}${clave}`, JSON.stringify(valor));

const renderCotizacion = async () => {
	await act(async () => {
		render(<Cotizacion />);
	});
};

describe("Cotización — borrador y detalle del estudio", () => {
	beforeEach(() => {
		sessionStorage.clear();
		jest.clearAllMocks();
	});

	test("recupera lo capturado al volver a la pantalla", async () => {
		guardar("nombrePaciente", "JUAN PEREZ");
		guardar("condiciones", "En ayunas");
		guardar("empresa", "7");
		guardar("cliente", "3");
		guardar("tipoEstudio", "5");

		await renderCotizacion();

		expect(screen.getByPlaceholderText("Nombre del Paciente")).toHaveValue("JUAN PEREZ");
		expect(screen.getByPlaceholderText(/Ejemplo: Paciente en ayunas/i)).toHaveValue("En ayunas");
		// Los catálogos llegan vacíos en la prueba, así que lo que se comprueba es
		// que el borrador no se borró solo al montar la pantalla.
		expect(sessionStorage.getItem(`${PREFIJO}cliente`)).toBe('"3"');
		expect(sessionStorage.getItem(`${PREFIJO}tipoEstudio`)).toBe('"5"');
		expect(sessionStorage.getItem(`${PREFIJO}empresa`)).toBe('"7"');
	});

	test("guarda en el borrador lo que se escribe", async () => {
		await renderCotizacion();

		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText("Nombre del Paciente"), {
				target: { value: "ANA LOPEZ" },
			});
		});

		expect(sessionStorage.getItem(`${PREFIJO}nombrePaciente`)).toBe('"ANA LOPEZ"');
	});

	test("la descripción del estudio abre el detalle", async () => {
		guardar("estudios", [
			{
				id: 1,
				clave: "BH",
				descripcion: "BIOMETRIA HEMATICA",
				precio: 150,
				tipo: "Laboratorio",
				diasProceso: 1,
				area: "Hematología",
			},
		]);

		await renderCotizacion();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /Ver detalle de BIOMETRIA HEMATICA/i }));
		});

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Detalle del estudio")).toBeInTheDocument();
		expect(screen.getByText("Hematología")).toBeInTheDocument();
	});
});
