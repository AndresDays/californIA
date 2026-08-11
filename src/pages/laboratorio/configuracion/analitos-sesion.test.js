import {
	actualizarSesionAnalitos,
	obtenerSesionAnalitos,
	reiniciarSesionAnalitos,
} from "./analitos-sesion";

describe("sesión temporal de Analitos", () => {
	beforeEach(() => reiniciarSesionAnalitos());

	test("conserva el estudio y el menú abiertos hasta reiniciar la sesión en memoria", () => {
		const estudio = { clave: "BHC", descripcion: "Biometría hemática" };
		actualizarSesionAnalitos({
			estudioSeleccionado: estudio,
			modalAgregarOpen: true,
		});

		expect(obtenerSesionAnalitos()).toEqual({
			estudioSeleccionado: estudio,
			modalAgregarOpen: true,
			busquedaAnalitos: "",
			analitosSeleccionados: [],
		});

		reiniciarSesionAnalitos();

		expect(obtenerSesionAnalitos()).toEqual({
			estudioSeleccionado: null,
			modalAgregarOpen: false,
			busquedaAnalitos: "",
			analitosSeleccionados: [],
		});
	});
});
