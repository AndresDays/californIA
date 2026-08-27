const normalizarTexto = (valor) =>
	typeof valor === "string" ? valor.trim() : valor || "";

const quitarAcentos = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

export const normalizarRolUsuario = (rol) => {
	const normalizado = quitarAcentos(rol).trim().toLowerCase();
	const roles = {
		admin: "admin",
		administrador: "admin",
		radiologo: "radiologo",
		"radiologo director": "radiologo",
		radiologo_clinico: "radiologo_clinico",
		"radiologo clinico": "radiologo_clinico",
		doctor: "medico",
		medico: "medico",
		"tecnico radiologia": "tecnico_radiologia",
		"tecnico en radiologia": "tecnico_radiologia",
		tecnico_radiologia: "tecnico_radiologia",
		tecnico: "tecnico_radiologia",
		quimico: "quimico",
		recepcionista: "recepcionista",
		visitadora: "visitadora",
		visitador: "visitadora",
		desarrollador: "desarrollador",
	};
	return roles[normalizado] || normalizado;
};

export const etiquetaRolUsuario = (rol) => {
	const etiquetas = {
		admin: "Administrador",
		radiologo: "Radiólogo - Director",
		radiologo_clinico: "Radiólogo",
		medico: "Médico",
		doctor_externo: "Doctor externo Rayos X",
		tecnico_radiologia: "Técnico en Radiología",
		quimico: "Químico",
		recepcionista: "Recepcionista",
		visitadora: "Visitadora",
		desarrollador: "Desarrollador",
	};
	const rolNormalizado = normalizarRolUsuario(rol);
	return etiquetas[rolNormalizado] || rol || "Usuario";
};

export const prepararUsuarioParaFormulario = (usuarioEditar) => ({
	id: usuarioEditar.id,
	auth_uuid: usuarioEditar.auth_uuid || "",
	nombre: usuarioEditar.nombre || "",
	usuario: usuarioEditar.usuario || "",
	contrasena: "",
	rol: normalizarRolUsuario(usuarioEditar.rol),
	sucursal: usuarioEditar.sucursal || "",
	email: usuarioEditar.email || "",
	telefono: usuarioEditar.telefono || "",
	activo: usuarioEditar.estado === "Activado",
});

export const buildEmpleadoInsertPayload = (usuarioData, authUuid) => ({
	nombre: normalizarTexto(usuarioData.nombre),
	usuario: normalizarTexto(usuarioData.usuario),
	rol: normalizarRolUsuario(usuarioData.rol),
	sucursal: normalizarTexto(usuarioData.sucursal),
	email: normalizarTexto(usuarioData.email),
	telefono: normalizarTexto(usuarioData.telefono),
	activo: Boolean(usuarioData.activo),
	auth_uuid: authUuid,
});

export const buildEmpleadoUpdatePayload = (usuarioData) => ({
	nombre: normalizarTexto(usuarioData.nombre),
	usuario: normalizarTexto(usuarioData.usuario),
	rol: normalizarRolUsuario(usuarioData.rol),
	sucursal: normalizarTexto(usuarioData.sucursal),
	email: normalizarTexto(usuarioData.email),
	telefono: normalizarTexto(usuarioData.telefono),
	activo: Boolean(usuarioData.activo),
	updated_at: new Date().toISOString(),
});

export const esRolAdministrador = (rol) =>
	["admin", "administrador", "desarrollador"].includes(
		String(rol || "").toLowerCase(),
	);
