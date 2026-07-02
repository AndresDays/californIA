export const normalizarTelefonoDesdeWhatsapp = (telefono, codigoPais = "52") => {
	const digitos = String(telefono || "").replace(/\D/g, "");
	if (!digitos) return null;

	const prefijoWhatsappMexico = codigoPais === "52" ? "521" : codigoPais;
	if (digitos.startsWith(prefijoWhatsappMexico) && digitos.length === prefijoWhatsappMexico.length + 10) {
		return digitos.slice(prefijoWhatsappMexico.length);
	}
	if (digitos.startsWith(codigoPais) && digitos.length === codigoPais.length + 10) {
		return digitos.slice(codigoPais.length);
	}
	if (digitos.length === 10) return digitos;
	return null;
};

export const obtenerAccionConfirmacionWhatsapp = ({ buttonPayload, body } = {}) => {
	const valor = String(buttonPayload || body || "").trim().toLowerCase();

	if (["confirmar_cita", "confirmar", "confirmada"].includes(valor)) {
		return { estadoCita: "confirmada", estadoWhatsapp: "confirmada" };
	}
	if (["cancelar_cita", "cancelar", "cancelada"].includes(valor)) {
		return { estadoCita: "cancelada", estadoWhatsapp: "cancelada" };
	}
	return null;
};
