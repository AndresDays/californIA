import { esSecretoBearerValido } from "../../supabase/functions/_shared/request-auth.js";

describe("esSecretoBearerValido", () => {
	test("acepta un encabezado Bearer con el secreto configurado", () => {
		expect(esSecretoBearerValido("Bearer secreto-cron", "secreto-cron")).toBe(true);
	});

	test("rechaza secretos ausentes, malformados o distintos", () => {
		expect(esSecretoBearerValido("", "secreto-cron")).toBe(false);
		expect(esSecretoBearerValido("secreto-cron", "secreto-cron")).toBe(false);
		expect(esSecretoBearerValido("Bearer otro-secreto", "secreto-cron")).toBe(false);
	});
});
