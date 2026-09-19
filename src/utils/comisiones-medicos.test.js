import {
	construirConcentradoMensual,
	esDoctorSinRemitente,
	filtrarVentasPorRango,
	limitesDelPeriodo,
	nombreDoctor,
	porcentajeVigente,
	rangoDelPeriodo,
	totalesConcentrado,
} from "./comisiones-medicos";

describe("porcentajeVigente", () => {
	const historial = [
		{ porcentaje: 10, vigente_desde: "2026-01-01" },
		{ porcentaje: 15, vigente_desde: "2026-08-15" },
		{ porcentaje: 20, vigente_desde: "2026-10-01" },
	];

	test("toma el porcentaje vigente al cierre del mes", () => {
		expect(porcentajeVigente(historial, "2026-08")).toBe(15);
		expect(porcentajeVigente(historial, "2026-07")).toBe(10);
		expect(porcentajeVigente(historial, "2026-12")).toBe(20);
	});

	test("no aplica un porcentaje que empieza despues del mes consultado", () => {
		expect(porcentajeVigente([{ porcentaje: 10, vigente_desde: "2026-09-01" }], "2026-08")).toBeNull();
	});

	test("sin historial no hay porcentaje", () => {
		expect(porcentajeVigente([], "2026-08")).toBeNull();
		expect(porcentajeVigente(undefined, "2026-08")).toBeNull();
	});

	test("un porcentaje que arranca el ultimo dia del mes ya cuenta para ese mes", () => {
		expect(porcentajeVigente([{ porcentaje: 20, vigente_desde: "2026-08-31" }], "2026-08")).toBe(20);
	});
});

describe("rangoDelPeriodo", () => {
	test("cubre el mes completo en horario de Mexico", () => {
		expect(rangoDelPeriodo("2026-08")).toEqual({
			inicio: "2026-08-01T00:00:00-06:00",
			fin: "2026-09-01T00:00:00-06:00",
		});
	});

	test("cruza bien el cambio de anio", () => {
		expect(rangoDelPeriodo("2026-12")).toEqual({
			inicio: "2026-12-01T00:00:00-06:00",
			fin: "2027-01-01T00:00:00-06:00",
		});
	});
});

describe("construirConcentradoMensual", () => {
	const doctores = [
		{ id_doctor: 1, nombre: "Juan Díaz" },
		{ id_doctor: 2, nombre: "María López" },
	];
	const comisiones = [
		{ id_doctor: 1, porcentaje: 10, vigente_desde: "2026-01-01" },
		{ id_doctor: 2, porcentaje: 20, vigente_desde: "2026-01-01" },
	];

	test("calcula ingreso y comision por medico", () => {
		const ventas = [
			{ id_doctor: 1, total: 30000, estado: "activo" },
			{ id_doctor: 1, total: 20000, estado: "activo" },
			{ id_doctor: 2, total: 100000, estado: "activo" },
		];
		expect(construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" })).toEqual([
			{
				idDoctor: 2,
				nombre: "María López",
				ordenes: 1,
				ingreso: 100000,
				porcentaje: 20,
				comision: 20000,
				sinPorcentaje: false,
			},
			{
				idDoctor: 1,
				nombre: "Juan Díaz",
				ordenes: 2,
				ingreso: 50000,
				porcentaje: 10,
				comision: 5000,
				sinPorcentaje: false,
			},
		]);
	});

	test("ignora las ventas canceladas", () => {
		const ventas = [
			{ id_doctor: 1, total: 50000, estado: "activo" },
			{ id_doctor: 1, total: 90000, estado: "cancelado" },
		];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" });
		expect(fila).toMatchObject({ ordenes: 1, ingreso: 50000, comision: 5000 });
	});

	test("marca al medico que genero ingreso sin porcentaje asignado", () => {
		const ventas = [{ id_doctor: 9, total: 12300, estado: "activo" }];
		const [fila] = construirConcentradoMensual({
			ventas,
			doctores: [...doctores, { id_doctor: 9, nombre: "Jorge Mendoza" }],
			comisiones,
			periodo: "2026-08",
		});
		expect(fila).toEqual({
			idDoctor: 9,
			nombre: "Jorge Mendoza",
			ordenes: 1,
			ingreso: 12300,
			porcentaje: null,
			comision: 0,
			sinPorcentaje: true,
		});
	});

	test("redondea la comision a dos decimales", () => {
		const ventas = [{ id_doctor: 1, total: 1234.56, estado: "activo" }];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" });
		expect(fila.comision).toBe(123.46);
	});

	test("omite las ventas sin medico remitente", () => {
		const ventas = [
			{ id_doctor: null, total: 5000, estado: "activo" },
			{ total: 7000, estado: "activo" },
		];
		expect(construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" })).toEqual([]);
	});

	test("usa el porcentaje vigente en el mes consultado, no el mas reciente", () => {
		const ventas = [{ id_doctor: 1, total: 100000, estado: "activo" }];
		const historial = [
			{ id_doctor: 1, porcentaje: 10, vigente_desde: "2026-01-01" },
			{ id_doctor: 1, porcentaje: 20, vigente_desde: "2026-09-01" },
		];
		const [agosto] = construirConcentradoMensual({
			ventas,
			doctores,
			comisiones: historial,
			periodo: "2026-08",
		});
		const [septiembre] = construirConcentradoMensual({
			ventas,
			doctores,
			comisiones: historial,
			periodo: "2026-09",
		});
		expect(agosto.comision).toBe(10000);
		expect(septiembre.comision).toBe(20000);
	});

	test("un medico con ventas que no esta en el catalogo no rompe el concentrado", () => {
		const ventas = [{ id_doctor: 77, total: 1000, estado: "activo" }];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" });
		expect(fila).toMatchObject({ idDoctor: 77, nombre: "Sin nombre", ingreso: 1000 });
	});

	test("trata los importes en texto como numeros", () => {
		const ventas = [{ id_doctor: 1, total: "50000.00", estado: "activo" }];
		const [fila] = construirConcentradoMensual({ ventas, doctores, comisiones, periodo: "2026-08" });
		expect(fila).toMatchObject({ ingreso: 50000, comision: 5000 });
	});

	test("sin ventas regresa una lista vacia", () => {
		expect(construirConcentradoMensual({ ventas: [], doctores, comisiones, periodo: "2026-08" })).toEqual([]);
		expect(construirConcentradoMensual({ periodo: "2026-08" })).toEqual([]);
	});
});

describe("totalesConcentrado", () => {
	test("suma ordenes, ingreso y comision, y cuenta a los que no tienen porcentaje", () => {
		expect(
			totalesConcentrado([
				{ ordenes: 2, ingreso: 50000, comision: 5000, sinPorcentaje: false },
				{ ordenes: 1, ingreso: 100000, comision: 20000, sinPorcentaje: false },
				{ ordenes: 4, ingreso: 12300, comision: 0, sinPorcentaje: true },
			]),
		).toEqual({
			medicos: 3,
			ordenes: 7,
			ingreso: 162300,
			comision: 25000,
			sinPorcentaje: 1,
		});
	});

	test("una lista vacia da ceros", () => {
		expect(totalesConcentrado([])).toEqual({
			medicos: 0,
			ordenes: 0,
			ingreso: 0,
			comision: 0,
			sinPorcentaje: 0,
		});
	});
});

describe("nombreDoctor", () => {
	test("arma el nombre completo cuando viene en partes", () => {
		expect(
			nombreDoctor({ primer_nombre: "María", apellido_paterno: "López", apellido_materno: "Ruiz" }),
		).toBe("María López Ruiz");
	});

	test("cae al campo nombre cuando no hay partes", () => {
		expect(nombreDoctor({ nombre: "Juan Díaz" })).toBe("Juan Díaz");
	});

	test("sin datos regresa el texto de relleno", () => {
		expect(nombreDoctor(null)).toBe("Sin nombre");
		expect(nombreDoctor({})).toBe("Sin nombre");
	});
});

describe("limitesDelPeriodo", () => {
	test("da el primer y el último día del mes", () => {
		expect(limitesDelPeriodo("2026-08")).toEqual({ desde: "2026-08-01", hasta: "2026-08-31" });
		expect(limitesDelPeriodo("2026-02")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
	});

	test("sin periodo no inventa fechas", () => {
		expect(limitesDelPeriodo("")).toEqual({ desde: "", hasta: "" });
	});
});

describe("filtrarVentasPorRango", () => {
	const ventas = [
		{ id_venta: 1, fecha_venta: "2026-08-14T18:00:00-06:00" },
		{ id_venta: 2, fecha_venta: "2026-08-15T09:30:00-06:00" },
		// Las 23:00 del último día del rango siguen siendo de ese día, no del
		// siguiente: con UTC se iban al día de después.
		{ id_venta: 3, fecha_venta: "2026-08-31T23:00:00-06:00" },
		{ id_venta: 4, fecha_venta: "2026-09-01T08:00:00-06:00" },
	];

	test("deja sólo las ventas de los días elegidos", () => {
		expect(
			filtrarVentasPorRango(ventas, "2026-08-15", "2026-08-31").map((v) => v.id_venta),
		).toEqual([2, 3]);
	});

	test("un solo día se acota a ese día", () => {
		expect(
			filtrarVentasPorRango(ventas, "2026-08-15", "2026-08-15").map((v) => v.id_venta),
		).toEqual([2]);
	});

	test("sin rango no se filtra nada", () => {
		expect(filtrarVentasPorRango(ventas, "", "")).toHaveLength(4);
	});

	test("una fecha ilegible no se cuela", () => {
		expect(filtrarVentasPorRango([{ fecha_venta: null }], "2026-08-01", "2026-08-31")).toEqual([]);
	});
});

describe("esDoctorSinRemitente", () => {
	test("reconoce el registro que se usa cuando la orden no trae médico", () => {
		expect(esDoctorSinRemitente({ nombre: "A QUIEN CORRESPONDA" })).toBe(true);
		expect(esDoctorSinRemitente({ nombre: "  a quien corresponda " })).toBe(true);
		expect(esDoctorSinRemitente("A Quién Corresponda")).toBe(true);
	});

	test("un médico de verdad no se confunde con él", () => {
		expect(esDoctorSinRemitente({ nombre: "Juan Díaz" })).toBe(false);
		expect(esDoctorSinRemitente(null)).toBe(false);
	});
});

describe("construirConcentradoMensual y el remitente vacío", () => {
	// Sus órdenes no las mandó nadie: cobrarle comisión a ese renglón no tiene
	// a quién pagársela, y ensucia el concentrado.
	test("deja fuera a A quien corresponda", () => {
		const filas = construirConcentradoMensual({
			ventas: [
				{ id_doctor: 1, total: 1000, estado: "activo" },
				{ id_doctor: 99, total: 5000, estado: "activo" },
			],
			doctores: [
				{ id_doctor: 1, nombre: "Juan Díaz" },
				{ id_doctor: 99, nombre: "A QUIEN CORRESPONDA" },
			],
			comisiones: [{ id_doctor: 1, porcentaje: 10, vigente_desde: "2026-01-01" }],
			periodo: "2026-08",
		});

		expect(filas.map((fila) => fila.nombre)).toEqual(["Juan Díaz"]);
	});
});
