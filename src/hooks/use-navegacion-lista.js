import { useCallback, useEffect, useRef, useState } from "react";

// Las listas de resultados de los buscadores se ven como un select, pero al ser
// divs no traían la navegación que el navegador da gratis en un <select>: había
// que soltar el teclado y tomar el mouse para elegir. Este hook les devuelve las
// flechas, Enter para elegir y Escape para cerrar.
export const useNavegacionLista = ({
	cantidad,
	onSeleccionar,
	onCerrar,
	activo = true,
}) => {
	const [indiceActivo, setIndiceActivo] = useState(-1);
	const contenedorRef = useRef(null);

	// Al cambiar la búsqueda cambian los resultados: dejar marcado el renglón
	// anterior haría elegir con Enter un estudio que ya no es el que se ve.
	useEffect(() => {
		setIndiceActivo(-1);
	}, [cantidad, activo]);

	// El resaltado tiene que verse aunque la lista tenga scroll.
	useEffect(() => {
		if (indiceActivo < 0) return;
		const opcion = contenedorRef.current?.querySelector(`[data-indice-opcion="${indiceActivo}"]`);
		opcion?.scrollIntoView({ block: "nearest" });
	}, [indiceActivo]);

	const manejarTeclas = useCallback(
		(evento) => {
			if (!activo || cantidad === 0) {
				if (evento.key === "Escape" && onCerrar) onCerrar();
				return;
			}
			if (evento.key === "ArrowDown") {
				evento.preventDefault();
				setIndiceActivo((previo) => (previo + 1) % cantidad);
			} else if (evento.key === "ArrowUp") {
				evento.preventDefault();
				setIndiceActivo((previo) => (previo <= 0 ? cantidad - 1 : previo - 1));
			} else if (evento.key === "Home") {
				evento.preventDefault();
				setIndiceActivo(0);
			} else if (evento.key === "End") {
				evento.preventDefault();
				setIndiceActivo(cantidad - 1);
			} else if (evento.key === "Enter") {
				if (indiceActivo < 0) return;
				evento.preventDefault();
				onSeleccionar?.(indiceActivo);
			} else if (evento.key === "Escape") {
				evento.preventDefault();
				setIndiceActivo(-1);
				onCerrar?.();
			}
		},
		[activo, cantidad, indiceActivo, onCerrar, onSeleccionar],
	);

	// Lo que hay que colgarle a cada renglón para que se vea y se comporte igual
	// que la opción resaltada de un select.
	const propsOpcion = useCallback(
		(indice, claseBase = "") => ({
			"data-indice-opcion": indice,
			role: "option",
			"aria-selected": indice === indiceActivo,
			className: `${claseBase}${indice === indiceActivo ? " resultado-activo" : ""}`,
			onMouseEnter: () => setIndiceActivo(indice),
		}),
		[indiceActivo],
	);

	return { indiceActivo, setIndiceActivo, manejarTeclas, contenedorRef, propsOpcion };
};
