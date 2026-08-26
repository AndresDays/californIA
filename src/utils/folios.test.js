import {
	construirFolio,
	normalizarFolioConsulta,
	empresaDeFolio,
	fechaFolio,
	foliosCoinciden,
	normalizarFolio,
	resolverPrefijoFolio,
	resolverPrefijoFolioEstudio,
	separarFolio,
} from "./folios";

describe("resolverPrefijoFolio", () => {
	test.each([
		["Centro Diagnóstico por Imagen", "I"],
		["CDI", "I"],
		["Central Diagnostica California", "C"],
		["CDC", "C"],
	])("%s usa el prefijo %s", (empresa, prefijo) => {
		expect(resolverPrefijoFolio(empresa)).toBe(prefijo);
	});

	test("una empresa que no se reconoce se factura como CDC", () => {
		expect(resolverPrefijoFolio("Otra cosa")).toBe("C");
		expect(resolverPrefijoFolio("")).toBe("C");
	});
});

describe("resolverPrefijoFolioEstudio", () => {
	test("el laboratorio siempre es CDC", () => {
		expect(resolverPrefijoFolioEstudio({ modulo: "laboratorio", empresa_operativa: "CDI" })).toBe("C");
	});

	test("la imagen usa la empresa operativa de su catálogo", () => {
		expect(resolverPrefijoFolioEstudio({ modulo: "imagen", empresa_operativa: "CDI" })).toBe("I");
		expect(resolverPrefijoFolioEstudio({ modulo: "imagen", empresa_operativa: "CDC" })).toBe("C");
	});
});

describe("construirFolio", () => {
	test("arma el folio con la letra, la fecha y el consecutivo", () => {
		const fecha = new Date(2026, 7, 25);
		expect(fechaFolio(fecha)).toBe("250826");
		expect(construirFolio("C", fecha, 1)).toBe("C2508260001");
		expect(construirFolio("I", fecha, 42)).toBe("I2508260042");
	});
});

describe("normalizarFolio", () => {
	test.each(["c2508260001", " C-2508260001 ", "C 250826 0001"])(
		"%s se normaliza al folio del ticket",
		(entrada) => expect(normalizarFolio(entrada)).toBe("C2508260001"),
	);

	test("los folios viejos de puros dígitos no cambian", () => {
		expect(normalizarFolio("2508260001")).toBe("2508260001");
	});
});

describe("separarFolio", () => {
	test("separa prefijo, fecha y consecutivo", () => {
		expect(separarFolio("I2508260042")).toEqual({
			prefijo: "I",
			fecha: "250826",
			consecutivo: 42,
			folio: "I2508260042",
		});
	});

	test("un folio anterior al cambio no trae prefijo", () => {
		expect(separarFolio("2508260007")).toMatchObject({ prefijo: "", consecutivo: 7 });
	});

	test("un texto que no es folio no truena", () => {
		expect(separarFolio("hola")).toMatchObject({ consecutivo: null });
	});
});

describe("empresaDeFolio", () => {
	test("identifica la empresa del folio", () => {
		expect(empresaDeFolio("C2508260001")).toBe("CDC");
		expect(empresaDeFolio("I2508260001")).toBe("CDI");
		expect(empresaDeFolio("2508260001")).toBe("");
	});
});

describe("foliosCoinciden", () => {
	test("compara sin importar mayúsculas ni guiones", () => {
		expect(foliosCoinciden("c-2508260001", "C2508260001")).toBe(true);
		expect(foliosCoinciden("C2508260001", "I2508260001")).toBe(false);
		expect(foliosCoinciden("", "C2508260001")).toBe(false);
	});
});

describe("normalizarFolioConsulta", () => {
	test.each(["c2508260001", " C-2508260001 ", "C 250826 0001", "2508260001"])(
		"corrige la captura de %s",
		(entrada) => {
			expect(normalizarFolioConsulta(entrada)).toBe(
				entrada.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""),
			);
		},
	);

	// Un folio con otro formato conserva sus separadores: ahí el guion puede ser
	// parte del folio y quitarlo dejaría al paciente sin resultados.
	test("no toca un folio que no tiene la forma del ticket", () => {
		expect(normalizarFolioConsulta("F-17")).toBe("F-17");
		expect(normalizarFolioConsulta(" cot-2026-14 ")).toBe("COT-2026-14");
	});
});
