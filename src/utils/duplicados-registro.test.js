import {
	crearMensajeRegistroDuplicado,
	esMismoNombreRegistro,
	normalizarNombreDuplicado,
	obtenerNombreCompletoRegistro,
} from "./duplicados-registro";

describe("duplicados-registro", () => {
	test("normaliza acentos, espacios y mayusculas", () => {
		expect(normalizarNombreDuplicado("  JOSÉ   Díaz ")).toBe("jose diaz");
	});

	test("compara nombre y apellidos normalizados", () => {
		expect(
			esMismoNombreRegistro(
				{ primer_nombre: "José", apellido_paterno: "Díaz", apellido_materno: "Cortés" },
				{ nombre: "jose", apellido_paterno: "diaz", apellido_materno: "cortes" },
			),
		).toBe(true);
	});

	test("detecta cuando cambia algun apellido", () => {
		expect(
			esMismoNombreRegistro(
				{ primer_nombre: "Ana", apellido_paterno: "Perez", apellido_materno: "Lopez" },
				{ primer_nombre: "Ana", apellido_paterno: "Perez", apellido_materno: "Garcia" },
			),
		).toBe(false);
	});

	test("construye nombre completo legible", () => {
		expect(
			obtenerNombreCompletoRegistro({
				primer_nombre: "Ana",
				apellido_paterno: "Perez",
				apellido_materno: "Lopez",
			}),
		).toBe("Ana Perez Lopez");
	});

	test("construye mensaje de duplicado", () => {
		expect(
			crearMensajeRegistroDuplicado({
				tipo: "paciente",
				duplicado: {
					primer_nombre: "Ana",
					apellido_paterno: "Perez",
					apellido_materno: "Lopez",
				},
			}),
		).toBe("Ya existe un paciente con ese nombre: Ana Perez Lopez. ¿Deseas agregar otro igual?");
	});
});
