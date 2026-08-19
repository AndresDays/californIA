import { useEffect, useState } from "react";

// Los formularios de captura se pierden cuando el navegador descarta la página
// al cambiar de pestaña o de app (pasa seguido en celular). El valor de cada
// campo se guarda en sessionStorage para recuperarlo al volver; se limpia al
// guardar o al cancelar, así el siguiente registro empieza en blanco.
const PREFIJO = "california:borrador:";

const hayAlmacenamiento = () => typeof window !== "undefined" && Boolean(window.sessionStorage);

const esVacio = (valor) =>
	valor === "" || valor === null || valor === undefined || (Array.isArray(valor) && valor.length === 0);

export const leerCampoPersistente = (clave, valorInicial = "") => {
	if (!hayAlmacenamiento()) return valorInicial;
	try {
		const guardado = sessionStorage.getItem(`${PREFIJO}${clave}`);
		return guardado === null ? valorInicial : JSON.parse(guardado);
	} catch {
		return valorInicial;
	}
};

export const useCampoPersistente = (clave, valorInicial = "") => {
	const [valor, setValor] = useState(() => leerCampoPersistente(clave, valorInicial));

	useEffect(() => {
		if (!hayAlmacenamiento()) return;
		const claveCompleta = `${PREFIJO}${clave}`;
		try {
			if (esVacio(valor)) sessionStorage.removeItem(claveCompleta);
			else sessionStorage.setItem(claveCompleta, JSON.stringify(valor));
		} catch {
			// Sin espacio o en modo privado: el borrador es una ayuda, no un requisito.
		}
	}, [clave, valor]);

	return [valor, setValor];
};

export const hayBorradorPersistente = (prefijoClave) => {
	if (!hayAlmacenamiento()) return false;
	const inicio = `${PREFIJO}${prefijoClave}`;
	for (let indice = 0; indice < sessionStorage.length; indice += 1) {
		if (sessionStorage.key(indice)?.startsWith(inicio)) return true;
	}
	return false;
};

export const limpiarBorradorPersistente = (prefijoClave) => {
	if (!hayAlmacenamiento()) return;
	const inicio = `${PREFIJO}${prefijoClave}`;
	const claves = [];
	for (let indice = 0; indice < sessionStorage.length; indice += 1) {
		const clave = sessionStorage.key(indice);
		if (clave?.startsWith(inicio)) claves.push(clave);
	}
	claves.forEach((clave) => sessionStorage.removeItem(clave));
};
