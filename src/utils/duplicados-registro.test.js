import {
	buscarDuplicadoRegistro,
	crearMensajeRegistroDuplicado,
	nombreCompletoNormalizado,
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

	// Los registros viejos guardan el nombre completo en `nombre` y los apellidos
	// vacios: es por donde se colaron los duplicados de doctores.
	test("reconoce al mismo con el nombre completo en un solo campo", () => {
		expect(
			esMismoNombreRegistro(
				{ primer_nombre: "José", apellido_paterno: "Díaz", apellido_materno: "Cortés" },
				{ nombre: "JOSE DIAZ CORTES" },
			),
		).toBe(true);
	});

	test("no confunde a dos personas distintas del mismo apellido", () => {
		expect(
			esMismoNombreRegistro(
				{ primer_nombre: "Ana", apellido_paterno: "Perez" },
				{ nombre: "LUIS PEREZ" },
			),
		).toBe(false);
	});

	test("arma el nombre completo sin repetir palabras", () => {
		expect(
			nombreCompletoNormalizado({
				nombre: "ANA PEREZ LOPEZ",
				primer_nombre: "Ana",
				apellido_paterno: "Perez",
				apellido_materno: "Lopez",
			}),
		).toBe("ana perez lopez");
	});
});

describe("buscarDuplicadoRegistro", () => {
	const supabaseCon = (filas) => {
		const consulta = {
			filtro: "",
			select: () => consulta,
			or: (expresion) => {
				consulta.filtro = expresion;
				return consulta;
			},
			limit: () => Promise.resolve({ data: filas, error: null }),
		};
		return { from: () => consulta, consulta };
	};

	test("encuentra al doctor ya registrado aunque el acento no coincida", async () => {
		const supabase = supabaseCon([
			{ id_doctor: 8, nombre: "José", apellido_paterno: "Pérez", apellido_materno: "Díaz" },
		]);

		const duplicado = await buscarDuplicadoRegistro({
			supabase,
			tabla: "doctores",
			registro: { primer_nombre: "Jose", apellido_paterno: "Perez", apellido_materno: "Diaz" },
			idCampo: "id_doctor",
		});

		expect(duplicado?.id_doctor).toBe(8);
		// El patron cambia las vocales por comodines para que el acento no importe.
		expect(supabase.consulta.filtro).toContain("p_r_z");
	});

	test("revisa tambien cuando solo se capturo el nombre completo", async () => {
		const supabase = supabaseCon([{ id_doctor: 3, nombre: "MARIA LOPEZ SOTO" }]);

		const duplicado = await buscarDuplicadoRegistro({
			supabase,
			tabla: "doctores",
			registro: { nombre: "Maria Lopez Soto" },
			idCampo: "id_doctor",
		});

		expect(duplicado?.id_doctor).toBe(3);
	});

	test("no se marca a si mismo al editar", async () => {
		const supabase = supabaseCon([
			{ id_paciente: 5, primer_nombre: "Ana", apellido_paterno: "Perez" },
		]);

		const duplicado = await buscarDuplicadoRegistro({
			supabase,
			tabla: "pacientes",
			registro: { primer_nombre: "Ana", apellido_paterno: "Perez" },
			idCampo: "id_paciente",
			idActual: 5,
		});

		expect(duplicado).toBeNull();
	});

	test("sin nombre no hay nada que revisar", async () => {
		const supabase = supabaseCon([]);
		await expect(
			buscarDuplicadoRegistro({
				supabase,
				tabla: "doctores",
				registro: {},
				idCampo: "id_doctor",
			}),
		).resolves.toBeNull();
	});
});
