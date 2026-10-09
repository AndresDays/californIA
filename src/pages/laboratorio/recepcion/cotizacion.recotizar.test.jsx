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

test("cambiar de cliente recotiza los estudios ya capturados", async () => {
	await cotizarConIMSS();
	expect(precioMostrado()).toBe("$80.00");

	await elegir("IMSS", "2");

	expect(precioMostrado()).toBe("$200.00");
	expect(screen.getByRole("alert")).toHaveTextContent("ISSSTE");
});

test("volver al cliente anterior devuelve su precio", async () => {
	await cotizarConIMSS();

	await elegir("IMSS", "2");
	expect(precioMostrado()).toBe("$200.00");

	await elegir("ISSSTE", "1");
	expect(precioMostrado()).toBe("$80.00");
});

// Un cliente de porcentaje cotiza con la lista de particular y su descuento va
// encima: el renglón tiene que mostrar el precio final, y al volver a un
// cliente sin descuento el monto en pesos tiene que irse con el porcentaje.
describe("Cotización — descuento de mostrador", () => {
	const campoPorValor = (selector) => document.querySelector(selector)?.value;
	const totalFinal = () => campoPorValor(".input-total-final-cot");
	const descuentoMonto = () => campoPorValor(".input-descuento-cot");
	const descuentoPct = () => campoPorValor(".input-descuento-pct-cot");

	test("el renglón, el descuento y el total final siguen al porcentaje", async () => {
		await cotizarConIMSS();

		// "20%" cotiza con la lista de particular ($100) y descuenta encima.
		await elegir("IMSS", "3");

		expect(precioMostrado()).toBe("$80.00");
		expect(descuentoPct()).toBe("20");
		expect(descuentoMonto()).toBe("20");
		expect(totalFinal()).toBe("$80.00");
	});

	test("volver a un cliente sin descuento limpia el monto, no sólo el porcentaje", async () => {
		await cotizarConIMSS();

		await elegir("IMSS", "3");
		expect(descuentoMonto()).toBe("20");

		await elegir("20%", "4");

		expect(descuentoPct()).toBe("0");
		expect(descuentoMonto()).toBe("0");
		expect(totalFinal()).toBe("$100.00");
		expect(precioMostrado()).toBe("$100.00");
	});
});

// El campo de Total tiene que cuadrar con lo que muestra la tabla: se quedaba
// con el precio de lista al cambiar de cliente o al aplicar un descuento.
describe("Cotización — el campo de Total sigue a la tabla", () => {
	const totalCampo = () => document.querySelector(".input-total-cot")?.value;

	test("cambiar de convenio actualiza el total", async () => {
		await cotizarConIMSS();
		expect(totalCampo()).toBe("$80.00");

		await elegir("IMSS", "2");

		expect(precioMostrado()).toBe("$200.00");
		expect(totalCampo()).toBe("$200.00");
	});

	test("con un cliente de porcentaje el total ya trae el descuento", async () => {
		await cotizarConIMSS();

		await elegir("IMSS", "3");

		expect(precioMostrado()).toBe("$80.00");
		expect(totalCampo()).toBe("$80.00");
		expect(document.querySelector(".input-total-final-cot")?.value).toBe("$80.00");
	});
});

// Varios estudios en la tabla y cantidad por renglón, igual que Nuevo paciente.
describe("Cotización — varios estudios y cantidad", () => {
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
	const filas = () => [...document.querySelectorAll(".tabla-estudios-cot tbody tr")];
	const fila = (clave) => filas().find((tr) => tr.textContent.includes(clave));
	const totalCampo = () => document.querySelector(".input-total-cot")?.value;

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
