import {
	combinarClientesConAccesos,
	correoDeUsuarioCliente,
	normalizarUsuarioCliente,
	resolverCorreoDeAcceso,
	moduloDeRolCliente,
	rolDeModuloCliente,
	puedeAdministrarAccesosClientes,
	validarAccesoCliente,
} from "./clientes-accesos";

describe("accesos de clientes de convenio", () => {
	test("cada modulo tiene su rol y viceversa", () => {
		expect(rolDeModuloCliente("imagen")).toBe("cliente_imagen");
		expect(rolDeModuloCliente("laboratorio")).toBe("cliente_laboratorio");
		expect(moduloDeRolCliente("cliente_laboratorio")).toBe("laboratorio");
		expect(moduloDeRolCliente("recepcionista")).toBe("");
	});

	// Los accesos los da dirección: el radiologo director se guarda como
	// `radiologo`.
	test("solo direccion y desarrollo administran los accesos", () => {
		expect(puedeAdministrarAccesosClientes("Administrador")).toBe(true);
		expect(puedeAdministrarAccesosClientes("Radiólogo")).toBe(true);
		expect(puedeAdministrarAccesosClientes("desarrollador")).toBe(true);
		expect(puedeAdministrarAccesosClientes("recepcionista")).toBe(false);
		expect(puedeAdministrarAccesosClientes("quimico")).toBe(false);
	});

	test("la tabla muestra todos los clientes, tengan acceso o no", () => {
		const filas = combinarClientesConAccesos(
			[
				{ id_cliente: 1, nombre: "MEDISIM" },
				{ id_cliente: 2, nombre: "IMSS" },
			],
			[{ id_cliente: 1, modulo: "imagen", usuario: "medisim-img" }],
		);

		expect(filas).toHaveLength(2);
		expect(filas[0].accesos.imagen.usuario).toBe("medisim-img");
		expect(filas[0].accesos.laboratorio).toBeUndefined();
		expect(filas[1].accesos).toEqual({});
	});

	// El convenio entra con un usuario de la empresa, no con el correo de nadie.
	test("el usuario se guarda sin acentos, espacios ni mayusculas", () => {
		expect(normalizarUsuarioCliente("  MEDISIM Lab  ")).toBe("medisim-lab");
		expect(normalizarUsuarioCliente("Clínica Ángel")).toBe("clinica-angel");
		expect(normalizarUsuarioCliente("medisim_lab.01")).toBe("medisim_lab.01");
		expect(normalizarUsuarioCliente("   ")).toBe("");
	});

	// El proveedor de identidad sólo autentica correos: el usuario siempre da el
	// mismo correo interno, que nadie teclea ni ve.
	test("el usuario se convierte siempre al mismo correo interno", () => {
		expect(correoDeUsuarioCliente("MEDISIM Lab")).toBe(
			"medisim-lab@convenios.californiadiagnostica.mx",
		);
		expect(correoDeUsuarioCliente("")).toBe("");
	});

	test("en el login el correo entra tal cual y lo demas como usuario", () => {
		expect(resolverCorreoDeAcceso("ana@california.mx")).toBe("ana@california.mx");
		expect(resolverCorreoDeAcceso("medisim-lab")).toBe(
			"medisim-lab@convenios.californiadiagnostica.mx",
		);
		expect(resolverCorreoDeAcceso("  ")).toBe("");
	});

	test("el usuario es obligatorio, sin arroba y de al menos tres caracteres", () => {
		expect(validarAccesoCliente({ usuario: "", contrasena: "12345678" })).toMatch(/obligatorio/i);
		expect(validarAccesoCliente({ usuario: "ab", contrasena: "12345678" })).toMatch(/3 caracteres/);
		expect(validarAccesoCliente({ usuario: "img@medisim.mx", contrasena: "12345678" })).toMatch(
			/arroba/i,
		);
		expect(validarAccesoCliente({ usuario: "medisim-lab", contrasena: "12345678" })).toBe("");
	});

	test("la contrasena es obligatoria al crear y opcional al editar", () => {
		expect(validarAccesoCliente({ usuario: "medisim-lab", contrasena: "" })).toMatch(/8 caracteres/);
		expect(
			validarAccesoCliente({ usuario: "medisim-lab", contrasena: "", esNuevo: false }),
		).toBe("");
		expect(
			validarAccesoCliente({ usuario: "medisim-lab", contrasena: "corta", esNuevo: false }),
		).toMatch(/8 caracteres/);
	});
});
