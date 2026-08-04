import { calcularTotalesNuevoPaciente } from "./nuevo-paciente-totales";

describe("calcularTotalesNuevoPaciente", () => {
	test("aplica el descuento al subtotal sin agregar IVA", () => {
		expect(
			calcularTotalesNuevoPaciente(
				[
					{ precio: 500, cantidad: 1 },
					{ precio: 300, cantidad: 2 },
				],
				10,
			),
		).toEqual({ subtotal: 1100, descuento: 110, total: 990 });
	});
});
