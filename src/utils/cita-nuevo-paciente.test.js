import {
	construirEstudioSeleccionado,
	dividirEstudiosCita,
	encontrarEstudioCatalogo,
} from "./cita-nuevo-paciente";

describe("cita-nuevo-paciente helpers", () => {
	const catalogo = [
		{ id: 1, clave: "BH", descripcion: "Biometría Hemática", area: "Hematología" },
		{ id: 2, clave: "QS", descripcion: "Química Sanguínea", area: "Química" },
	];

	test("divide estudios guardados como texto en la cita", () => {
		expect(dividirEstudiosCita("Biometría Hemática, Química Sanguínea")).toEqual([
			"Biometría Hemática",
			"Química Sanguínea",
		]);
	});

	test("encuentra estudios por descripción o clave sin depender de acentos", () => {
		expect(encontrarEstudioCatalogo("biometria hematica", catalogo)).toEqual(catalogo[0]);
		expect(encontrarEstudioCatalogo("QS", catalogo)).toEqual(catalogo[1]);
	});

	test("construye un estudio seleccionado compatible con nuevo paciente", () => {
		expect(
			construirEstudioSeleccionado({
				estudioCatalogo: catalogo[0],
				precio: 180,
				nombreCliente: "Cliente A",
			}),
		).toMatchObject({
			id: 1,
			clave: "BH",
			precio: 180,
			cantidad: 1,
			diasProceso: 1,
			cliente: "Cliente A",
		});
	});
});
