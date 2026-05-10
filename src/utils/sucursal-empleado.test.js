import {
	agregarSucursalEmpleadoPayload,
	resolverSucursalEmpleado,
} from "./sucursal-empleado";

const sucursales = [
	{ id_sucursal: 1, nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	{ id_sucursal: 2, nombre: "IXTAPA" },
	{ id_sucursal: 3, nombre: "MASCOTA" },
];

describe("sucursal del empleado", () => {
	test("resuelve el id de sucursal desde el nombre guardado en empleado", () => {
		expect(
			resolverSucursalEmpleado(
				{ sucursal: "central diagnostica california" },
				sucursales,
			),
		).toEqual({
			id_sucursal: 1,
			sucursal: "CENTRAL DIAGNOSTICA CALIFORNIA",
		});
	});

	test("conserva el texto cuando no encuentra la sucursal en catalogo", () => {
		expect(resolverSucursalEmpleado({ sucursal: "Sucursal vieja" }, sucursales)).toEqual({
			id_sucursal: null,
			sucursal: "Sucursal vieja",
		});
	});

	test("agrega los campos de sucursal a un payload existente", () => {
		expect(
			agregarSucursalEmpleadoPayload(
				{ id_venta: 10, descripcion_estudio: "Biometria" },
				{ id_sucursal: 2, sucursal: "IXTAPA" },
			),
		).toEqual({
			id_venta: 10,
			descripcion_estudio: "Biometria",
			id_sucursal: 2,
			sucursal: "IXTAPA",
		});
	});
});
