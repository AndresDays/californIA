import {
	construirMensajeRecordatorio,
	construirPayloadTemplateInfobip,
	construirVariablesTemplateRecordatorio,
	obtenerIdMensajeInfobip,
	obtenerVentanaRecordatorio,
	normalizarTelefonoWhatsapp,
} from "./whatsapp-reminders";

describe("whatsapp-reminders", () => {
	test("calcula la ventana de citas alrededor de 24 horas", () => {
		const ahora = new Date("2026-06-24T03:41:00.000Z");

		expect(obtenerVentanaRecordatorio(ahora)).toEqual({
			inicio: "2026-06-24T21:36:00",
			fin: "2026-06-24T21:46:00",
		});
	});

	test("normaliza telefonos mexicanos a formato E.164 de Infobip", () => {
		expect(normalizarTelefonoWhatsapp("322 123 4567")).toBe("5213221234567");
		expect(normalizarTelefonoWhatsapp("+52 322 123 4567")).toBe("5213221234567");
		expect(normalizarTelefonoWhatsapp("+521 322 123 4567")).toBe("5213221234567");
	});

	test("regresa null cuando el telefono no tiene 10 digitos utiles", () => {
		expect(normalizarTelefonoWhatsapp("12345")).toBeNull();
		expect(normalizarTelefonoWhatsapp("")).toBeNull();
	});

	test("construye mensaje de confirmacion con datos de la cita", () => {
		expect(
			construirMensajeRecordatorio({
				nombrePaciente: "Ana Perez",
				tipoEstudio: "Biometria hematica",
				fechaEstudio: "2026-06-24 13:50:00",
			}),
		).toBe(
			"Hola Ana Perez, confirmamos tu cita de Biometria hematica para el 24 de junio a las 13:50. Responde CONFIRMAR para confirmar tu asistencia o CANCELAR si necesitas reagendar.",
		);
	});

	test("construye variables para el template de recordatorio", () => {
		expect(
			construirVariablesTemplateRecordatorio("2026-06-24 13:50:00"),
		).toEqual({
			1: "24/6",
			2: "13:50",
		});
	});

	test("construye el payload de plantilla Utility de Infobip", () => {
		expect(
			construirPayloadTemplateInfobip({
				from: "5213221234567",
				to: "5213227654321",
				templateName: "recordatorio_cita",
				language: "es_MX",
				fechaEstudio: "2026-06-24 13:50:00",
			}),
		).toEqual({
			messages: [{
				from: "5213221234567",
				to: "5213227654321",
				content: {
					templateName: "recordatorio_cita",
					templateData: {
						body: { placeholders: ["24/6", "13:50"] },
						buttons: [
							{ type: "QUICK_REPLY", parameter: "confirmar_cita" },
							{ type: "QUICK_REPLY", parameter: "cancelar_cita" },
						],
					},
					language: "es_MX",
				},
			}],
		});
	});

	test("obtiene el identificador del mensaje encolado por Infobip", () => {
		expect(obtenerIdMensajeInfobip({ messages: [{ messageId: "infobip-123" }] })).toBe("infobip-123");
		expect(obtenerIdMensajeInfobip({ messages: [] })).toBeNull();
	});
});
