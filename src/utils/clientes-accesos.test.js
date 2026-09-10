import {
	combinarClientesConAccesos,
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
			[{ id_cliente: 1, modulo: "imagen", email: "img@medisim.mx" }],
		);

		expect(filas).toHaveLength(2);
		expect(filas[0].accesos.imagen.email).toBe("img@medisim.mx");
		expect(filas[0].accesos.laboratorio).toBeUndefined();
		expect(filas[1].accesos).toEqual({});
	});

	// Se entra a la plataforma con correo y contraseña, así que el usuario tiene
	// que ser un correo o el convenio no podría iniciar sesión.
	test("el usuario debe ser un correo", () => {
		expect(validarAccesoCliente({ email: "", contrasena: "12345678" })).toMatch(/obligatorio/i);
		expect(validarAccesoCliente({ email: "medisim", contrasena: "12345678" })).toMatch(/correo/i);
		expect(validarAccesoCliente({ email: "img@medisim.mx", contrasena: "12345678" })).toBe("");
	});

	test("la contrasena es obligatoria al crear y opcional al editar", () => {
		expect(validarAccesoCliente({ email: "img@medisim.mx", contrasena: "" })).toMatch(/8 caracteres/);
		expect(
			validarAccesoCliente({ email: "img@medisim.mx", contrasena: "", esNuevo: false }),
		).toBe("");
		expect(
			validarAccesoCliente({ email: "img@medisim.mx", contrasena: "corta", esNuevo: false }),
		).toMatch(/8 caracteres/);
	});
});
