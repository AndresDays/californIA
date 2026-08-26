// El borrador existe para que la captura sobreviva a que el navegador descarte
// la página al cambiar de pestaña o de app. Un refresh, en cambio, es una
// decisión de quien captura: ahí la pantalla debe empezar limpia.
//
// Los dos casos llegan al navegador como una carga nueva de tipo "reload", así
// que se distinguen con document.wasDiscarded, que Chrome marca cuando fue él
// quien tiró la página. En navegadores sin esa bandera —Safari, iOS— se prefiere
// conservar la captura: perderla molesta más que arrastrarla.
const PREFIJOS_BORRADOR = [
	"california:borrador:",
	"california:nuevo-paciente:borrador",
];

export const tipoDeCarga = () => {
	if (typeof performance === "undefined") return "";
	const entrada = performance.getEntriesByType?.("navigation")?.[0];
	if (entrada?.type) return entrada.type;
	// Navegadores viejos: 1 es recarga en la API anterior.
	return performance.navigation?.type === 1 ? "reload" : "navigate";
};

export const esRecargaManual = () => {
	if (typeof document !== "undefined" && document.wasDiscarded === true) return false;
	return tipoDeCarga() === "reload";
};

export const limpiarBorradorSiEsRecargaManual = () => {
	if (typeof sessionStorage === "undefined") return false;
	if (!esRecargaManual()) return false;

	try {
		const claves = [];
		for (let indice = 0; indice < sessionStorage.length; indice += 1) {
			const clave = sessionStorage.key(indice);
			if (PREFIJOS_BORRADOR.some((prefijo) => clave?.startsWith(prefijo))) {
				claves.push(clave);
			}
		}
		claves.forEach((clave) => sessionStorage.removeItem(clave));
		return claves.length > 0;
	} catch {
		// Sin acceso a sessionStorage no hay borrador que limpiar.
		return false;
	}
};
