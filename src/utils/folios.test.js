import {
	agruparEstudiosPorSerie,
	convenioCubreEstudio,
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

const usg = { modulo: "imagen", modalidad: "ultrasonido", clave: "US-RENAL", empresa_operativa: "CDI" };
const usgDoppler = {
	modulo: "imagen",
	modalidad: "ultrasonido",
	clave: "US-DOPPLER-HEPATO-VESICULAR",
	descripcion: "U.S. DOPPLER HEPATO VESICULAR",
	empresa_operativa: "CDI",
};
const tomografia = { modulo: "imagen", modalidad: "tomografia", empresa_operativa: "CDI" };
const rayosX = { modulo: "imagen", modalidad: "radiografia", empresa_operativa: "CDI" };
const veterinaria = { modulo: "imagen", modalidad: "veterinaria", empresa_operativa: "CDC" };

// La matriz del convenio, tal como está capturada en la base.
const IMSS = [
	{ modalidad: "tomografia", empresa: "CDC" },
	{ modalidad: "resonancia", empresa: "CDC" },
	{ modalidad: "ultrasonido", criterio: "doppler", empresa: "CDC" },
];
const ODILE = [{ modalidad: "*", empresa: "CDC" }];
const ISSSTE = [{ modalidad: "*", empresa: "CDI" }];
const SSA = [
	{ modalidad: "*", empresa: "CDI" },
	{ modalidad: "resonancia", empresa: "CDC" },
];
const resonancia = { modulo: "imagen", modalidad: "resonancia", empresa_operativa: "CDC" };
const laboratorio = { modulo: "laboratorio", modalidad: "laboratorio" };

describe("resolverSerieFolio", () => {
	test("el laboratorio siempre es la serie C", () => {
		expect(resolverSerieFolio(laboratorio)).toBe("C");
		expect(resolverSerieFolio(laboratorio, ISSSTE)).toBe("C");
	});

	describe("convenios de California", () => {
		test("IMSS lleva tomografía y resonancia a CDC", () => {
			expect(resolverSerieFolio(tomografia, IMSS)).toBe("B");
			expect(resolverSerieFolio(resonancia, IMSS)).toBe("B");
		});

		test("IMSS sólo lleva el ultrasonido a CDC cuando es doppler", () => {
			expect(resolverSerieFolio(usgDoppler, IMSS)).toBe("B");
			expect(resolverSerieFolio(usg, IMSS)).toBe("A");
		});

		test("Odile factura toda su imagen en CDC", () => {
			expect(resolverSerieFolio(tomografia, ODILE)).toBe("B");
			expect(resolverSerieFolio(rayosX, ODILE)).toBe("B");
			expect(resolverSerieFolio(usg, ODILE)).toBe("B");
		});
	});

	describe("convenios de Imagen", () => {
		test("ISSSTE factura toda su imagen en CDI, incluida la resonancia", () => {
			expect(resolverSerieFolio(tomografia, ISSSTE)).toBe("A");
			expect(resolverSerieFolio(resonancia, ISSSTE)).toBe("A");
		});

		// Medisim y SSA están en las dos empresas: la resonancia es de CDC.
		test("SSA manda su resonancia a CDC y el resto a CDI", () => {
			expect(resolverSerieFolio(resonancia, SSA)).toBe("B");
			expect(resolverSerieFolio(tomografia, SSA)).toBe("A");
			expect(resolverSerieFolio(rayosX, SSA)).toBe("A");
		});
	});

	describe("particulares", () => {
		test("la resonancia y la veterinaria se quedan en CDC", () => {
			expect(resolverSerieFolio(resonancia)).toBe("B");
			expect(resolverSerieFolio(veterinaria)).toBe("B");
		});

		test("el resto de la imagen es de CDI", () => {
			expect(resolverSerieFolio(usg)).toBe("A");
			expect(resolverSerieFolio(tomografia)).toBe("A");
		});
	});
});

describe("resolverEmpresaFacturaEstudio", () => {
	test("la regla de la modalidad gana sobre la del convenio completo", () => {
		expect(resolverEmpresaFacturaEstudio(resonancia, SSA)).toBe("CDC");
		expect(resolverEmpresaFacturaEstudio(usg, SSA)).toBe("CDI");
	});

	test("una modalidad que el convenio no cubre usa la empresa del catálogo", () => {
		expect(resolverEmpresaFacturaEstudio(rayosX, IMSS)).toBe("CDI");
		expect(resolverEmpresaFacturaEstudio(veterinaria, IMSS)).toBe("CDC");
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
		const grupos = agruparEstudiosPorSerie([usg, laboratorio, resonancia], []);

		expect(grupos.map((g) => g.serie)).toEqual(["A", "B", "C"]);
		expect(grupos[0]).toMatchObject({ empresa: "CDI", estudios: [usg] });
		expect(grupos[1]).toMatchObject({ empresa: "CDC", estudios: [resonancia] });
		expect(grupos[2]).toMatchObject({ empresa: "CDC", estudios: [laboratorio] });
	});

	test("un paciente de SSA con resonancia y tomografía cae en las dos empresas", () => {
		const grupos = agruparEstudiosPorSerie([tomografia, resonancia], SSA);

		expect(grupos.map((g) => g.serie)).toEqual(["A", "B"]);
	});

	test("una orden de una sola serie queda en un solo grupo", () => {
		expect(agruparEstudiosPorSerie([laboratorio], [])).toHaveLength(1);
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

describe("convenioCubreEstudio", () => {
	// IMSS no tiene rayos X ni ultrasonido que no sea doppler: esos estudios no
	// deben ni aparecer en el buscador cuando está seleccionado.
	test("IMSS no cubre radiología ni el ultrasonido sin doppler", () => {
		expect(convenioCubreEstudio(rayosX, IMSS)).toBe(false);
		expect(convenioCubreEstudio(usg, IMSS)).toBe(false);
	});

	test("IMSS sí cubre lo que tiene pactado", () => {
		expect(convenioCubreEstudio(tomografia, IMSS)).toBe(true);
		expect(convenioCubreEstudio(resonancia, IMSS)).toBe(true);
		expect(convenioCubreEstudio(usgDoppler, IMSS)).toBe(true);
	});

	test("un convenio con regla general cubre toda su imagen", () => {
		expect(convenioCubreEstudio(rayosX, ISSSTE)).toBe(true);
		expect(convenioCubreEstudio(resonancia, SSA)).toBe(true);
		expect(convenioCubreEstudio(rayosX, ODILE)).toBe(true);
	});

	test("el laboratorio no se acota por convenio: lo delimita el tarifario", () => {
		expect(convenioCubreEstudio(laboratorio, IMSS)).toBe(true);
	});

	test("sin convenio se ofrece todo el catálogo", () => {
		expect(convenioCubreEstudio(rayosX, [])).toBe(true);
	});
});
