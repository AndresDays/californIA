import {
	esErrorColumnaDoctoresNoCacheada,
	quitarColumnasDoctoresExternos,
	quitarColumnasDoctoresLegacy,
} from "./doctores-schema";

describe("doctores-schema", () => {
	test("detecta columnas nuevas ausentes del schema cache de doctores", () => {
		expect(esErrorColumnaDoctoresNoCacheada({
			code: "PGRST204",
			message: "Could not find the 'institucion' column of 'doctores' in the schema cache",
		}, "institucion")).toBe(true);
	});

	test("quita columnas nuevas para guardar en esquemas antiguos", () => {
		expect(quitarColumnasDoctoresExternos({
			nombre: "PEREZ JUAN",
			tipo_doctor: "institucion",
			institucion: "IMSS",
			activo: true,
			es_radiologo: true,
			especialidad: "Radiología",
		})).toEqual({
			nombre: "PEREZ JUAN",
		});
	});

	test("quita columnas legacy sin perder el flag de radiologo", () => {
		expect(quitarColumnasDoctoresLegacy({
			nombre: "PEREZ JUAN",
			tipo_doctor: "institucion",
			institucion: "IMSS",
			activo: true,
			es_radiologo: true,
			updated_at: "2026-07-10T00:00:00.000Z",
		})).toEqual({
			nombre: "PEREZ JUAN",
			es_radiologo: true,
			updated_at: "2026-07-10T00:00:00.000Z",
		});
	});
});
