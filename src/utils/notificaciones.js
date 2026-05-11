const CANALES_ROLES = {
	captura: ["quimico", "tecnico", "administrador", "admin", "desarrollador"],
	laboratorio: ["quimico", "tecnico", "administrador", "admin", "desarrollador"],
	radiologia: [
		"radiologo",
		"tecnico_radiologia",
		"tecnico",
		"administrador",
		"admin",
		"desarrollador",
	],
	entrega: ["recepcionista", "administrador", "admin", "desarrollador"],
	recepcion: ["recepcionista", "administrador", "admin", "desarrollador"],
	todos: [],
};

export const normalizarRolNotificacion = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

export const notificacionEsParaEmpleado = (
	notificacion = {},
	empleado = {},
	user = {},
) => {
	if (!notificacion) return false;
	if (
		notificacion.usuario_destino &&
		notificacion.usuario_destino === (user?.id || empleado?.auth_uuid)
	) {
		return true;
	}
	if (notificacion.usuario_destino) return false;

	const sucursalEmpleadoId = empleado?.id_sucursal || empleado?.sucursales?.id_sucursal;
	if (
		notificacion.id_sucursal &&
		sucursalEmpleadoId &&
		Number(notificacion.id_sucursal) !== Number(sucursalEmpleadoId)
	) {
		return false;
	}

	const sucursalEmpleado = normalizarTexto(
		empleado?.sucursal || empleado?.sucursales?.nombre || "",
	);
	if (
		notificacion.sucursal &&
		sucursalEmpleado &&
		normalizarTexto(notificacion.sucursal) !== sucursalEmpleado
	) {
		return false;
	}

	const rolEmpleado = normalizarRolNotificacion(empleado?.rol);
	const rolDestino = normalizarRolNotificacion(notificacion.rol_destino);
	const canalDestino = normalizarRolNotificacion(notificacion.canal_destino || "todos");

	if (!rolDestino && (!canalDestino || canalDestino === "todos")) return true;
	if (rolDestino && ["todos", rolEmpleado].includes(rolDestino)) return true;
	if (canalDestino === "todos") return true;

	return (CANALES_ROLES[canalDestino] || []).includes(rolEmpleado);
};

export const crearPayloadNotificacion = ({
	titulo,
	mensaje,
	tipo = "sistema",
	canal_destino = "todos",
	rol_destino = null,
	usuario_destino = null,
	entidad_tipo = null,
	entidad_id = null,
	id_venta = null,
	id_sucursal = null,
	sucursal = "",
	action_path = "/dashboard",
	metadata = {},
}) => ({
	titulo,
	mensaje,
	tipo,
	canal_destino,
	rol_destino,
	usuario_destino,
	entidad_tipo,
	entidad_id,
	id_venta,
	id_sucursal,
	sucursal,
	action_path,
	metadata,
});

export const crearNotificacion = async (supabaseClient, payload) => {
	if (!supabaseClient || !payload?.titulo) return { data: null, error: null };

	const { data, error } = await supabaseClient
		.from("notificaciones")
		.insert([crearPayloadNotificacion(payload)]);

	if (
		error?.code === "42P01" ||
		error?.message?.includes("notificaciones") ||
		error?.message?.includes("schema cache")
	) {
		console.warn("Notificaciones no disponibles en el esquema:", error.message);
		return { data: null, error: null, skipped: true };
	}

	return { data, error };
};

export const crearNotificaciones = async (supabaseClient, payloads = []) => {
	const resultados = [];
	for (const payload of payloads.filter(Boolean)) {
		resultados.push(await crearNotificacion(supabaseClient, payload));
	}
	return resultados;
};
