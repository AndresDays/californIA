// Accesos de los clientes de convenio.
//
// Un convenio entra a la plataforma con dos cuentas distintas, porque son dos
// áreas y casi nunca las ve la misma persona: la de imagen aterriza en
// radiología -como el médico externo- y la de laboratorio en la pantalla de
// resultados de su convenio. Lo que puede ver cada una lo decide la base; aquí
// sólo vive el nombre de los módulos y quién administra las cuentas.
import { normalizarRolPermisos } from "./role-permissions";

export const MODULOS_ACCESO_CLIENTE = [
	{ id: "imagen", etiqueta: "Imagen", rol: "cliente_imagen" },
	{ id: "laboratorio", etiqueta: "Laboratorio", rol: "cliente_laboratorio" },
];

export const rolDeModuloCliente = (modulo = "") =>
	MODULOS_ACCESO_CLIENTE.find((item) => item.id === modulo)?.rol || "";

export const moduloDeRolCliente = (rol = "") =>
	MODULOS_ACCESO_CLIENTE.find((item) => item.rol === normalizarRolPermisos(rol))?.id || "";

// Dirección y desarrollo. El radiólogo director se guarda con rol `radiologo`.
const ROLES_ADMIN_ACCESOS = new Set([
	"admin",
	"administrador",
	"desarrollador",
	"radiologo",
	"radiologo_director",
]);

export const puedeAdministrarAccesosClientes = (rol) =>
	ROLES_ADMIN_ACCESOS.has(normalizarRolPermisos(rol));

const invocarAdminUsers = async (supabase, body) => {
	const { data, error } = await supabase.functions.invoke("admin-users", { body });
	if (error) throw error;
	if (data?.error) throw new Error(data.error);
	return data;
};

export const guardarAccesoCliente = (supabase, acceso) =>
	invocarAdminUsers(supabase, { action: "createClienteAcceso", acceso });

export const eliminarAccesoCliente = (supabase, { id_cliente, modulo }) =>
	invocarAdminUsers(supabase, {
		action: "deleteClienteAcceso",
		acceso: { id_cliente, modulo },
	});

// La lista de la pantalla de administración: todos los convenios con el acceso
// que tenga cada uno, para ver de un vistazo a quién falta darle entrada.
export const combinarClientesConAccesos = (clientes = [], accesos = []) => {
	const porCliente = new Map();
	accesos.forEach((acceso) => {
		const actuales = porCliente.get(acceso.id_cliente) || {};
		actuales[acceso.modulo] = acceso;
		porCliente.set(acceso.id_cliente, actuales);
	});

	return clientes.map((cliente) => ({
		...cliente,
		accesos: porCliente.get(cliente.id_cliente) || {},
	}));
};

export const validarAccesoCliente = ({ email = "", contrasena = "", esNuevo = true } = {}) => {
	const correo = String(email || "").trim();
	if (!correo) return "El usuario (correo) es obligatorio";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
		return "El usuario debe ser un correo válido: es con lo que inicia sesión";
	}
	// Al editar se puede dejar en blanco para conservar la que ya tenía.
	if (esNuevo && String(contrasena || "").length < 8) {
		return "La contraseña debe tener al menos 8 caracteres";
	}
	if (!esNuevo && contrasena && String(contrasena).length < 8) {
		return "La contraseña debe tener al menos 8 caracteres";
	}
	return "";
};
