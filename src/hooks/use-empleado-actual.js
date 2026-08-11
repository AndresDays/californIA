import { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { supabase } from "../lib/supabase-client";

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

export function useEmpleadoActual() {
	const { user } = useAuth();
	const [empleadoData, setEmpleadoData] = useState(null);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (!error && empleado) setEmpleadoData(empleado);
			} catch (error) {
				console.error("Error:", error);
			}
		};
		fetchEmpleadoData();
	}, [user]);

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	return { user, empleadoData, formatRol, getPrimerNombre };
}
