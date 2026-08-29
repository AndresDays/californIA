import { useEffect, useState } from "react";

// Retrasa la propagación de un valor que cambia tecla a tecla.
// El input sigue mostrando el valor inmediato (por eso no se toca el estado que
// lo controla); lo único que se retrasa es la consulta que cuelga de él. Sin
// esto, escribir "Rodríguez" en el buscador de pacientes lanzaba nueve consultas
// a Supabase, cada una con `count: 'exact'` y un `ilike` sobre cuatro columnas.
export const useDebounce = (valor, ms = 300) => {
	const [valorDiferido, setValorDiferido] = useState(valor);

	useEffect(() => {
		// Sin retraso no tiene sentido programar un timeout: se sincroniza ya.
		if (!ms) {
			setValorDiferido(valor);
			return undefined;
		}

		const temporizador = setTimeout(() => setValorDiferido(valor), ms);
		return () => clearTimeout(temporizador);
	}, [valor, ms]);

	return valorDiferido;
};

export default useDebounce;
