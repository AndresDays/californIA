import { useEffect, useState } from "react";

const PREFIJO = "california:busqueda:";

const leerBusqueda = (clave) => {
	if (typeof window === "undefined") return "";
	return sessionStorage.getItem(`${PREFIJO}${clave}`) || "";
};

export const useBusquedaPersistente = (clave) => {
	const [busqueda, setBusqueda] = useState(() => leerBusqueda(clave));

	useEffect(() => {
		const claveCompleta = `${PREFIJO}${clave}`;
		if (!busqueda) {
			sessionStorage.removeItem(claveCompleta);
			return;
		}
		sessionStorage.setItem(claveCompleta, busqueda);
	}, [busqueda, clave]);

	return [busqueda, setBusqueda];
};
