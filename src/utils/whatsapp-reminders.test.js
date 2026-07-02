import {
	construirMensajeRecordatorio,
	construirVariablesTemplateRecordatorio,
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

	test("normaliza telefonos mexicanos a formato whatsapp de Twilio", () => {
		expect(normalizarTelefonoWhatsapp("322 123 4567")).toBe("whatsapp:+5213221234567");
		expect(normalizarTelefonoWhatsapp("+52 322 123 4567")).toBe("whatsapp:+5213221234567");
		expect(normalizarTelefonoWhatsapp("+521 322 123 4567")).toBe("whatsapp:+5213221234567");
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

	test("construye variables para el template de Twilio", () => {
		expect(
			construirVariablesTemplateRecordatorio("2026-06-24 13:50:00"),
		).toEqual({
			1: "24/6",
			2: "13:50",
		});
	});
});
