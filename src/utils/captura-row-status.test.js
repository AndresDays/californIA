import {
	contarVentasPorEstadoCaptura,
	filtrarVentasPorEstadoCaptura,
	obtenerClaseEstadoCapturaVenta,
	obtenerEstadoCapturaVenta,
	tieneMuestrasPendientes,
} from "./captura-row-status";

describe("captura-row-status helpers", () => {
	test("mantiene pendiente cuando algun estudio sigue en captura", () => {
		expect(
			obtenerEstadoCapturaVenta([
				{ estado_captura: "pendiente", estado_validacion: "captura" },
			]),
		).toBe("pendiente");
		expect(
			obtenerClaseEstadoCapturaVenta([
				{ estado_captura: "pendiente", estado_validacion: "captura" },
				{ estado_captura: "completado", estado_validacion: "guardado" },
			]),
		).toBe("row-pendiente");
	});

	test("mantiene pendiente cuando algun estudio tiene muestra pendiente", () => {
		const estudios = [
			{ estado_captura: "completado", estado_validacion: "guardado" },
			{
				estado_captura: "completado",
				estado_validacion: "guardado",
				muestra_pendiente: true,
			},
		];

		expect(tieneMuestrasPendientes(estudios)).toBe(true);
		expect(obtenerEstadoCapturaVenta(estudios)).toBe("pendiente");
		expect(obtenerClaseEstadoCapturaVenta(estudios)).toBe("row-pendiente");
	});

	test("usa azul cuando todos los estudios estan guardados", () => {
		expect(
			obtenerEstadoCapturaVenta([
				{ estado_captura: "completado", estado_validacion: "guardado" },
				{ estado_captura: "completado", estado_validacion: "validado" },
			]),
		).toBe("guardado");
		expect(
			obtenerClaseEstadoCapturaVenta([
				{ estado_captura: "completado", estado_validacion: "guardado" },
				{ estado_captura: "completado", estado_validacion: "guardado" },
			]),
		).toBe("row-guardado");
	});

	test("usa verde cuando todos los estudios estan validados", () => {
		expect(
			obtenerEstadoCapturaVenta([
				{ estado_captura: "completado", estado_validacion: "validado" },
			]),
		).toBe("validado");
		expect(
			obtenerClaseEstadoCapturaVenta([
				{ estado_captura: "completado", estado_validacion: "validado" },
				{ estado_captura: "completado", estado_validacion: "validado" },
			]),
		).toBe("row-validado");
	});

	test("filtra y cuenta ventas por bandeja de captura", () => {
		const ventas = [
			{
				id_venta: 1,
				estudios_venta: [
					{ estado_captura: "pendiente", estado_validacion: "captura" },
				],
			},
			{
				id_venta: 2,
				estudios_venta: [
					{ estado_captura: "completado", estado_validacion: "guardado" },
				],
			},
			{
				id_venta: 3,
				estudios_venta: [
					{ estado_captura: "completado", estado_validacion: "validado" },
				],
			},
		];

		expect(filtrarVentasPorEstadoCaptura(ventas, "guardados")).toEqual([
			ventas[1],
		]);
		expect(filtrarVentasPorEstadoCaptura(ventas, "validados")).toEqual([
			ventas[2],
		]);
		expect(contarVentasPorEstadoCaptura(ventas)).toEqual({
			todos: 3,
			pendientes: 1,
			guardados: 1,
			validados: 1,
		});
	});
});
