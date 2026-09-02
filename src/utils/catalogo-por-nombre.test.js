import { buscarPorNombre, idPorNombre, normalizarNombre } from "./catalogo-por-nombre";

const EMPRESAS = [
	{ id_empresa: 1, nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	{ id_empresa: 2, nombre: "CENTRO DE DIAGNOSTICO POR IMAGEN PVR" },
];

const CLIENTES = [
	{ id_cliente: 7, nombre: "IMSS" },
	{ id_cliente: 9, nombre: "Particular" },
];

describe("normalizarNombre", () => {
	it("ignora acentos, mayusculas y espacios de sobra", () => {
		expect(normalizarNombre("  CENTRAL  Diagnóstica ")).toBe("central diagnostica");
	});

	it("una entrada vacia no rompe nada", () => {
		expect(normalizarNombre(undefined)).toBe("");
	});
});

describe("buscarPorNombre", () => {
	it("encuentra por nombre exacto sin importar como se escriba", () => {
		expect(buscarPorNombre(CLIENTES, "particular")?.id_cliente).toBe(9);
		expect(buscarPorNombre(CLIENTES, "  IMSS  ")?.id_cliente).toBe(7);
	});

	// Quien agenda por telefono teclea lo justo, no el nombre completo.
	it("acepta el principio del nombre cuando no hay ambiguedad", () => {
		expect(buscarPorNombre(EMPRESAS, "central")?.id_empresa).toBe(1);
	});

	// "centr" empieza igual en las dos empresas: adivinar cual seria peor que
	// no resolver, porque la cita quedaria facturada a la que no era.
	it("no adivina cuando el principio coincide con varios", () => {
		expect(buscarPorNombre(EMPRESAS, "centr")).toBeNull();
	});

	it("lo que no esta en el catalogo no encuentra nada", () => {
		expect(buscarPorNombre(CLIENTES, "Seguros del Norte")).toBeNull();
	});

	it("un texto vacio no devuelve el primer registro por accidente", () => {
		expect(buscarPorNombre(CLIENTES, "")).toBeNull();
		expect(buscarPorNombre(CLIENTES, "   ")).toBeNull();
	});
});

describe("idPorNombre", () => {
	it("devuelve el id del registro que coincide", () => {
		expect(idPorNombre(EMPRESAS, "central diagnostica california", "id_empresa")).toBe(1);
	});

	// Sin coincidencia la cita se guarda igual: la columna acepta nulo y es
	// preferible a rechazar el agendado.
	it("devuelve null cuando no coincide, para no inventar una relacion", () => {
		expect(idPorNombre(CLIENTES, "Seguros del Norte", "id_cliente")).toBeNull();
	});

	it("un catalogo vacio no rompe", () => {
		expect(idPorNombre([], "IMSS", "id_cliente")).toBeNull();
	});
});
