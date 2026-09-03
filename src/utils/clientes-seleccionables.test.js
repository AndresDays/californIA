const mockLlamadas = [];
let mockRespuestas = [];

jest.mock("../lib/supabase-client", () => {
	const crearCadena = () => {
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn((columna, valor) => {
				mockLlamadas[mockLlamadas.length - 1].eq = [columna, valor];
				return cadena;
			}),
			or: jest.fn((filtro) => {
				mockLlamadas[mockLlamadas.length - 1].or = filtro;
				return cadena;
			}),
			order: jest.fn(() => Promise.resolve(mockRespuestas.shift())),
		};
		return cadena;
	};
	return {
		supabase: {
			from: jest.fn((tabla) => {
				mockLlamadas.push({ tabla });
				return crearCadena();
			}),
		},
	};
});

import {
	clientesParaFiltro,
	consultarClientesSeleccionables,
} from "./clientes-seleccionables";

const ACTIVOS = [{ id_cliente: 3, nombre: "IMSS" }];
const TODOS = [...ACTIVOS, { id_cliente: 9, nombre: "RCU" }];

beforeEach(() => {
	mockLlamadas.length = 0;
	mockRespuestas = [];
});

describe("consultarClientesSeleccionables", () => {
	test("pide sólo los activos cuando no se edita nada", async () => {
		mockRespuestas = [{ data: ACTIVOS, error: null }];

		const { data, error } = await consultarClientesSeleccionables();

		expect(error).toBeNull();
		expect(data).toEqual(ACTIVOS);
		expect(mockLlamadas).toHaveLength(1);
		expect(mockLlamadas[0].eq).toEqual(["activo", true]);
		expect(mockLlamadas[0].or).toBeUndefined();
	});

	// Editar una orden de un convenio dado de baja no puede dejar el select en
	// blanco: ese cliente entra a la lista aunque ya no se ofrezca.
	test("deja pasar el cliente de la orden que se está editando", async () => {
		mockRespuestas = [{ data: TODOS, error: null }];

		const { data } = await consultarClientesSeleccionables({ incluirId: 9 });

		expect(data).toEqual(TODOS);
		expect(mockLlamadas[0].or).toBe("activo.eq.true,id_cliente.eq.9");
		expect(mockLlamadas[0].eq).toBeUndefined();
	});

	// El id se concatena dentro del texto del filtro de PostgREST, así que lo
	// que no sea un número se descarta en vez de acabar dentro de la consulta.
	test.each([
		["texto", "1 or true"],
		["nulo", null],
		["decimal", 2.5],
		["negativo", -4],
	])("un incluirId %s no llega al filtro", async (_caso, valor) => {
		mockRespuestas = [{ data: ACTIVOS, error: null }];

		await consultarClientesSeleccionables({ incluirId: valor });

		expect(mockLlamadas[0].or).toBeUndefined();
		expect(mockLlamadas[0].eq).toEqual(["activo", true]);
	});

	// Si el código llega a producción antes que la migración, la columna no
	// existe y PostgREST rechaza el filtro entero. Quedarse sin clientes deja a
	// recepción sin poder cobrar, así que se pide la lista completa.
	test("cae a la lista completa mientras la columna no exista", async () => {
		mockRespuestas = [
			{
				data: null,
				error: { code: "42703", message: 'column clientes.activo does not exist' },
			},
			{ data: TODOS, error: null },
		];

		const { data, error } = await consultarClientesSeleccionables();

		expect(error).toBeNull();
		expect(data).toEqual(TODOS);
		expect(mockLlamadas).toHaveLength(2);
		expect(mockLlamadas[1].eq).toBeUndefined();
		expect(mockLlamadas[1].or).toBeUndefined();
	});

	// Cualquier otro error sí se reporta: si se lo tragara, el selector se
	// vaciaría sin que nadie supiera por qué.
	test("un error distinto no se reintenta ni se esconde", async () => {
		const fallo = { code: "PGRST301", message: "JWT expired" };
		mockRespuestas = [{ data: null, error: fallo }];

		const { data, error } = await consultarClientesSeleccionables();

		expect(error).toBe(fallo);
		expect(data).toEqual([]);
		expect(mockLlamadas).toHaveLength(1);
	});
});

// El filtro de un reporte no es un selector de captura: ahí no basta con
// esconder los convenios dados de baja, porque entonces sus ventas se verían en
// la tabla y no habría manera de filtrarlas -que es justo lo que se quiso evitar
// al no borrarlos-.
describe("clientesParaFiltro", () => {
	const ACTIVO = { id_cliente: 3, nombre: "IMSS" };
	const DE_BAJA = { id_cliente: 9, nombre: "RCU" };

	test("sin ventas ofrece sólo los activos", () => {
		expect(clientesParaFiltro([ACTIVO], [])).toEqual([ACTIVO]);
	});

	test("repone el convenio dado de baja que aparece en las ventas", () => {
		const lista = clientesParaFiltro([ACTIVO], [
			{ id_cliente: 9, clientes: DE_BAJA },
		]);
		expect(lista).toHaveLength(2);
		expect(lista.map((c) => c.nombre)).toEqual(["IMSS", "RCU"]);
	});

	test("no duplica al que ya venía activo", () => {
		const lista = clientesParaFiltro([ACTIVO], [
			{ id_cliente: 3, clientes: ACTIVO },
			{ id_cliente: 3, clientes: ACTIVO },
		]);
		expect(lista).toHaveLength(1);
	});

	// Una venta de mostrador no trae convenio: no agrega nada al filtro.
	test("las ventas sin cliente no ensucian la lista", () => {
		expect(
			clientesParaFiltro([ACTIVO], [{ id_cliente: null, clientes: null }, {}]),
		).toEqual([ACTIVO]);
	});

	// Sin nombre no hay texto para la opción: meterla dejaría un renglón vacío.
	test("un cliente sin nombre se omite", () => {
		expect(
			clientesParaFiltro([ACTIVO], [{ id_cliente: 9, clientes: { id_cliente: 9 } }]),
		).toEqual([ACTIVO]);
	});

	test("la lista queda ordenada por nombre", () => {
		const lista = clientesParaFiltro(
			[{ id_cliente: 1, nombre: "Zeta" }, { id_cliente: 2, nombre: "Beta" }],
			[{ id_cliente: 9, clientes: { id_cliente: 9, nombre: "Alfa" } }],
		);
		expect(lista.map((c) => c.nombre)).toEqual(["Alfa", "Beta", "Zeta"]);
	});

	test("no truena con argumentos vacíos", () => {
		expect(clientesParaFiltro()).toEqual([]);
		expect(clientesParaFiltro(undefined, undefined)).toEqual([]);
	});
});
