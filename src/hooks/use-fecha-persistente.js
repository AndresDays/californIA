import { useEffect, useState } from "react";

const PREFIJO = "california:filtro-fecha:";

const leerFecha = (clave, valorInicial) => {
	if (typeof window === "undefined") return valorInicial;
	return sessionStorage.getItem(`${PREFIJO}${clave}`) || valorInicial;
};

export const useFechaPersistente = (clave, valorInicial) => {
	const [fecha, setFecha] = useState(() => leerFecha(clave, valorInicial));

	useEffect(() => {
		sessionStorage.setItem(`${PREFIJO}${clave}`, fecha);
	}, [clave, fecha]);

	return [fecha, setFecha];
};
