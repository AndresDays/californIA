import {
	crearAsuntoCompartirEstudio,
	faltanDatosParaCompartir,
	crearEnlaceCorreoEstudio,
	crearEnlaceWhatsappEstudio,
	crearTextoCompartirEstudio,
	resolverUrlCompartirEstudio,
} from "./compartir-estudio";

describe("compartir un estudio de imagen", () => {
	// Lo que se comparte es el visor del paciente, no la pantalla del radiólogo:
	// esa pide sesión y a quien la recibe no le sirve.
	test("se comparte la liga del visor del paciente", () => {
		expect(
			resolverUrlCompartirEstudio({
				idEstudio: 12,
				folio: "A0001",
				telefono: "(477) 123-4567",
				origin: "https://app.california.mx",
			}),
		).toBe("https://app.california.mx/visor-paciente/12?folio=A0001&telefono=4771234567");
	});

	// Aunque falte folio o teléfono se manda la del visor del paciente: la de la
	// pantalla del radiólogo pide sesión y nunca sirve fuera de la clínica.
	test("sin folio o sin telefono se sigue compartiendo el visor del paciente", () => {
		const urlActual = "https://app.california.mx/visor-dicom/12";
		expect(
			resolverUrlCompartirEstudio({
				idEstudio: 12,
				folio: "",
				telefono: "4771234567",
				origin: "https://app.california.mx",
				urlActual,
			}),
		).toBe("https://app.california.mx/visor-paciente/12?telefono=4771234567");
	});

	test("sin estudio al que apuntar se comparte la pantalla actual", () => {
		const urlActual = "https://app.california.mx/visor-dicom";
		expect(resolverUrlCompartirEstudio({ folio: "A0001", urlActual })).toBe(urlActual);
	});

	// Quien comparte tiene que enterarse: esa liga abre pero no autoriza.
	test("se avisa cuando la liga no va a poder autorizarse", () => {
		expect(faltanDatosParaCompartir({ folio: "A0001", telefono: "4771234567" })).toBe(false);
		expect(faltanDatosParaCompartir({ folio: "", telefono: "4771234567" })).toBe(true);
		expect(faltanDatosParaCompartir({ folio: "A0001", telefono: "" })).toBe(true);
	});

	test("el texto dice de quien es el estudio y de que", () => {
		expect(
			crearTextoCompartirEstudio({
				paciente: "Ana Ruiz",
				estudio: "TAC de cráneo",
				url: "https://x.mx/v/1",
			}),
		).toBe("Estudio de imagen de Ana Ruiz (TAC de cráneo) disponible para consulta: https://x.mx/v/1");
	});

	// El visor pone "—" cuando no sabe el tipo de estudio: eso no se manda.
	test("sin datos el texto no queda con huecos", () => {
		expect(crearTextoCompartirEstudio({ estudio: "—", url: "https://x.mx/v/1" })).toBe(
			"Estudio de imagen disponible para consulta: https://x.mx/v/1",
		);
	});

	test("el asunto del correo lleva paciente y folio", () => {
		expect(crearAsuntoCompartirEstudio({ paciente: "Ana Ruiz", folio: "A0001" })).toBe(
			"Estudio de imagen — Ana Ruiz (folio A0001)",
		);
		expect(crearAsuntoCompartirEstudio({})).toBe("Estudio de imagen");
	});

	test("el correo se abre aunque no se sepa la direccion", () => {
		const enlace = crearEnlaceCorreoEstudio({ asunto: "Hola", texto: "Liga" });
		expect(enlace.startsWith("mailto:?")).toBe(true);
		expect(enlace).toContain("subject=Hola");
		expect(enlace).toContain("body=Liga");
	});

	// Los teléfonos se capturan a diez dígitos y WhatsApp necesita la lada.
	test("whatsapp agrega la lada de Mexico a un telefono de diez digitos", () => {
		expect(crearEnlaceWhatsappEstudio({ telefono: "477 123 4567", texto: "hola" })).toBe(
			"https://wa.me/524771234567?text=hola",
		);
	});

	test("un telefono que ya trae lada no se le agrega otra", () => {
		expect(crearEnlaceWhatsappEstudio({ telefono: "524771234567", texto: "hola" })).toBe(
			"https://wa.me/524771234567?text=hola",
		);
	});

	test("sin telefono se abre whatsapp para elegir el contacto", () => {
		expect(crearEnlaceWhatsappEstudio({ texto: "hola" })).toBe("https://wa.me/?text=hola");
	});
});
