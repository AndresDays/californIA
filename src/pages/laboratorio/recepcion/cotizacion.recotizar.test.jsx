import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("./cotizacion.css", () => ({}));
jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: ({ isOpen, mensaje }) => (isOpen ? <div role="alert">{mensaje}</div> : null),
}));
jest.mock("../../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { id_empleado: 1, nombre: "Recep", rol: "recepcionista" },
		formatRol: (r) => r,
		getPrimerNombre: () => "Recep",
	}),
}));
jest.mock("../../../utils/generar-pdf-cotizacion", () => ({
	crearNombreArchivoCotizacion: jest.fn(() => "cot.pdf"),
	generarPDFCotizacion: jest.fn().mockResolvedValue(undefined),
}));

// Los dos convenios tienen pactada la misma biometría a distinto precio: es lo
// que tiene que cambiar en el renglón al cambiar el select de cliente.
jest.mock("../../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		clientes: [
			{ id_cliente: 1, nombre: "IMSS" },
			{ id_cliente: 2, nombre: "ISSSTE" },
			{ id_cliente: 3, nombre: "20%" },
			{ id_cliente: 4, nombre: "Particular" },
		],
		empresas: [{ id_empresa: 2, nombre: "CDI" }],
		empresa_tipos_estudio: [
			{
				id_empresa: 2,
				id_tipo_estudio: 7,
				tipos_estudio: { id_tipo_estudio: 7, nombre: "Laboratorio" },
			},
		],
		estudios_lab_catalogo: [
			{
				id: 30,
				clave: "BH",
				descripcion: "BIOMETRIA HEMATICA",
				area: "Hematologia",
				dias_proceso: 1,
			},
			{
				id: 31,
				clave: "QS",
				descripcion: "QUIMICA SANGUINEA",
				area: "Quimica",
				dias_proceso: 1,
			},
		],
		estudios_imagen_catalogo: [],
		cotizaciones: [],
		precios_estudios: [
			{ cliente: "IMSS", clave: "BH", descripcion: "BIOMETRIA HEMATICA", precio: 80 },
			{ cliente: "ISSSTE", clave: "BH", descripcion: "BIOMETRIA HEMATICA", precio: 200 },
			{ cliente: "Particular", clave: "BH", descripcion: "BIOMETRIA HEMATICA", precio: 100 },
			{ cliente: "IMSS", clave: "QS", descripcion: "QUIMICA SANGUINEA", precio: 120 },
			{ cliente: "Particular", clave: "QS", descripcion: "QUIMICA SANGUINEA", precio: 150 },
		],
	};

	const crearCadena = (tabla) => {
		const filtros = [];
		const resolver = () => {
			let datos = respuestaPorTabla[tabla] || [];
			if (tabla === "precios_estudios") {
				filtros.forEach(([columna, valor]) => {
					datos = datos.filter(
						(fila) =>
							String(fila[columna] ?? "").toLowerCase() === String(valor).toLowerCase(),
					);
				});
			}
			return Promise.resolve({ data: datos, error: null });
		};
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			or: jest.fn(() => cadena),
			ilike: jest.fn((columna, valor) => {
				filtros.push([columna, valor]);
				return cadena;
			}),
			in: jest.fn(() => cadena),
			gte: jest.fn(() => cadena),
			lte: jest.fn(() => cadena),
			range: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			single: jest.fn(() => Promise.resolve({ data: null, error: null })),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			then: (resolve) => resolver().then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

jest.mock("../../../utils/clientes-seleccionables", () => ({
	consultarClientesSeleccionables: jest.fn(() =>
		Promise.resolve({
			data: [
				{ id_cliente: 1, nombre: "IMSS" },
				{ id_cliente: 2, nombre: "ISSSTE" },
				{ id_cliente: 3, nombre: "20%" },
				{ id_cliente: 4, nombre: "Particular" },
			],
			error: null,
		}),
	),
}));

import Cotizacion from "./cotizacion";

beforeEach(() => {
	sessionStorage.clear();
});

const elegir = async (displayValue, value) => {
	await act(async () => {
		fireEvent.change(screen.getByDisplayValue(displayValue), { target: { value } });
	});
};

const renglonEstudio = () =>
	[...document.querySelectorAll(".tabla-estudios-cot tbody tr")].find((fila) =>
		fila.textContent.includes("BH"),
	);

// Columnas: clave, descripción, tipo, cantidad, precio, días, borrar.
const precioMostrado = () => renglonEstudio()?.querySelectorAll("td")[4]?.textContent;

const cotizarConIMSS = async () => {
	await act(async () => {
		render(<Cotizacion />);
	});

	await elegir("Selecciona una Empresa", "2");
	await elegir("Selecciona un Cliente", "1");
	await elegir("Selecciona tipo de estudio", "7");

	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Busca estudios aquí/i), {
			target: { value: "bio" },
		});
	});
	await act(async () => {
		fireEvent.click(document.querySelector(".search-results-estudios-cot .search-result-item-cot"));
	});
};

const agregarPorBusqueda = async (texto) => {
	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Busca estudios aquí/i), {
			target: { value: texto },
		});
	});
	await act(async () => {
		fireEvent.click(document.querySelector(".search-results-estudios-cot .search-result-item-cot"));
	});
};
const filaDe = (clave) =>
	[...document.querySelectorAll(".tabla-estudios-cot tbody tr")].find((tr) =>
		tr.textContent.includes(clave),
	);
const precioDe = (clave) => filaDe(clave)?.querySelectorAll("td")[4];
const campoPorValor = (selector) => document.querySelector(selector)?.value;
const totalCampo = () => campoPorValor(".input-total-cot");
const totalFinal = () => campoPorValor(".input-total-final-cot");
const descuentoMonto = () => campoPorValor(".input-descuento-cot");
const descuentoPct = () => campoPorValor(".input-descuento-pct-cot");

// Cada renglón se queda con el precio del cliente con que se agregó: cambiar
// de cliente sólo cambia el precio de lo que se agregue después.
describe("Cotización — el precio se queda con su cliente", () => {
	test("cambiar de cliente no recotiza lo ya agregado", async () => {
		await cotizarConIMSS();
		expect(precioMostrado()).toContain("$80.00");

		await elegir("IMSS", "2");

		expect(precioMostrado()).toContain("$80.00");
		expect(totalCampo()).toBe("$80.00");
	});

	test("bajo el precio sale el cliente con que quedó", async () => {
		await cotizarConIMSS();
		expect(precioDe("BH").querySelector(".cliente-precio-cot")).toHaveTextContent("IMSS");

		await elegir("IMSS", "4");
		await agregarPorBusqueda("quim");

		expect(precioDe("BH").querySelector(".cliente-precio-cot")).toHaveTextContent("IMSS");
		expect(precioDe("QS").querySelector(".cliente-precio-cot")).toHaveTextContent("Particular");
	});

	test("el mismo estudio con otro cliente no se suma al renglón", async () => {
		await cotizarConIMSS();
		await elegir("IMSS", "2");
		await agregarPorBusqueda("bio");

		expect(filaDe("BH").querySelector(".cantidad-valor-cot")).toHaveTextContent("1");
		expect(precioMostrado()).toContain("$80.00");
		expect(screen.getByRole("alert")).toHaveTextContent("ya está agregado con el precio de IMSS");
	});
});

// Un cliente de porcentaje cotiza con la lista de particular y su descuento va
// encima, sólo en los renglones que se agregaron con él.
describe("Cotización — descuento de mostrador", () => {
	const cotizarCon20 = async () => {
		await act(async () => {
			render(<Cotizacion />);
		});
		await elegir("Selecciona una Empresa", "2");
		await elegir("Selecciona un Cliente", "3");
		await elegir("Selecciona tipo de estudio", "7");
		await agregarPorBusqueda("bio");
	};

	test("el renglón, el descuento y el total final llevan el porcentaje", async () => {
		await cotizarCon20();

		expect(precioMostrado()).toContain("$80.00");
		expect(descuentoPct()).toBe("20");
		expect(descuentoMonto()).toBe("20");
		expect(totalCampo()).toBe("$80.00");
		expect(totalFinal()).toBe("$80.00");
	});

	test("cambiar a particular deja el 20% en lo ya agregado y no en lo nuevo", async () => {
		await cotizarCon20();

		await elegir("20%", "4");
		expect(descuentoPct()).toBe("0");
		expect(precioMostrado()).toContain("$80.00");
		expect(precioDe("BH").querySelector(".cliente-precio-cot")).toHaveTextContent("20%");

		await agregarPorBusqueda("bio");
		expect(filaDe("BH").querySelector(".cantidad-valor-cot")).toHaveTextContent("1");
		expect(precioMostrado()).toContain("$80.00");
	});

	test("mezclar clientes suma cada renglón con su precio", async () => {
		await act(async () => {
			render(<Cotizacion />);
		});
		await elegir("Selecciona una Empresa", "2");
		await elegir("Selecciona un Cliente", "3");
		await elegir("Selecciona tipo de estudio", "7");
		await agregarPorBusqueda("bio");

		// QS sólo tiene precio con IMSS ($120).
		await elegir("20%", "1");
		await agregarPorBusqueda("quim");

		expect(precioDe("BH")).toHaveTextContent("$80.00");
		expect(precioDe("QS")).toHaveTextContent("$120.00");
		expect(totalCampo()).toBe("$200.00");
		expect(descuentoMonto()).toBe("20");
		expect(totalFinal()).toBe("$200.00");
	});

	test("quitar el último renglón con porcentaje limpia el monto", async () => {
		await cotizarCon20();
		expect(descuentoMonto()).toBe("20");

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Eliminar estudio BH" }));
		});

		expect(descuentoMonto()).toBe("0");
	});

	test("capturar el porcentaje a mano lo aplica a toda la cotización", async () => {
		await cotizarConIMSS();

		await act(async () => {
			fireEvent.change(document.querySelector(".input-descuento-pct-cot"), {
				target: { value: "50" },
			});
		});

		expect(precioMostrado()).toContain("$40.00");
		expect(totalFinal()).toBe("$40.00");
	});
});

// Varios estudios en la tabla y cantidad por renglón, igual que Nuevo paciente.
describe("Cotización — varios estudios y cantidad", () => {
	const filas = () => [...document.querySelectorAll(".tabla-estudios-cot tbody tr")];
	const fila = filaDe;

	test("agregar un segundo estudio no borra el primero", async () => {
		await cotizarConIMSS();
		await agregarPorBusqueda("quim");

		expect(filas()).toHaveLength(2);
		expect(fila("BH")).toBeTruthy();
		expect(fila("QS")).toBeTruthy();
		expect(totalCampo()).toBe("$200.00");
	});

	test("volver a agregar un estudio sube su cantidad y el importe", async () => {
		await cotizarConIMSS();
		await agregarPorBusqueda("bio");

		expect(filas()).toHaveLength(1);
		expect(fila("BH").querySelector(".cantidad-valor-cot")).toHaveTextContent("2");
		expect(precioMostrado()).toContain("$160.00");
		expect(precioMostrado()).toContain("$80.00 c/u");
		expect(totalCampo()).toBe("$160.00");
	});

	test("los botones + y − cambian la cantidad", async () => {
		await cotizarConIMSS();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad de BH" }));
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad de BH" }));
		});
		expect(fila("BH").querySelector(".cantidad-valor-cot")).toHaveTextContent("3");
		expect(totalCampo()).toBe("$240.00");

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Disminuir cantidad de BH" }));
		});
		expect(totalCampo()).toBe("$160.00");
	});

	test("borrar un estudio deja los demás", async () => {
		await cotizarConIMSS();
		await agregarPorBusqueda("quim");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Eliminar estudio BH" }));
		});

		expect(filas()).toHaveLength(1);
		expect(fila("QS")).toBeTruthy();
	});
});

// El buscador ofrece sólo lo que el convenio tiene con precio: antes, si lo
// buscado no estaba en su tarifario, salía el catálogo a precio por defecto.
test("un estudio sin precio en el convenio no se ofrece", async () => {
	await act(async () => {
		render(<Cotizacion />);
	});
	await elegir("Selecciona una Empresa", "2");
	await elegir("Selecciona un Cliente", "2");
	await elegir("Selecciona tipo de estudio", "7");

	// ISSSTE sólo tiene precio para la biometría.
	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Busca estudios aquí/i), {
			target: { value: "quim" },
		});
	});

	expect(document.querySelector(".search-results-estudios-cot")).toHaveTextContent(
		"No se encontraron estudios",
	);
	expect(screen.queryByText(/QUIMICA SANGUINEA/)).not.toBeInTheDocument();
});
