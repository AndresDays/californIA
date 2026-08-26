import {
	esRecargaManual,
	limpiarBorradorSiEsRecargaManual,
	tipoDeCarga,
} from "./borrador-sesion";

const simularCarga = (tipo, { descartada = false } = {}) => {
	performance.getEntriesByType = jest.fn(() => [{ type: tipo }]);
	Object.defineProperty(document, "wasDiscarded", {
		value: descartada,
		configurable: true,
	});
};

const entradasOriginales = performance.getEntriesByType;

afterAll(() => {
	performance.getEntriesByType = entradasOriginales;
});

beforeEach(() => {
	sessionStorage.clear();
	Object.defineProperty(document, "wasDiscarded", {
		value: undefined,
		configurable: true,
	});
});

describe("tipoDeCarga", () => {
	test.each(["reload", "navigate", "back_forward"])("reconoce %s", (tipo) => {
		simularCarga(tipo);
		expect(tipoDeCarga()).toBe(tipo);
	});
});

describe("esRecargaManual", () => {
	test("un refresh cuenta como recarga manual", () => {
		simularCarga("reload");
		expect(esRecargaManual()).toBe(true);
	});

	// Volver a una pestaña que el navegador tiró también llega como reload, pero
	// ahí la captura debe recuperarse.
	test("una página descartada por el navegador no cuenta", () => {
		simularCarga("reload", { descartada: true });
		expect(esRecargaManual()).toBe(false);
	});

	test("entrar por primera vez tampoco", () => {
		simularCarga("navigate");
		expect(esRecargaManual()).toBe(false);
	});
});

describe("limpiarBorradorSiEsRecargaManual", () => {
	const sembrarBorrador = () => {
		sessionStorage.setItem("california:borrador:nuevo-paciente:nombreCompleto", '"ANA"');
		sessionStorage.setItem("california:nuevo-paciente:borrador", '{"clienteSeleccionado":"3"}');
		sessionStorage.setItem("california:busqueda:nuevo-paciente:paciente", "ana");
	};

	test("el refresh deja la captura en blanco", () => {
		sembrarBorrador();
		simularCarga("reload");

		expect(limpiarBorradorSiEsRecargaManual()).toBe(true);
		expect(sessionStorage.getItem("california:borrador:nuevo-paciente:nombreCompleto")).toBeNull();
		expect(sessionStorage.getItem("california:nuevo-paciente:borrador")).toBeNull();
	});

	// Las búsquedas y los filtros de fecha son comodidad de navegación, no
	// captura: no estorban al empezar una orden nueva.
	test("no toca las búsquedas guardadas", () => {
		sembrarBorrador();
		simularCarga("reload");
		limpiarBorradorSiEsRecargaManual();

		expect(sessionStorage.getItem("california:busqueda:nuevo-paciente:paciente")).toBe("ana");
	});

	test("volver de otra pestaña conserva la captura", () => {
		sembrarBorrador();
		simularCarga("reload", { descartada: true });

		expect(limpiarBorradorSiEsRecargaManual()).toBe(false);
		expect(sessionStorage.getItem("california:nuevo-paciente:borrador")).not.toBeNull();
	});
});
