import { readFileSync } from "fs";
import { join } from "path";

const fuenteFuncion = () =>
	readFileSync(join(process.cwd(), "supabase/functions/admin-users/index.ts"), "utf8");

describe("permisos de admin-users", () => {
	test("permite que cualquier empleado activo cree y edite doctores sin abrir acciones administrativas", () => {
		const fuente = fuenteFuncion();

		expect(fuente).toContain('const puedeGestionarDoctor = ["createDoctor", "updateDoctor"].includes(body.action);');
		expect(fuente).toContain('(!isAdminRole(empleadoAdmin.rol) && !puedeGestionarDoctor)');
		expect(fuente).toContain('if (body.action === "updatePassword" || body.action === "updateDoctorPassword")');
	});

	test("crea el registro de un doctor sin cuenta cuando no recibe credenciales", () => {
		const fuente = fuenteFuncion();

		expect(fuente).toContain('const crearAcceso = Boolean(clean(doctor.email) && clean(doctor.contrasena));');
		expect(fuente).toContain('buildDoctorPayload(doctor, authUser?.id || null)');
		expect(fuente).toContain('if (crearAcceso) {');
	});
});
