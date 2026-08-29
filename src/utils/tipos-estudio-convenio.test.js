import { resolverTiposEstudioConvenio } from "./tipos-estudio-convenio";

const EMPRESAS = [
	{ id_empresa: 1, nombre: "Central Diagnostica California" },
	{ id_empresa: 2, nombre: "Centro Diagnóstico por Imagen" },
];

const tipo = (id, nombre, idEmpresa) => ({
	id_empresa: idEmpresa,
	tipos_estudio: { id_tipo_estudio: id, nombre },
});

const FILAS = [
	tipo(1, "Laboratorio", 1),
	tipo(2, "Resonancia", 1),
	tipo(3, "Veterinaria", 1),
	tipo(4, "Tomografias", 2),
	tipo(5, "Ultrasonidos", 2),
	tipo(6, "Rayos X", 2),
	tipo(7, "Estudios contrastados", 2),
	tipo(8, "Otros estudios", 2),
];

// Los convenios tal como quedan capturados en la matriz.
const ANAMAYA = [{ modalidad: "*", criterio: "", empresa: "CDC" }];
const IMSS = [
	{ modalidad: "tomografia", criterio: "", empresa: "CDC" },
	{ modalidad: "resonancia", criterio: "", empresa: "CDC" },
	{ modalidad: "ultrasonido", criterio: "doppler", empresa: "CDC" },
];
const SSA = [
	{ modalidad: "*", criterio: "", empresa: "CDI" },
	{ modalidad: "resonancia", criterio: "", empresa: "CDC" },
];
const ISSSTE = [{ modalidad: "*", criterio: "", empresa: "CDI" }];

const tiposDe = (idEmpresa, reglasConvenio) =>
	resolverTiposEstudioConvenio({
		filas: FILAS,
		empresas: EMPRESAS,
		idEmpresaSeleccionada: idEmpresa,
		reglasConvenio,
	}).map((t) => t.nombre);

describe("particular", () => {
	test("ve los tipos que la empresa tiene dados de alta", () => {
		expect(tiposDe(1)).toEqual(["Laboratorio", "Resonancia", "Veterinaria"]);
		expect(tiposDe(2)).toEqual([
			"Estudios contrastados",
			"Otros estudios",
			"Rayos X",
			"Tomografias",
			"Ultrasonidos",
		]);
	});
});

describe("convenios de California", () => {
	// Sólo lo pactado: nada de laboratorio ni veterinaria.
	test("Anamaya ve sus seis tipos", () => {
		expect(tiposDe(1, ANAMAYA).sort()).toEqual(
			[
				"Estudios contrastados",
				"Otros estudios",
				"Rayos X",
				"Resonancia",
				"Tomografias",
				"Ultrasonidos",
			].sort(),
		);
		expect(tiposDe(1, ANAMAYA)).not.toContain("Laboratorio");
		expect(tiposDe(1, ANAMAYA)).not.toContain("Veterinaria");
	});

	test("IMSS ve tomografías, ultrasonidos y resonancia", () => {
		expect(tiposDe(1, IMSS).sort()).toEqual(
			["Resonancia", "Tomografias", "Ultrasonidos"].sort(),
		);
	});
});

describe("convenios repartidos entre las dos empresas", () => {
	// Medisim y SSA facturan su resonancia por CDC y el resto por CDI.
	test("con CDC, SSA sólo ve resonancia", () => {
		expect(tiposDe(1, SSA)).toEqual(["Resonancia"]);
	});

	test("con CDI, SSA ve su imagen menos la resonancia", () => {
		const tipos = tiposDe(2, SSA);
		expect(tipos).not.toContain("Resonancia");
		expect(tipos).toEqual(
			expect.arrayContaining(["Tomografias", "Ultrasonidos", "Rayos X"]),
		);
	});

	test("ISSSTE ve toda su imagen en CDI, incluida la resonancia", () => {
		expect(tiposDe(2, ISSSTE)).toContain("Resonancia");
	});

	test("un convenio de CDI no ofrece nada con CDC seleccionada", () => {
		expect(tiposDe(1, ISSSTE)).toEqual([]);
	});
});

test("no repite un tipo dado de alta en las dos empresas", () => {
	const tipos = resolverTiposEstudioConvenio({
		filas: [...FILAS, tipo(4, "Tomografias", 1)],
		empresas: EMPRESAS,
		idEmpresaSeleccionada: 1,
		reglasConvenio: ANAMAYA,
	});

	expect(tipos.filter((t) => t.nombre === "Tomografias")).toHaveLength(1);
});

// El laboratorio de un convenio se factura por CDC aunque su imagen vaya por
// CDI. La regla de comodín no lo arrastra a propósito, así que hace falta la
// suya: sin ella, elegir CDC con ISSSTE no ofrecía ningún tipo de estudio.
describe("un convenio con laboratorio propio", () => {
	const ISSSTE_CON_LABORATORIO = [
		{ modalidad: "*", criterio: "", empresa: "CDI" },
		{ modalidad: "laboratorio", criterio: "", empresa: "CDC" },
	];

	test("sin su regla, CDC no ofrece nada porque su imagen va por CDI", () => {
		expect(tiposDe(1, ISSSTE)).toEqual([]);
	});

	test("con su regla, CDC ofrece laboratorio y nada mas", () => {
		expect(tiposDe(1, ISSSTE_CON_LABORATORIO)).toEqual(["Laboratorio"]);
	});

	test("su imagen sigue saliendo con CDI", () => {
		expect(tiposDe(2, ISSSTE_CON_LABORATORIO)).toEqual(tiposDe(2, ISSSTE));
	});

	// La veterinaria no se le abre de pasada: sigue fuera del convenio.
	test("la veterinaria no se cuela con la regla de laboratorio", () => {
		expect(tiposDe(1, ISSSTE_CON_LABORATORIO)).not.toContain("Veterinaria");
	});
});
