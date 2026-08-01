import {
	extraerRespuestaInfobip,
	normalizarTelefonoDesdeWhatsapp,
	obtenerAccionConfirmacionWhatsapp,
} from "./whatsapp-webhook";

describe("whatsapp-webhook", () => {
	test("normaliza telefono recibido desde WhatsApp a 10 digitos locales", () => {
		expect(normalizarTelefonoDesdeWhatsapp("whatsapp:+5213221939613")).toBe("3221939613");
		expect(normalizarTelefonoDesdeWhatsapp("whatsapp:+523221939613")).toBe("3221939613");
		expect(normalizarTelefonoDesdeWhatsapp("3221939613")).toBe("3221939613");
	});

	test("detecta confirmacion por id de boton", () => {
		expect(
			obtenerAccionConfirmacionWhatsapp({ buttonPayload: "confirmar_cita" }),
		).toEqual({
			estadoCita: "confirmada",
			estadoWhatsapp: "confirmada",
		});
	});

	test("detecta cancelacion por id de boton", () => {
		expect(
			obtenerAccionConfirmacionWhatsapp({ buttonPayload: "cancelar_cita" }),
		).toEqual({
			estadoCita: "cancelada",
			estadoWhatsapp: "cancelada",
		});
	});

	test("ignora respuestas no soportadas", () => {
		expect(obtenerAccionConfirmacionWhatsapp({ body: "hola" })).toBeNull();
	});

	test("extrae una confirmacion de un webhook JSON de Infobip", () => {
		expect(extraerRespuestaInfobip({
			results: [{
				from: "5213221939613",
				messageId: "inbound-123",
				message: {
					type: "INTERACTIVE",
					interactive: {
						type: "BUTTON_REPLY",
						buttonReply: { id: "confirmar_cita" },
					},
				},
			}],
		})).toEqual({
			telefono: "3221939613",
			messageId: "inbound-123",
			buttonPayload: "confirmar_cita",
			body: null,
		});
	});

	test("ignora un webhook de Infobip sin resultados", () => {
		expect(extraerRespuestaInfobip({ results: [] })).toBeNull();
	});
});
