import { useEffect, useRef, useState } from "react";

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

// `persistir` en falso deja el campo como un useState normal: sirve para los
// formularios que abren en modo edición, donde los datos ya viven en la base y
// arrastrarlos a un alta nueva crearía duplicados.
export const useCampoPersistente = (clave, valorInicial = "", { persistir = true } = {}) => {
	const [valor, setValor] = useState(() =>
		persistir ? leerCampoPersistente(clave, valorInicial) : valorInicial,
	);
	const inicialRef = useRef(valorInicial);

	useEffect(() => {
		if (!hayAlmacenamiento()) return;
		const claveCompleta = `${PREFIJO}${clave}`;
		try {
			// El valor sin tocar no es captura: guardarlo dejaría basura que hace
			// ver como pendiente un formulario que nunca se llenó.
			const sinCapturar =
				!persistir || esVacio(valor) || JSON.stringify(valor) === JSON.stringify(inicialRef.current);
			if (sinCapturar) sessionStorage.removeItem(claveCompleta);
			else sessionStorage.setItem(claveCompleta, JSON.stringify(valor));
		} catch {
			// Sin espacio o en modo privado: el borrador es una ayuda, no un requisito.
		}
	}, [clave, persistir, valor]);

	return [valor, setValor];
};

// El modal abierto también es parte del borrador: si el navegador descarta la
// página, al volver se reabre en lugar de dejar al usuario en la pantalla de
// atrás creyendo que perdió la captura.
export const useModalPersistente = (clave, { persistir = true } = {}) => {
	const [abierto, setAbierto] = useState(() => leerCampoPersistente(clave, false) === true);

	useEffect(() => {
		if (!hayAlmacenamiento()) return;
		const claveCompleta = `${PREFIJO}${clave}`;
		try {
			if (abierto && persistir) sessionStorage.setItem(claveCompleta, "true");
			else sessionStorage.removeItem(claveCompleta);
		} catch {
			// El borrador es una ayuda, no un requisito.
		}
	}, [abierto, clave, persistir]);

	// Salir de la pantalla con el modal abierto no deja el aviso puesto: sin
	// esto la marca quedaba pegada y el modal reaparecía en cualquier pantalla
	// que compartiera la clave. Cuando el navegador descarta la página no corre
	// ninguna limpieza, que es justo el caso en el que sí queremos reabrirlo.
	useEffect(
		() => () => {
			if (!hayAlmacenamiento()) return;
			try {
				sessionStorage.removeItem(`${PREFIJO}${clave}`);
			} catch {
				// El borrador es una ayuda, no un requisito.
			}
		},
		[clave],
	);

	return [abierto, setAbierto];
};

// Para lo que no es un campo de captura sino el resultado de una operación
// —los comprobantes de una venta ya guardada— que también tiene que sobrevivir
// a que el navegador descarte la página.
export const guardarCampoPersistente = (clave, valor) => {
	if (!hayAlmacenamiento()) return;
	try {
		sessionStorage.setItem(`${PREFIJO}${clave}`, JSON.stringify(valor));
	} catch {
		// Sin espacio o en modo privado: es una ayuda, no un requisito.
	}
};

export const borrarCampoPersistente = (clave) => {
	if (!hayAlmacenamiento()) return;
	try {
		sessionStorage.removeItem(`${PREFIJO}${clave}`);
	} catch {
		// Igual que arriba.
	}
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
