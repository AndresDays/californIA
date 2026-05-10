const normalizarTexto = (valor) =>
	typeof valor === "string" ? valor.trim() : valor || "";

export const buildEmpleadoInsertPayload = (usuarioData, authUuid) => ({
	nombre: normalizarTexto(usuarioData.nombre),
	usuario: normalizarTexto(usuarioData.usuario),
	rol: usuarioData.rol || "",
	sucursal: normalizarTexto(usuarioData.sucursal),
	email: normalizarTexto(usuarioData.email),
	telefono: normalizarTexto(usuarioData.telefono),
	activo: Boolean(usuarioData.activo),
	auth_uuid: authUuid,
});

export const buildEmpleadoUpdatePayload = (usuarioData) => ({
	nombre: normalizarTexto(usuarioData.nombre),
	usuario: normalizarTexto(usuarioData.usuario),
	rol: usuarioData.rol || "",
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
