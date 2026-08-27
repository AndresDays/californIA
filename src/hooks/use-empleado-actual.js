import { useAuth } from "../context/auth-context";

const ROLES = {
	admin: "Administrador",
	administrador: "Administrador",
	radiologo: "Radiólogo - Director",
	doctor: "Médico",
	medico: "Médico",
	tecnico_radiologia: "Técnico en Radiología",
	tecnico: "Técnico",
	quimico: "Químico",
	recepcionista: "Recepcionista",
	desarrollador: "Desarrollador",
};

export function formatRol(rol) {
	if (!rol) return "Usuario";
	return ROLES[rol] || rol;
}

// El perfil del empleado se resuelve una sola vez al iniciar sesión y vive en
// la sesión: ahí ya viene la sucursal resuelta contra el catálogo. Este hook
// hacía su propia consulta trayendo nada más nombre y rol, así que las
// pantallas que lo usan veían al empleado sin sucursal —el calendario avisaba
// que el usuario no tenía una asignada aunque sí la tuviera.
export function useEmpleadoActual() {
	const { user, empleadoData } = useAuth();

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	return { user, empleadoData, formatRol, getPrimerNombre };
}
