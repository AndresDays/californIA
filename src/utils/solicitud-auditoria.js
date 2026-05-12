export const EVENTOS_SOLICITUD = {
	CREADA: "solicitud_creada",
	COBRADA: "pago_registrado",
	ADEUDO_CAMBIADO: "adeudo_cambiado",
	CAPTURADA: "resultados_capturados",
	VALIDADA: "resultados_validados",
	IMAGEN_SUBIDA: "imagen_subida",
	INTERPRETADA: "imagen_interpretada",
	ENTREGADA: "resultados_entregados",
	CANCELADA: "solicitud_cancelada",
};

export const obtenerActorAuditoria = (empleado = {}, user = {}) => ({
	actor_nombre: empleado?.nombre || user?.email || "Usuario",
	actor_rol: empleado?.rol || null,
	actor_auth_uuid: user?.id || empleado?.auth_uuid || null,
});

export const registrarEventoSolicitud = async (
	supabase,
	{
		id_venta,
		folio = null,
		evento,
		descripcion,
		empleado = {},
		user = {},
		entidad_tipo = "venta",
		entidad_id = null,
		detalles = {},
	} = {},
) => {
	if (!supabase || !id_venta || !evento || !descripcion) return null;

	const payload = {
		id_venta,
		folio,
		evento,
		descripcion,
		...obtenerActorAuditoria(empleado, user),
		entidad_tipo,
		entidad_id: entidad_id || id_venta,
		detalles,
	};

	const { error } = await supabase.from("solicitudes_auditoria").insert(payload);
	if (error) {
		console.warn("No se pudo registrar auditoria de solicitud:", error);
		return error;
	}
	return null;
};

export const formatearEventoAuditoria = (evento = {}) => {
	const fecha = evento.created_at
		? new Date(evento.created_at).toLocaleString("es-MX", {
				dateStyle: "short",
				timeStyle: "short",
			})
		: "";
	const actor = evento.actor_nombre || "Sistema";
	const rol = evento.actor_rol ? ` · ${evento.actor_rol}` : "";
	return {
		fecha,
		actor: `${actor}${rol}`,
		descripcion: evento.descripcion || evento.evento,
	};
};
