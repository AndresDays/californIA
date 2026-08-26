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
];

const nombres = (tipos) => tipos.map((t) => t.nombre);

test("sin convenio se ofrecen sólo los tipos de la empresa elegida", () => {
	expect(
		nombres(
			resolverTiposEstudioConvenio({
				filas: FILAS,
				empresas: EMPRESAS,
				idEmpresaSeleccionada: 1,
			}),
		),
	).toEqual(["Laboratorio", "Resonancia", "Veterinaria"]);
});

// Anamaya factura toda su imagen por CDC, así que con CDC elegida debe poder
// capturar también los tipos que el catálogo tiene en CDI.
test("un convenio que factura por CDC suma los tipos de imagen de CDI", () => {
	const tipos = nombres(
		resolverTiposEstudioConvenio({
			filas: FILAS,
			empresas: EMPRESAS,
			idEmpresaSeleccionada: 1,
			reglasConvenio: [{ modalidad: "*", criterio: "", empresa: "CDC" }],
		}),
	);

	expect(tipos).toEqual(
		expect.arrayContaining([
			"Laboratorio",
			"Resonancia",
			"Veterinaria",
			"Tomografias",
			"Ultrasonidos",
			"Rayos X",
			"Estudios contrastados",
		]),
	);
});

test("IMSS sólo suma las modalidades que tiene pactadas", () => {
	const tipos = nombres(
		resolverTiposEstudioConvenio({
			filas: FILAS,
			empresas: EMPRESAS,
			idEmpresaSeleccionada: 1,
			reglasConvenio: [
				{ modalidad: "tomografia", criterio: "", empresa: "CDC" },
				{ modalidad: "resonancia", criterio: "", empresa: "CDC" },
				{ modalidad: "ultrasonido", criterio: "doppler", empresa: "CDC" },
			],
		}),
	);

	expect(tipos).toEqual(
		expect.arrayContaining(["Tomografias", "Ultrasonidos", "Laboratorio"]),
	);
	expect(tipos).not.toEqual(expect.arrayContaining(["Rayos X"]));
});

test("con CDI elegida, un convenio de CDC no arrastra sus tipos", () => {
	const tipos = nombres(
		resolverTiposEstudioConvenio({
			filas: FILAS,
			empresas: EMPRESAS,
			idEmpresaSeleccionada: 2,
			reglasConvenio: [{ modalidad: "*", criterio: "", empresa: "CDC" }],
		}),
	);

	expect(tipos).not.toEqual(expect.arrayContaining(["Laboratorio"]));
	expect(tipos).toEqual(expect.arrayContaining(["Tomografias"]));
});

test("no repite un tipo dado de alta en las dos empresas", () => {
	const tipos = resolverTiposEstudioConvenio({
		filas: [...FILAS, tipo(4, "Tomografias", 1)],
		empresas: EMPRESAS,
		idEmpresaSeleccionada: 1,
		reglasConvenio: [{ modalidad: "*", criterio: "", empresa: "CDC" }],
	});

	expect(tipos.filter((t) => t.nombre === "Tomografias")).toHaveLength(1);
});
