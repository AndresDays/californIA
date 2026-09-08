import {
	MINUTOS_VENTA_DUPLICADA,
	buscarVentaDuplicada,
	inicioVentanaDuplicados,
	mensajeVentaDuplicada,
} from "./venta-duplicada";

const ahora = new Date("2026-09-07T18:00:00Z");
const haceMinutos = (minutos) =>
	new Date(ahora.getTime() - minutos * 60 * 1000).toISOString();

describe("buscarVentaDuplicada", () => {
	test("encuentra la orden del mismo importe registrada hace un momento", () => {
		const duplicada = buscarVentaDuplicada({
			ventas: [{ folio: "C0001", total: 1040, estado: "activo", fecha_venta: haceMinutos(2) }],
			total: 1040,
			ahora,
		});
		expect(duplicada?.folio).toBe("C0001");
	});

	test("un importe distinto es otra orden", () => {
		expect(
			buscarVentaDuplicada({
				ventas: [{ folio: "C0001", total: 500, estado: "activo", fecha_venta: haceMinutos(2) }],
				total: 1040,
				ahora,
			}),
		).toBeNull();
	});

	test("una orden vieja no estorba: el paciente puede volver el mismo día", () => {
		expect(
			buscarVentaDuplicada({
				ventas: [
					{
						folio: "C0001",
						total: 1040,
						estado: "activo",
						fecha_venta: haceMinutos(MINUTOS_VENTA_DUPLICADA + 5),
					},
				],
				total: 1040,
				ahora,
			}),
		).toBeNull();
	});

	test("una orden cancelada se puede reponer igual", () => {
		expect(
			buscarVentaDuplicada({
				ventas: [
					{ folio: "C0001", total: 1040, estado: "cancelado", fecha_venta: haceMinutos(1) },
				],
				total: 1040,
				ahora,
			}),
		).toBeNull();
	});
});

test("la ventana de duplicados va hacia atrás", () => {
	expect(inicioVentanaDuplicados(ahora, 10).toISOString()).toBe("2026-09-07T17:50:00.000Z");
});

test("el aviso dice qué folio ya existe", () => {
	expect(mensajeVentaDuplicada({ folio: "C0001" })).toContain("C0001");
});
