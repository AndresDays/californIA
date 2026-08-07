let sesionAnalitos = {
	estudioSeleccionado: null,
	modalAgregarOpen: false,
	busquedaAnalitos: "",
	analitosSeleccionados: [],
};

export const obtenerSesionAnalitos = () => sesionAnalitos;

export const actualizarSesionAnalitos = (cambios) => {
	sesionAnalitos = { ...sesionAnalitos, ...cambios };
};

export const reiniciarSesionAnalitos = () => {
	sesionAnalitos = {
		estudioSeleccionado: null,
		modalAgregarOpen: false,
		busquedaAnalitos: "",
		analitosSeleccionados: [],
	};
};
