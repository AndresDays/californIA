import {
	construirEstudioSeleccionado,
	construirEstudioCatalogoUnificado,
	dividirEstudiosCita,
	encontrarEstudioCatalogo,
	filtrarEstudiosCatalogo,
	resolverCodigoTipoRadiologia,
	resolverEmpresaOperativaCatalogo,
	resolverModalidadDesdeTipo,
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

	test("normaliza empresa interna y tipo de estudio para filtros de imagen", () => {
		expect(resolverEmpresaOperativaCatalogo("CDI")).toBe("CDI");
		expect(
			resolverEmpresaOperativaCatalogo("CENTRO DE DIAGNOSTICO POR IMAGEN PVR"),
		).toBe("CDI");
		expect(resolverEmpresaOperativaCatalogo("Centro Diagnostico California")).toBe(
			"CDC",
		);
		expect(resolverModalidadDesdeTipo("Ultrasonidos")).toBe("ultrasonido");
		expect(resolverModalidadDesdeTipo("Estudios contrastados")).toBe(
			"estudios_contrastados",
		);
		expect(resolverModalidadDesdeTipo("Radiologia")).toBe("radiografia");
	});

	test("filtra catálogo unificado por empresa operativa y modalidad", () => {
		const estudios = [
			construirEstudioCatalogoUnificado(catalogo[0], "laboratorio"),
			construirEstudioCatalogoUnificado(
				{
					id: 10,
					clave: "US-ABDOMEN",
					descripcion: "U.S. ABDOMEN",
					id_empresa: 2,
					empresa_operativa: "CDI",
					modalidad: "ultrasonido",
					area: "Ultrasonidos",
				},
				"imagen",
			),
			construirEstudioCatalogoUnificado(
				{
					id: 11,
					clave: "RM-CRANEO",
					descripcion: "RM CRANEO SIMPLE",
					empresa_operativa: "CDC",
					modalidad: "resonancia",
					area: "Resonancia magnetica",
				},
				"imagen",
			),
		];

		expect(
			filtrarEstudiosCatalogo({
				estudios,
				busqueda: "abdomen",
				empresaId: "2",
				empresaNombre: "CDI",
				tipoNombre: "Ultrasonidos",
			}),
		).toHaveLength(1);
		expect(
			filtrarEstudiosCatalogo({
				estudios,
				busqueda: "craneo",
				empresaNombre: "CDI",
				tipoNombre: "Resonancia",
			}),
		).toHaveLength(0);
	});

	test("no vacía imagen cuando el tipo seleccionado no se reconoce exactamente", () => {
		const estudios = [
			construirEstudioCatalogoUnificado(catalogo[0], "laboratorio"),
			construirEstudioCatalogoUnificado(
				{
					id: 20,
					clave: "RX-TORAX",
					descripcion: "TORAX 2 POSICIONES",
					id_empresa: 2,
					empresa_operativa: "CDI",
					modalidad: "radiografia",
					area: "Radiologia",
				},
				"imagen",
			),
		];

		expect(
			filtrarEstudiosCatalogo({
				estudios,
				busqueda: "torax",
				empresaId: "2",
				empresaNombre: "CDI",
				tipoNombre: "Imagenologia",
			}),
		).toHaveLength(1);
	});

	test("muestra estudios contrastados de la empresa de imagen", () => {
		const estudios = [
			construirEstudioCatalogoUnificado(
				{
					id: 30,
					clave: "EC-ARTERIOGRAFIA-FEMORAL-BILATERAL",
					descripcion: "ARTERIOGRAFIA FEMORAL BILATERAL",
					id_empresa: 2,
					empresa_operativa: "CDI",
					modalidad: "estudios_contrastados",
					area: "Estudios contrastados",
				},
				"imagen",
			),
		];

		expect(
			filtrarEstudiosCatalogo({
				estudios,
				busqueda: "arte",
				empresaId: "2",
				empresaNombre: "CENTRO DE DIAGNOSTICO POR IMAGEN PVR",
				tipoNombre: "ESTUDIOS CONTRASTADOS",
			}),
		).toHaveLength(1);
	});

	test("usa códigos cortos para pendientes de radiología", () => {
		expect(
			resolverCodigoTipoRadiologia({
				clave_estudio: "RM-CRANEO-SIMPLE",
				descripcion_estudio: "RM CRANEO SIMPLE",
			}),
		).toBe("RM");
		expect(
			resolverCodigoTipoRadiologia({
				clave_estudio: "TAC-ABDOMEN-SIMPLE",
				descripcion_estudio: "TAC DE ABDOMEN SIMPLE",
			}),
		).toBe("TAC");
		expect(
			resolverCodigoTipoRadiologia({
				clave_estudio: "US-RENAL",
				descripcion_estudio: "U.S. RENAL",
			}),
		).toBe("US");
	});
});
