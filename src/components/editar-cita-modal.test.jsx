// Al editar una cita, sus estudios se resolvían sólo contra el catálogo de
// laboratorio: una tomografía quedaba como "N/A" al precio por defecto de $150
// aunque el convenio la tuviera pactada, y ni eligiendo cliente, empresa y tipo
// se recotizaba.
import React from "react";
import { act, render, screen } from "@testing-library/react";

jest.mock("./nueva-cita-modal.css", () => ({}));

const PRECIOS = [
	{ cliente: "SSA", clave: "TAC-CR", descripcion: "TAC DE CRANEO SIMPLE", precio: 1200 },
	{ cliente: "Particular", clave: "TAC-CR", descripcion: "TAC DE CRANEO SIMPLE", precio: 2500 },
];

jest.mock("../lib/supabase-client", () => {
	const datosPorTabla = {
		empresas: [{ id_empresa: 2, nombre: "CENTRO DE DIAGNOSTICO POR IMAGEN PVR" }],
		estudios_lab_catalogo: [
			{ id: 1, clave: "BH", descripcion: "BIOMETRIA HEMATICA", area: "Hematologia", dias_proceso: 1 },
		],
		paquetes: [],
		estudios_imagen_catalogo: [
			{
				id: 7,
				id_empresa: 2,
				clave: "TAC-CR",
				descripcion: "TAC DE CRANEO SIMPLE",
				empresa_operativa: "CDI",
				modalidad: "tomografia",
				area: "Tomografia",
				dias_proceso: 1,
			},
		],
		empresa_tipos_estudio: [
			{
				id_tipo_estudio: 9,
				tipos_estudio: { id_tipo_estudio: 9, nombre: "TOMOGRAFIA" },
			},
		],
		precios_estudios: PRECIOS,
		clientes: [{ id_cliente: 4, nombre: "SSA" }],
	};

	const crearCadena = (tabla) => {
		const filtros = [];
		const resolver = () => {
			let datos = datosPorTabla[tabla] || [];
			if (tabla === "precios_estudios") {
				filtros.forEach(([columna, valor]) => {
					const limpio = String(valor).replace(/%/g, "").toLowerCase();
					datos = datos.filter(
						(fila) => String(fila[columna] ?? "").toLowerCase() === limpio,
					);
				});
			}
			return Promise.resolve({ data: datos, error: null });
		};
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			range: jest.fn(() => cadena),
			ilike: jest.fn((columna, valor) => {
				filtros.push([columna, valor]);
				return cadena;
			}),
			update: jest.fn(() => cadena),
			maybeSingle: jest.fn(() => resolver().then(({ data }) => ({ data: data[0] ?? null, error: null }))),
			single: jest.fn(() => resolver().then(({ data }) => ({ data: data[0] ?? null, error: null }))),
			then: (resolve) => resolver().then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

jest.mock("../utils/clientes-seleccionables", () => ({
	consultarClientesSeleccionables: jest.fn(() =>
		Promise.resolve({ data: [{ id_cliente: 4, nombre: "SSA" }], error: null }),
	),
}));

import EditarCitaModal from "./editar-cita-modal";

const CITA = {
	id_cita: 15,
	nombre_paciente: "JUAN PEREZ",
	telefono_paciente: "3225897848",
	tipo_estudio: "TAC DE CRANEO SIMPLE",
	fecha_estudio: "2026-09-26T08:00:00-06:00",
	estado: "pendiente",
	id_cliente: 4,
	id_empresa: 2,
	id_tipo_estudio: 9,
};

const abrirModal = async (cita = CITA) => {
	await act(async () => {
		render(
			<EditarCitaModal
				isOpen
				cita={cita}
				onClose={jest.fn()}
				onCitaActualizada={jest.fn()}
			/>,
		);
	});
};

const totalMostrado = () => document.querySelector(".total-precio")?.textContent;
const claveMostrada = () => document.querySelector(".estudio-clave")?.textContent;

test("un estudio de imagen se cotiza con el precio del convenio", async () => {
	await abrirModal();

	expect(claveMostrada()).toBe("TAC-CR");
	expect(screen.getAllByText("$1200.00").length).toBeGreaterThan(0);
	expect(totalMostrado()).toBe("$1200.00");
});

test("un estudio escrito a mano se cotiza por su descripción", async () => {
	await abrirModal({ ...CITA, tipo_estudio: "tac de craneo simple " });

	// Aunque venga con otra capitalización, cruza con el catálogo y cobra lo
	// pactado en lugar del precio por defecto.
	expect(totalMostrado()).toBe("$1200.00");
});
