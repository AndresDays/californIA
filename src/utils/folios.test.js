import {
	agruparEstudiosPorSerie,
	construirFolio,
	empresaDeSerie,
	esEstudioDeLaboratorio,
	foliosCoinciden,
	normalizarFolio,
	normalizarFolioConsulta,
	resolverEmpresaFacturaEstudio,
	resolverSerieFolio,
	separarFolio,
} from "./folios";

const usg = { modulo: "imagen", modalidad: "ultrasonido", empresa_operativa: "CDI" };
const resonancia = { modulo: "imagen", modalidad: "resonancia", empresa_operativa: "CDC" };
const laboratorio = { modulo: "laboratorio", modalidad: "laboratorio" };

describe("resolverSerieFolio", () => {
	test("el laboratorio siempre es la serie C", () => {
		expect(resolverSerieFolio(laboratorio)).toBe("C");
		expect(resolverSerieFolio(laboratorio, "CDI")).toBe("C");
	});

	// El mismo ultrasonido cambia de empresa según el convenio del paciente.
	test.each([
		["CDC", "B"],
		["CDI", "A"],
	])("una imagen de un convenio de %s va a la serie %s", (empresa, serie) => {
		expect(resolverSerieFolio(usg, empresa)).toBe(serie);
	});

	test("la resonancia de un convenio de CDI se factura en CDI", () => {
		expect(resolverSerieFolio(resonancia, "CDI")).toBe("A");
	});

	describe("particulares", () => {
		test("la resonancia se queda en CDC", () => {
			expect(resolverSerieFolio(resonancia)).toBe("B");
		});

		test("el resto de la imagen es de CDI", () => {
			expect(resolverSerieFolio(usg)).toBe("A");
			expect(resolverSerieFolio({ modulo: "imagen", modalidad: "tomografia", empresa_operativa: "CDI" })).toBe("A");
		});
	});
});

describe("resolverEmpresaFacturaEstudio", () => {
	test("el convenio manda sobre el catálogo", () => {
		expect(resolverEmpresaFacturaEstudio(usg, "CDC")).toBe("CDC");
		expect(resolverEmpresaFacturaEstudio(resonancia, "CDI")).toBe("CDI");
	});

	test("sin convenio se usa la empresa del catálogo", () => {
		expect(resolverEmpresaFacturaEstudio(usg)).toBe("CDI");
		expect(resolverEmpresaFacturaEstudio(resonancia)).toBe("CDC");
	});
});

describe("esEstudioDeLaboratorio", () => {
	test("distingue laboratorio de imagen", () => {
		expect(esEstudioDeLaboratorio(laboratorio)).toBe(true);
		expect(esEstudioDeLaboratorio(usg)).toBe(false);
	});
});

describe("empresaDeSerie", () => {
	test.each([
		["A", "CDI"],
		["B", "CDC"],
		["C", "CDC"],
		["Z", ""],
	])("la serie %s factura en %s", (serie, empresa) => {
		expect(empresaDeSerie(serie)).toBe(empresa);
	});
});

describe("agruparEstudiosPorSerie", () => {
	test("reparte los estudios de la orden en sus series", () => {
		const grupos = agruparEstudiosPorSerie([usg, laboratorio, resonancia], "");

		expect(grupos.map((g) => g.serie)).toEqual(["A", "B", "C"]);
		expect(grupos[0]).toMatchObject({ empresa: "CDI", estudios: [usg] });
		expect(grupos[1]).toMatchObject({ empresa: "CDC", estudios: [resonancia] });
		expect(grupos[2]).toMatchObject({ empresa: "CDC", estudios: [laboratorio] });
	});

	test("con un convenio de CDC la imagen y el laboratorio quedan en dos series", () => {
		const grupos = agruparEstudiosPorSerie([usg, laboratorio], "CDC");

		expect(grupos.map((g) => g.serie)).toEqual(["B", "C"]);
		expect(grupos.every((g) => g.empresa === "CDC")).toBe(true);
	});

	test("una orden de una sola serie queda en un solo grupo", () => {
		expect(agruparEstudiosPorSerie([laboratorio], "")).toHaveLength(1);
	});
});

describe("construirFolio", () => {
	test("el folio es corrido por serie, sin fecha", () => {
		expect(construirFolio("A", 1)).toBe("A0001");
		expect(construirFolio("B", 42)).toBe("B0042");
		expect(construirFolio("C", 12345)).toBe("C12345");
	});
});

describe("normalizarFolio", () => {
	test.each(["a0001", " A-0001 ", "A 00 01"])("%s se normaliza al folio del ticket", (entrada) => {
		expect(normalizarFolio(entrada)).toBe("A0001");
	});
});

describe("separarFolio", () => {
	test("lee la serie y el consecutivo", () => {
		expect(separarFolio("B0042")).toEqual({
			serie: "B",
			empresa: "CDC",
			consecutivo: 42,
			folio: "B0042",
		});
	});

	test("un folio anterior al cambio conserva su fecha y no trae serie", () => {
		expect(separarFolio("2508260007")).toMatchObject({
			serie: "",
			fecha: "250826",
			consecutivo: 7,
		});
	});

	test("un texto que no es folio no truena", () => {
		expect(separarFolio("hola")).toMatchObject({ consecutivo: null });
	});
});

describe("normalizarFolioConsulta", () => {
	test.each(["a0001", " A-0001 ", "2508260001"])("corrige la captura de %s", (entrada) => {
		expect(normalizarFolioConsulta(entrada)).toBe(
			entrada.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""),
		);
	});

	test("no toca un folio que no tiene la forma del ticket", () => {
		expect(normalizarFolioConsulta("F-17")).toBe("F-17");
		expect(normalizarFolioConsulta(" cot-2026-14 ")).toBe("COT-2026-14");
	});
});

describe("foliosCoinciden", () => {
	test("compara sin importar mayúsculas ni guiones", () => {
		expect(foliosCoinciden("a-0001", "A0001")).toBe(true);
		expect(foliosCoinciden("A0001", "B0001")).toBe(false);
		expect(foliosCoinciden("", "A0001")).toBe(false);
	});
});
