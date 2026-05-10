import {
	formatearDoctorBusqueda,
	formatearPacienteBusqueda,
} from "./nuevo-paciente-busqueda";

describe("nuevo-paciente busqueda helpers", () => {
	test("formatea datos compactos de paciente sin emojis", () => {
		expect(
			formatearPacienteBusqueda({
				telefono: "6641234567",
				edad: 32,
				sexo: "femenino",
			}),
		).toEqual(["6641234567", "32 años", "femenino"]);
	});

	test("formatea datos compactos de doctor con titulo", () => {
		expect(
			formatearDoctorBusqueda({
				nombre: "JUAN PEREZ",
				telefono: "6647654321",
			}),
		).toEqual({
			nombre: "Dr. JUAN PEREZ",
			detalles: ["6647654321"],
		});
	});
});
