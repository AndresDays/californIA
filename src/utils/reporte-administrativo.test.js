import {
	agruparEstudiosMasVendidosAdmin,
	agruparIngresosPorSucursal,
	agruparPorArea,
	agruparRemitentesAdmin,
	calcularPendientesPorEtapa,
	calcularResumenAdministrativo,
	calcularTiemposPromedio,
	formatoDuracionHoras,
} from "./reporte-administrativo";
import { EVENTOS_SOLICITUD } from "./solicitud-auditoria";

const ventas = [
	{
		id_venta: 1,
		estado: "activo",
		total: 1000,
		pago_recibido: 800,
		id_sucursal: 2,
		id_doctor: 10,
		id_cliente: 20,
		estudios_venta: [
			{ descripcion_estudio: "BIOMETRIA HEMATICA", area: "Laboratorio", precio: 250, estado_validacion: "captura" },
			{ descripcion_estudio: "RM CRANEO SIMPLE", area: "Imagen", precio: 750, estado_validacion: "guardado" },
		],
	},
	{
		id_venta: 2,
		estado: "activo",
		total: 500,
		pago_recibido: 500,
		id_sucursal: 3,
		id_doctor: 10,
		id_cliente: 21,
		estudios_venta: [
			{ descripcion_estudio: "BIOMETRIA HEMATICA", area: "Laboratorio", precio: 500, estado_validacion: "validado", entregado: false },
		],
	},
];

describe("reporte-administrativo helpers", () => {
	test("agrupa productividad por area y estudios mas vendidos", () => {
		expect(agruparPorArea(ventas)).toEqual([
			{ nombre: "Laboratorio", estudios: 2, ingreso: 750 },
			{ nombre: "Imagen", estudios: 1, ingreso: 750 },
		]);
		expect(agruparEstudiosMasVendidosAdmin(ventas)[0]).toMatchObject({
			nombre: "BIOMETRIA HEMATICA",
			cantidad: 2,
			ingreso: 750,
		});
	});

	test("calcula pendientes por etapa incluyendo radiologia", () => {
		const etapas = calcularPendientesPorEtapa(ventas, [
			{ estado: "POR ASIGNAR", listo_entrega: false, entregado: false },
			{ estado: "EN PROCESO", listo_entrega: false, entregado: false },
			{ estado: "COMPLETADO", listo_entrega: true, entregado: false },
		]);
		expect(etapas.find((etapa) => etapa.id === "captura").total).toBe(1);
		expect(etapas.find((etapa) => etapa.id === "guardado").total).toBe(1);
		expect(etapas.find((etapa) => etapa.id === "validado").total).toBe(1);
		expect(etapas.find((etapa) => etapa.id === "radiologia_toma").total).toBe(1);
		expect(etapas.find((etapa) => etapa.id === "radiologia_interpretar").total).toBe(1);
		expect(etapas.find((etapa) => etapa.id === "entrega").total).toBe(1);
	});

	test("agrupa ingresos por sucursal y remitentes", () => {
		expect(
			agruparIngresosPorSucursal(ventas, [
				{ id_sucursal: 2, nombre: "Principal" },
				{ id_sucursal: 3, nombre: "Mascota" },
			]),
		).toEqual([
			{ nombre: "Principal", ordenes: 1, ingreso: 1000, adeudo: 200 },
			{ nombre: "Mascota", ordenes: 1, ingreso: 500, adeudo: 0 },
		]);

		const remitentes = agruparRemitentesAdmin(
			ventas,
			[{ id_doctor: 10, nombre: "Dra. Gomez" }],
			[
				{ id_cliente: 20, nombre: "Empresa A" },
				{ id_cliente: 21, nombre: "Empresa B" },
			],
		);
		expect(remitentes.doctores[0]).toMatchObject({ nombre: "Dra. Gomez", ordenes: 2 });
		expect(remitentes.clientes).toHaveLength(2);
	});

	test("calcula tiempos promedio desde auditoria", () => {
		const eventos = [
			{ id_venta: 1, evento: EVENTOS_SOLICITUD.CREADA, created_at: "2026-05-12T10:00:00Z" },
			{ id_venta: 1, evento: EVENTOS_SOLICITUD.CAPTURADA, created_at: "2026-05-12T11:00:00Z" },
			{ id_venta: 1, evento: EVENTOS_SOLICITUD.VALIDADA, created_at: "2026-05-12T13:00:00Z" },
			{ id_venta: 1, evento: EVENTOS_SOLICITUD.ENTREGADA, created_at: "2026-05-12T16:00:00Z" },
		];
		const tiempos = calcularTiemposPromedio(eventos);
		expect(tiempos.find((item) => item.id === "recepcion_captura").promedio).toBe(1);
		expect(tiempos.find((item) => item.id === "captura_validacion").promedio).toBe(2);
		expect(tiempos.find((item) => item.id === "validacion_entrega").promedio).toBe(3);
		expect(tiempos.find((item) => item.id === "recepcion_entrega").promedio).toBe(6);
		expect(formatoDuracionHoras(0.5)).toBe("30 min");
	});

	test("calcula resumen general", () => {
		const resumen = calcularResumenAdministrativo(ventas, [], []);
		expect(resumen.totalIngresos).toBe(1500);
		expect(resumen.totalAdeudos).toBe(200);
		expect(resumen.totalVentas).toBe(2);
		expect(resumen.totalEstudios).toBe(3);
	});
});
