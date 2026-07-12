import { esOrigenAdminPermitido } from "../../supabase/functions/_shared/admin-cors.js";

describe("esOrigenAdminPermitido", () => {
	test("acepta solo los origenes configurados", () => {
		expect(
			esOrigenAdminPermitido("https://app.california.mx", "https://app.california.mx,https://admin.california.mx"),
		).toBe(true);
		expect(
			esOrigenAdminPermitido("https://malicioso.example", "https://app.california.mx"),
		).toBe(false);
	});

	test("permite origenes locales solo cuando no hay configuracion de produccion", () => {
		expect(esOrigenAdminPermitido("http://localhost:5173", "")).toBe(true);
		expect(esOrigenAdminPermitido("https://app.california.mx", "")).toBe(false);
	});
});
