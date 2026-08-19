import { readFileSync } from "fs";
import { join } from "path";

const fuenteFuncion = () =>
	readFileSync(join(process.cwd(), "supabase/functions/admin-users/index.ts"), "utf8");

describe("permisos de admin-users", () => {
	test("permite que cualquier empleado activo cree doctores sin abrir acciones administrativas", () => {
		const fuente = fuenteFuncion();

		expect(fuente).toContain('const puedeCrearDoctor = body.action === "createDoctor";');
		expect(fuente).toContain('(!isAdminRole(empleadoAdmin.rol) && !puedeCrearDoctor)');
		expect(fuente).toContain('if (body.action === "updatePassword" || body.action === "updateDoctorPassword")');
	});
});
