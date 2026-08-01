const CINCO_MINUTOS_MS = 5 * 60 * 1000;
const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
const TIMEZONE_RECORDATORIOS = "America/Mexico_City";

const formatearFechaHoraLocalSQL = (fecha) => {
	const partes = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIMEZONE_RECORDATORIOS,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(fecha);
	const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;

	return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}:${valor("second")}`;
};

export const obtenerVentanaRecordatorio = (fechaBase = new Date()) => {
	const objetivo = fechaBase.getTime() + VEINTICUATRO_HORAS_MS;

	return {
		inicio: formatearFechaHoraLocalSQL(new Date(objetivo - CINCO_MINUTOS_MS)),
		fin: formatearFechaHoraLocalSQL(new Date(objetivo + CINCO_MINUTOS_MS)),
	};
};

export const normalizarTelefonoWhatsapp = (telefono, codigoPais = "52") => {
	const digitos = String(telefono || "").replace(/\D/g, "");
	if (!digitos) return null;

	const prefijoWhatsappMexico = codigoPais === "52" ? "521" : codigoPais;
	const sinPrefijo = digitos.startsWith(prefijoWhatsappMexico) && digitos.length === prefijoWhatsappMexico.length + 10
		? digitos.slice(prefijoWhatsappMexico.length)
		: digitos.startsWith(codigoPais) && digitos.length === codigoPais.length + 10
			? digitos.slice(codigoPais.length)
		: digitos;

	if (sinPrefijo.length !== 10) return null;
	return `${prefijoWhatsappMexico}${sinPrefijo}`;
};

const MESES_ES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

const obtenerPartesFechaEstudioLocal = (fechaEstudio) => {
	const match = String(fechaEstudio || "").match(
		/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/,
	);

	if (match) {
		return {
			year: Number(match[1]),
			month: Number(match[2]),
			day: Number(match[3]),
			hour: match[4],
			minute: match[5],
		};
	}

	const fecha = new Date(fechaEstudio);
	return {
		year: fecha.getFullYear(),
		month: fecha.getMonth() + 1,
		day: fecha.getDate(),
		hour: String(fecha.getHours()).padStart(2, "0"),
		minute: String(fecha.getMinutes()).padStart(2, "0"),
	};
};

export const construirMensajeRecordatorio = ({
	nombrePaciente,
	tipoEstudio,
	fechaEstudio,
}) => {
	const partes = obtenerPartesFechaEstudioLocal(fechaEstudio);
	const fechaTexto = `${partes.day} de ${MESES_ES[partes.month - 1]}`;
	const horaTexto = `${partes.hour}:${partes.minute}`;

	return `Hola ${nombrePaciente || "paciente"}, confirmamos tu cita de ${tipoEstudio || "estudio"} para el ${fechaTexto} a las ${horaTexto}. Responde CONFIRMAR para confirmar tu asistencia o CANCELAR si necesitas reagendar.`;
};

export const construirVariablesTemplateRecordatorio = (fechaEstudio) => {
	const partes = obtenerPartesFechaEstudioLocal(fechaEstudio);

	return {
		1: `${partes.day}/${partes.month}`,
		2: `${partes.hour}:${partes.minute}`,
	};
};

export const construirPayloadTemplateInfobip = ({
	from,
	to,
	templateName,
	language,
	fechaEstudio,
}) => ({
	messages: [{
		from,
		to,
		content: {
			templateName,
			templateData: {
				body: {
					placeholders: Object.values(construirVariablesTemplateRecordatorio(fechaEstudio)),
				},
				buttons: [
					{ type: "QUICK_REPLY", parameter: "confirmar_cita" },
					{ type: "QUICK_REPLY", parameter: "cancelar_cita" },
				],
			},
			language,
		},
	}],
});

export const obtenerIdMensajeInfobip = (respuesta) =>
	respuesta?.messages?.[0]?.messageId || null;
