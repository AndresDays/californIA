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

const CLIENTES = [{ id_cliente: 7, nombre: "Particular" }];
const EMPRESAS = [
	{ id_empresa: 1, nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	{ id_empresa: 2, nombre: "CENTRO DE DIAGNOSTICO POR IMAGEN PVR" },
];
const TIPOS = [
	{
		id_empresa: 2,
		id_tipo_estudio: 4,
		tipos_estudio: { id_tipo_estudio: 4, nombre: "TOMOGRAFIA" },
	},
	{
		id_empresa: 1,
		id_tipo_estudio: 9,
		tipos_estudio: { id_tipo_estudio: 9, nombre: "LABORATORIO" },
	},
];
const ESTUDIOS_LAB = [
	{ id: 11, clave: "TRAC", descripcion: "TACROLIMUS", area: "Quimica" },
];
const ESTUDIOS_IMAGEN = [
	{
		id: 21,
		id_empresa: 2,
		clave: "TAC-CRANEO-SIMPLE",
		descripcion: "TAC DE CRANEO SIMPLE",
		empresa_operativa: "CDI",
		modalidad: "tomografia",
		area: "Imagen",
	},
];

// Cada tabla responde a la cadena de llamadas que el modal arma; se devuelve el
// mismo objeto para que el orden de select/eq/order no importe.
const respuestaDeTabla = (tabla) => {
	const datos = {
		clientes: CLIENTES,
		empresas: EMPRESAS,
		empresa_tipos_estudio: TIPOS,
		estudios_lab_catalogo: ESTUDIOS_LAB,
		estudios_imagen_catalogo: ESTUDIOS_IMAGEN,
		precios_estudios: [],
		convenios_facturacion: [],
	}[tabla] ?? [];

	const consulta = {
		select: () => consulta,
		eq: () => consulta,
		ilike: () => consulta,
		order: () => Promise.resolve({ data: datos, error: null }),
		range: () => Promise.resolve({ data: datos, error: null }),
		maybeSingle: () => Promise.resolve({ data: null, error: null }),
		then: (resolver) => Promise.resolve({ data: datos, error: null }).then(resolver),
	};
	return consulta;
};

jest.mock("../lib/supabase-client", () => ({
	supabase: { from: (tabla) => respuestaDeTabla(tabla) },
}));

import NuevaCitaModal from "./nueva-cita-modal";

const abrirModal = () =>
	render(<NuevaCitaModal isOpen onClose={jest.fn()} fechaInicial="2026-08-27" horaInicial="10:00" />);

describe("NuevaCitaModal: la busqueda ofrece el catalogo de imagen", () => {
	// La cita se agendaba solo con el catálogo de laboratorio, así que buscar
	// "TAC" con tomografía elegida devolvía tacrolimus y no el estudio de imagen.
	test("con tomografia elegida aparece el estudio de imagen y no el de laboratorio", async () => {
		abrirModal();

		const selects = await screen.findAllByRole("combobox");
		const [selectEmpresa, selectCliente, selectTipo] = selects;

		fireEvent.change(selectEmpresa, { target: { value: "2" } });
		await waitFor(() => expect(selectCliente).not.toBeDisabled());

		fireEvent.change(selectCliente, { target: { value: "7" } });
		await waitFor(() =>
			expect(screen.getByRole("option", { name: "TOMOGRAFIA" })).toBeInTheDocument(),
		);

		fireEvent.change(selectTipo, { target: { value: "4" } });
		fireEvent.change(screen.getByPlaceholderText("Buscar estudio para agregar..."), {
			target: { value: "TAC" },
		});

		expect(await screen.findByText(/TAC DE CRANEO SIMPLE/)).toBeInTheDocument();
		expect(screen.queryByText(/TACROLIMUS/)).not.toBeInTheDocument();
	});

	// Los tipos ofrecidos dependen del convenio del cliente, no solo de la
	// empresa: sin cliente elegido no hay con qué resolverlos.
	test("el tipo de estudio no se puede elegir antes que el cliente", async () => {
		abrirModal();

		const selects = await screen.findAllByRole("combobox");
		expect(selects[2]).toBeDisabled();
		expect(
			screen.getByRole("option", { name: "Primero selecciona un Cliente" }),
		).toBeInTheDocument();
	});
});
