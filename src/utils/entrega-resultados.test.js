import {
	calcularPendientesEntrega,
	calcularSaldoEntrega,
	estaEnRangoEntrega,
	filtrarVentasEntrega,
	tieneSaldoPendiente,
	estudioLaboratorioListoEntrega,
	ventaCompletaListaEntrega,
	ventaListaEnRangoEntrega,
} from "./entrega-resultados";

describe("entrega-resultados helpers", () => {
	const ventas = [
		{
			id_venta: 1,
			folio: "LAB-001",
			total: 500,
			pago_recibido: 500,
			pacientes: { nombre: "Ana Lopez" },
			clientes: { nombre: "Empresa Norte" },
			estudios_venta: [
				{ estado_validacion: "validado", entregado: false },
				{ estado_validacion: "validado", entregado: true },
			],
		},
		{
			id_venta: 2,
			folio: "LAB-002",
			total: 800,
			pago_recibido: 300,
			pacientes: { nombre: "Carlos Ruiz" },
			clientes: null,
			estudios_venta: [
				{ estado_validacion: "guardado", entregado: false },
				{ estado_validacion: "validado", entregado: false },
			],
		},
	];

	test("cuenta solo estudios validados pendientes de entrega", () => {
		expect(calcularPendientesEntrega(ventas[0].estudios_venta)).toBe(1);
		expect(calcularPendientesEntrega(ventas[1].estudios_venta)).toBe(1);
	});

	test("trata muestra pendiente null como entregable y true como bloqueada", () => {
		const estudiosVenta = [
			{
				estado_validacion: "validado",
				entregado: false,
				muestra_pendiente: null,
			},
			{
				estado_validacion: "validado",
				entregado: false,
				muestra_pendiente: true,
			},
			{
				estado_validacion: "validado",
				entregado: false,
				muestra_pendiente: false,
			},
		];

		expect(calcularPendientesEntrega(estudiosVenta)).toBe(2);
	});

	test("usa la fecha de validacion para el rango de entrega", () => {
		const estudio = {
			estado_validacion: "validado",
			entregado: false,
			fecha_venta: "2026-05-09T16:00:00.000Z",
			updated_at: "2026-05-11T18:00:00.000Z",
		};

		expect(estaEnRangoEntrega(estudio, "2026-05-11", "2026-05-11")).toBe(
			true,
		);
		expect(estaEnRangoEntrega(estudio, "2026-05-09", "2026-05-09")).toBe(
			false,
		);
	});

	test("incluye ventas de hoy aunque el estudio no tenga fecha lista confiable", () => {
		const venta = {
			fecha_venta: "2026-05-11T17:00:00.000Z",
			estudios_venta: [
				{
					estado_validacion: "validado",
					entregado: false,
					muestra_pendiente: false,
					updated_at: null,
				},
			],
			estudios_radiologia: [],
		};

		expect(ventaListaEnRangoEntrega(venta, "2026-05-11", "2026-05-11")).toBe(
			true,
		);
	});

	test("suma reportes de radiologia listos a los pendientes de entrega", () => {
		const estudiosRadiologia = [
			{ listo_entrega: true, entregado: false },
			{ listo_entrega: true, entregado: true },
			{ listo_entrega: false, entregado: false },
		];

		expect(
			calcularPendientesEntrega(ventas[0].estudios_venta, estudiosRadiologia),
		).toBe(2);
	});

	test("no cuenta estudios de imagen de estudios_venta como laboratorio", () => {
		const estudiosVenta = [
			{
				clave_estudio: "RM-ABDOMEN-SIMPLE",
				descripcion_estudio: "RM ABDOMEN SIMPLE",
				area: "Resonancia magnetica",
				estado_validacion: "validado",
				entregado: false,
			},
		];
		const estudiosRadiologia = [
			{
				listo_entrega: true,
				entregado: false,
			},
		];

		expect(calcularPendientesEntrega(estudiosVenta, estudiosRadiologia)).toBe(1);
	});

	test("bloquea entrega mixta hasta que laboratorio e imagen esten listos", () => {
		const ventaMixtaPendienteImagen = {
			fecha_venta: "2026-05-11T17:00:00.000Z",
			estudios_venta: [
				{
					clave_estudio: "QS3",
					estado_validacion: "validado",
					entregado: false,
					muestra_pendiente: false,
				},
				{
					clave_estudio: "RM-CRANEO-SIMPLE",
					estado_validacion: "pendiente",
					entregado: false,
				},
			],
			estudios_radiologia_todos: [
				{ listo_entrega: false, entregado: false },
			],
			estudios_radiologia: [],
		};

		expect(ventaCompletaListaEntrega(ventaMixtaPendienteImagen)).toBe(false);
		expect(
			ventaListaEnRangoEntrega(
				ventaMixtaPendienteImagen,
				"2026-05-11",
				"2026-05-11",
			),
		).toBe(false);

		const ventaMixtaLista = {
			...ventaMixtaPendienteImagen,
			estudios_radiologia_todos: [
				{ listo_entrega: true, entregado: false, updated_at: "2026-05-11T18:00:00.000Z" },
			],
			estudios_radiologia: [
				{ listo_entrega: true, entregado: false, updated_at: "2026-05-11T18:00:00.000Z" },
			],
		};

		expect(ventaCompletaListaEntrega(ventaMixtaLista)).toBe(true);
		expect(
			ventaListaEnRangoEntrega(ventaMixtaLista, "2026-05-11", "2026-05-11"),
		).toBe(true);
	});

	test("filtra por folio, paciente o cliente en una busqueda general", () => {
		expect(filtrarVentasEntrega(ventas, "ana")).toEqual([ventas[0]]);
		expect(filtrarVentasEntrega(ventas, "LAB-002")).toEqual([ventas[1]]);
		expect(filtrarVentasEntrega(ventas, "empresa")).toEqual([ventas[0]]);
		expect(filtrarVentasEntrega(ventas, "")).toEqual(ventas);
	});

	test("calcula saldo pendiente para alertar antes de entregar", () => {
		expect(calcularSaldoEntrega(ventas[0])).toBe(0);
		expect(calcularSaldoEntrega(ventas[1])).toBe(500);
		expect(tieneSaldoPendiente(ventas[0])).toBe(false);
		expect(tieneSaldoPendiente(ventas[1])).toBe(true);
	});

	// Documenta por qué el filtro que se empujó al servidor en
	// use-entrega-resultados usa `.not(col, 'is', true)` y no `.eq(col, false)`:
	// aquí NULL cuenta como pendiente, así que `.eq(col, false)` perdería estudios.
	test("trata entregado/muestra_pendiente nulos como pendientes de entrega", () => {
		expect(
			estudioLaboratorioListoEntrega({
				estado_validacion: "validado",
				entregado: null,
				muestra_pendiente: null,
			}),
		).toBe(true);
		expect(
			estudioLaboratorioListoEntrega({
				estado_validacion: "validado",
				entregado: false,
				muestra_pendiente: false,
			}),
		).toBe(true);
		expect(
			estudioLaboratorioListoEntrega({
				estado_validacion: "validado",
				entregado: true,
			}),
		).toBe(false);
		expect(
			estudioLaboratorioListoEntrega({
				estado_validacion: "validado",
				muestra_pendiente: true,
			}),
		).toBe(false);
	});
});
