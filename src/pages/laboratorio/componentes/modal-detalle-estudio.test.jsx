import React from "react";
import { act, render, screen, within } from "@testing-library/react";

jest.mock("./modal-detalle-estudio.css", () => ({}));

const renglonesPorPaquete = {
	12: [
		{ id: 1, orden: 1, estudios_lab_catalogo: { id: 30, clave: "T3", descripcion: "TRIYODOTIRONINA" } },
		{ id: 2, orden: 2, estudios_lab_catalogo: { id: 31, clave: "T4", descripcion: "TIROXINA" } },
		{ id: 3, orden: 3, estudios_lab_catalogo: { id: 32, clave: "TSH", descripcion: "HORMONA ESTIMULANTE DE TIROIDES" } },
	],
};

const idPaqueteConsultado = { current: null };

jest.mock("../../../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(() => {
			const cadena = {
				select: jest.fn(() => cadena),
				eq: jest.fn((_columna, valor) => {
					idPaqueteConsultado.current = valor;
					return cadena;
				}),
				order: jest.fn(() =>
					Promise.resolve({
						data: renglonesPorPaquete[idPaqueteConsultado.current] || [],
						error: null,
					}),
				),
			};
			return cadena;
		}),
	},
}));

import ModalDetalleEstudio from "./modal-detalle-estudio";

const PERFIL = {
	id: "paquete-12",
	id_catalogo: 12,
	es_paquete: true,
	clave: "PTIR",
	descripcion: "PERFIL TIROIDEO",
	area: "Paquetes",
};

const mostrar = async (estudio) => {
	await act(async () => {
		render(<ModalDetalleEstudio estudio={estudio} onClose={jest.fn()} />);
	});
};

beforeEach(() => {
	idPaqueteConsultado.current = null;
});

// Recepción tiene que poder decirle al paciente qué trae el perfil sin salirse
// de la captura: el renglón sólo dice "PERFIL TIROIDEO".
test("un paquete enseña los estudios que incluye", async () => {
	await mostrar(PERFIL);

	const detalle = screen.getByRole("dialog");
	expect(within(detalle).getByText("Detalle del paquete")).toBeInTheDocument();
	expect(within(detalle).getByText("Estudios que incluye (3)")).toBeInTheDocument();
	expect(within(detalle).getByText("TRIYODOTIRONINA")).toBeInTheDocument();
	expect(within(detalle).getByText("TIROXINA")).toBeInTheDocument();
	expect(within(detalle).getByText("HORMONA ESTIMULANTE DE TIROIDES")).toBeInTheDocument();
	expect(within(detalle).getByText("TSH")).toBeInTheDocument();
});

test("un paquete sin estudios dados de alta lo dice", async () => {
	await mostrar({ ...PERFIL, id_catalogo: 99, descripcion: "PAQUETE VACIO" });

	expect(screen.getByText("Este paquete no tiene estudios dados de alta.")).toBeInTheDocument();
});

test("un estudio suelto no pide la lista ni la enseña", async () => {
	await mostrar({
		id: "laboratorio-30",
		id_catalogo: 30,
		clave: "BH",
		descripcion: "BIOMETRIA HEMATICA",
		tipo_muestra: "Sangre total",
	});

	expect(screen.getByText("Detalle del estudio")).toBeInTheDocument();
	expect(screen.queryByText(/Estudios que incluye/)).not.toBeInTheDocument();
	expect(idPaqueteConsultado.current).toBeNull();
});
