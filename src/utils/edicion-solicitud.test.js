import { MOTIVO_ABONO, esSoloAbono, resolverMotivoEdicion } from "./edicion-solicitud";

const orden = {
	total: 1040,
	id_cliente: null,
	id_doctor: null,
	estudios_venta: [
		{ clave_estudio: "BH", precio: 1000, muestra_pendiente: false },
		{ clave_estudio: "QS", precio: 40, muestra_pendiente: false },
	],
};

const estudiosIguales = [
	{ clave: "QS", precio: 40 },
	{ clave: "BH", precio: 1000 },
];

describe("esSoloAbono", () => {
	test("un pago sin ningún otro cambio es un abono", () => {
		expect(
			esSoloAbono({ orden, estudios: estudiosIguales, granTotal: 1040, pagoNuevo: 500 }),
		).toBe(true);
	});

	test("sin pago nuevo no es un abono", () => {
		expect(
			esSoloAbono({ orden, estudios: estudiosIguales, granTotal: 1040, pagoNuevo: 0 }),
		).toBe(false);
	});

	test("agregar un estudio deja de ser un abono", () => {
		expect(
			esSoloAbono({
				orden,
				estudios: [...estudiosIguales, { clave: "EGO", precio: 90 }],
				granTotal: 1130,
				pagoNuevo: 500,
			}),
		).toBe(false);
	});

	test("cambiar el precio de un estudio deja de ser un abono", () => {
		expect(
			esSoloAbono({
				orden,
				estudios: [
					{ clave: "QS", precio: 40 },
					{ clave: "BH", precio: 900 },
				],
				granTotal: 940,
				pagoNuevo: 500,
			}),
		).toBe(false);
	});

	test("cambiar el convenio o el médico deja de ser un abono", () => {
		expect(
			esSoloAbono({
				orden,
				estudios: estudiosIguales,
				clienteSeleccionado: "7",
				granTotal: 1040,
				pagoNuevo: 500,
			}),
		).toBe(false);
		expect(
			esSoloAbono({
				orden,
				estudios: estudiosIguales,
				idDoctor: 3,
				granTotal: 1040,
				pagoNuevo: 500,
			}),
		).toBe(false);
	});

	test("sin orden seleccionada no hay abono", () => {
		expect(esSoloAbono({ pagoNuevo: 100 })).toBe(false);
	});
});

describe("resolverMotivoEdicion", () => {
	test("el abono trae su propio motivo", () => {
		expect(resolverMotivoEdicion({ motivo: "  ", soloAbono: true })).toBe(MOTIVO_ABONO);
	});

	test("respeta el motivo capturado", () => {
		expect(resolverMotivoEdicion({ motivo: " Se agregó BH ", soloAbono: true })).toBe(
			"Se agregó BH",
		);
	});

	test("sin motivo y sin abono no hay motivo", () => {
		expect(resolverMotivoEdicion({ motivo: "" })).toBe("");
	});
});
