import {
	diaDeLaSemana,
	etiquetaPeriodo,
	etiquetaSemana,
	lunesDeLaSemana,
	periodoDesplazado,
	rangoSemanaLaboral,
	semanaDesplazada,
	sumarDias,
} from "./semanas-visitadora";

describe("diaDeLaSemana", () => {
	test("cuenta de lunes a domingo, con lunes en 1", () => {
		expect(diaDeLaSemana("2026-08-17")).toBe(1);
		expect(diaDeLaSemana("2026-08-21")).toBe(5);
		expect(diaDeLaSemana("2026-08-22")).toBe(6);
		// El domingo es 7, no 0: si fuera 0, restarle daría la semana anterior.
		expect(diaDeLaSemana("2026-08-23")).toBe(7);
	});
});

describe("lunesDeLaSemana", () => {
	test.each([
		["2026-08-17", "2026-08-17"],
		["2026-08-19", "2026-08-17"],
		["2026-08-21", "2026-08-17"],
		["2026-08-23", "2026-08-17"],
		["2026-08-24", "2026-08-24"],
	])("%s cae en la semana del %s", (fecha, lunes) => {
		expect(lunesDeLaSemana(fecha)).toBe(lunes);
	});

	test("cruza bien el cambio de mes y de anio", () => {
		expect(lunesDeLaSemana("2026-09-02")).toBe("2026-08-31");
		expect(lunesDeLaSemana("2027-01-01")).toBe("2026-12-28");
	});
});

describe("sumarDias y semanaDesplazada", () => {
	test("suma y resta cruzando meses", () => {
		expect(sumarDias("2026-08-31", 1)).toBe("2026-09-01");
		expect(sumarDias("2026-09-01", -1)).toBe("2026-08-31");
	});

	test("avanza y retrocede semanas completas", () => {
		expect(semanaDesplazada("2026-08-17", 1)).toBe("2026-08-24");
		expect(semanaDesplazada("2026-08-17", -1)).toBe("2026-08-10");
		expect(semanaDesplazada("2026-08-17", 0)).toBe("2026-08-17");
	});
});

describe("rangoSemanaLaboral", () => {
	test("va de lunes a viernes", () => {
		expect(rangoSemanaLaboral("2026-08-17")).toEqual({
			desde: "2026-08-17",
			hasta: "2026-08-21",
		});
	});

	test("normaliza cuando le dan un dia a media semana", () => {
		expect(rangoSemanaLaboral("2026-08-20")).toEqual({
			desde: "2026-08-17",
			hasta: "2026-08-21",
		});
	});
});

describe("etiquetaSemana", () => {
	test("dice el rango como lo escribe ella en el Excel", () => {
		expect(etiquetaSemana("2026-08-17")).toBe("Del 17 al 21 de agosto");
		expect(etiquetaSemana("2026-08-03")).toBe("Del 3 al 7 de agosto");
	});

	test("nombra los dos meses cuando la semana los cruza", () => {
		expect(etiquetaSemana("2026-08-31")).toBe("Del 31 de agosto al 4 de septiembre");
	});
});

describe("periodos mensuales", () => {
	test("avanza y retrocede meses cruzando el anio", () => {
		expect(periodoDesplazado("2026-08", 1)).toBe("2026-09");
		expect(periodoDesplazado("2026-12", 1)).toBe("2027-01");
		expect(periodoDesplazado("2026-01", -1)).toBe("2025-12");
	});

	test("etiqueta el periodo en espaniol", () => {
		expect(etiquetaPeriodo("2026-08")).toBe("Agosto 2026");
		expect(etiquetaPeriodo("2026-12")).toBe("Diciembre 2026");
	});
});
