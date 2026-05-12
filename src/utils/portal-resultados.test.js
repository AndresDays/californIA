import {
	crearTextoCompartirResultados,
	crearUrlPortalResultados,
	normalizarTextoResultado,
	normalizarTelefonoPortal,
} from "./portal-resultados";

describe("portal-resultados", () => {
	test("normaliza telefonos dejando solo digitos", () => {
		expect(normalizarTelefonoPortal("(322) 225-6008")).toBe("3222256008");
	});

	test("crea url con folio y telefono", () => {
		expect(
			crearUrlPortalResultados({
				folio: "1105260004",
				telefono: "322 225 6008",
				origin: "https://app.test",
			}),
		).toBe("https://app.test/resultados?folio=1105260004&telefono=3222256008");
	});

	test("crea texto para compartir", () => {
		expect(
			crearTextoCompartirResultados({
				paciente: "Ana Perez",
				folio: "F-1",
				url: "https://app.test/resultados?folio=F-1",
			}),
		).toContain("Ana Perez");
	});

	test("convierte br de referencias a saltos de linea", () => {
		expect(normalizarTextoResultado("Mujeres: 0.5 - 1.2<BR>Hombres: 0.6 - 1.5")).toBe(
			"Mujeres: 0.5 - 1.2\nHombres: 0.6 - 1.5",
		);
	});
});
