import {
	esErrorColumnaDoctoresNoCacheada,
	quitarColumnasDoctoresExternos,
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
		})).toEqual({
			nombre: "PEREZ JUAN",
		});
	});
});
