import { useCallback, useEffect, useRef } from "react";
import { duracionSugerida } from "../utils/duracion-cita";

// La duración sigue a los estudios mientras nadie la haya cambiado a mano: al
// agregar una resonancia sube una hora, al quitar una tomografía baja media.
// Si quien agenda la puso distinta, se respeta y el campo sólo avisa cuál
// tocaría.
//
// `fijarBase` sirve al abrir una cita ya guardada: sus estudios llegan después
// y no deben mover la duración que la cita ya traía.
export const useDuracionSugerida = (estudios, duracion, setDuracion) => {
	const sugerida = duracionSugerida(estudios);
	const baseRef = useRef(sugerida);

	useEffect(() => {
		const anterior = baseRef.current;
		baseRef.current = sugerida;
		if (sugerida !== anterior && duracion === anterior) setDuracion(sugerida);
		// Sólo reacciona a cambios en los estudios, no a la duración tecleada.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sugerida]);

	const fijarBase = useCallback((estudiosBase) => {
		baseRef.current = duracionSugerida(estudiosBase);
	}, []);

	return { sugerida, fijarBase };
};

export default useDuracionSugerida;
