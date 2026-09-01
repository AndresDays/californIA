import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./cotizacion.css", () => ({}));
jest.mock("../../../assets/empresaIcono.png", () => "empresaIcono.png");
jest.mock("../../../assets/pacienteIcono.png", () => "pacienteIcono.png");
jest.mock("../../../assets/enviarEmailBtn.png", () => "enviarEmailBtn.png");
jest.mock("../../../assets/enviarWppBtn.png", () => "enviarWppBtn.png");
jest.mock("../../../assets/guardarBtn.png", () => "guardarBtn.png");
jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));
jest.mock("../../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { nombre: "Recepcion", id_sucursal: 1 },
		formatRol: () => "Recepcionista",
		getPrimerNombre: () => "Recepcion",
	}),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../../utils/generar-pdf-cotizacion", () => ({
	generarPDFCotizacion: jest.fn(),
}));

// El cliente elegido dispara la carga de sus reglas de convenio. Esa carga es
// justo la que provocaba el parpadeo, así que aquí devuelve reglas de verdad:
// con una lista vacía el estado no cambiaría y el fallo no se reproduciría.
jest.mock("../../../utils/convenios-facturacion", () => ({
	cargarReglasConvenio: jest.fn(() =>
		Promise.resolve([{ modalidad: "*", empresa: "CDC" }]),
	),
	resolverEmpresaFacturaEstudio: jest.fn(() => "CDC"),
}));

jest.mock("../../../utils/precio-estudio-cliente", () => ({
	cargarPreciosCliente: jest.fn(() => Promise.resolve({})),
	clienteParaPrecios: (nombre) => nombre,
	precioParaCliente: () => 150,
}));

const EMPRESAS = [
	{ id_empresa: 1, nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	{ id_empresa: 2, nombre: "CENTRO DE DIAGNOSTICO POR IMAGEN PVR" },
];
const CLIENTES = [
	{ id_cliente: 7, nombre: "IMSS" },
	{ id_cliente: 9, nombre: "Particular" },
];

const datosDeTabla = (tabla) =>
	({
		empresas: EMPRESAS,
		clientes: CLIENTES,
		empresa_tipos_estudio: [],
		cotizaciones: [],
		estudios_lab_catalogo: [],
		estudios_imagen_catalogo: [],
	})[tabla] ?? [];

jest.mock("../../../lib/supabase-client", () => ({
	supabase: {
		from: (tabla) => {
			const consulta = {
				select: () => consulta,
				eq: () => consulta,
				ilike: () => consulta,
				gte: () => consulta,
				lte: () => consulta,
				limit: () => consulta,
				range: () => Promise.resolve({ data: datosDeTabla(tabla), error: null }),
				not: () => consulta,
				or: () => consulta,
				insert: () => consulta,
				single: () => Promise.resolve({ data: null, error: null }),
				maybeSingle: () => Promise.resolve({ data: null, error: null }),
				order: () => Promise.resolve({ data: datosDeTabla(tabla), error: null }),
				then: (resolver) =>
					Promise.resolve({ data: datosDeTabla(tabla), error: null }).then(resolver),
			};
			return consulta;
		},
	},
}));

import Cotizacion from "./cotizacion";

const abrir = async () => {
	await act(async () => {
		render(<Cotizacion />);
	});
};

const selectDe = (nombreOpcion) =>
	[...document.querySelectorAll("select")].find((select) =>
		[...select.options].some((opcion) => opcion.textContent === nombreOpcion),
	);

describe("Cotizacion: el cliente elegido se queda puesto", () => {
	// El efecto que limpia lo que cuelga de la empresa escuchaba tambien a
	// reglasConvenio. Al elegir cliente se cargaban sus reglas, ese estado
	// cambiaba y el efecto volvia a correr borrando el cliente: se ponia y se
	// quitaba solo.
	test("elegir empresa y luego cliente no borra el cliente", async () => {
		await abrir();

		const selectEmpresa = selectDe("CENTRAL DIAGNOSTICA CALIFORNIA");
		expect(selectEmpresa).toBeDefined();
		await act(async () => {
			fireEvent.change(selectEmpresa, { target: { value: "1" } });
		});

		const selectCliente = selectDe("IMSS");
		expect(selectCliente).toBeDefined();
		await act(async () => {
			fireEvent.change(selectCliente, { target: { value: "7" } });
		});

		// Se espera a que las reglas del convenio terminen de cargar, que es el
		// momento exacto en el que antes se perdia la seleccion.
		await waitFor(() => {
			expect(selectDe("IMSS").value).toBe("7");
		});
		expect(selectDe("IMSS").value).toBe("7");
	});

	test("cambiar de empresa si limpia el cliente", async () => {
		await abrir();

		const selectEmpresa = selectDe("CENTRAL DIAGNOSTICA CALIFORNIA");
		await act(async () => {
			fireEvent.change(selectEmpresa, { target: { value: "1" } });
		});
		await act(async () => {
			fireEvent.change(selectDe("IMSS"), { target: { value: "7" } });
		});
		await waitFor(() => expect(selectDe("IMSS").value).toBe("7"));

		await act(async () => {
			fireEvent.change(selectEmpresa, { target: { value: "2" } });
		});

		expect(selectDe("IMSS").value).toBe("");
	});
});
