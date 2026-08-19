import { fireEvent, render, screen } from "@testing-library/react";
import ActualizacionAppContext from "../../context/actualizacion-app-context";
import VersionApp from "./version-app";

jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: null,
		formatRol: () => "",
		getPrimerNombre: () => "",
	}),
}));

jest.mock("../../utils/version-app", () => ({
	VERSION_APP: "1.37.3",
	COMMIT_APP: "abc1234",
	FECHA_COMPILACION_APP: "2026-08-19T10:00:00.000Z",
	etiquetaVersionApp: () => "v1.37.3 (abc1234)",
	formatearFechaCompilacion: () => "19 de agosto de 2026, 10:00",
}));

const renderConEstado = (estado = {}) => {
	const valor = {
		offlineReady: false,
		setOfflineReady: () => {},
		needRefresh: false,
		setNeedRefresh: () => {},
		buscando: false,
		ultimaRevision: null,
		buscarActualizaciones: jest.fn(),
		actualizar: jest.fn(),
		...estado,
	};
	render(
		<ActualizacionAppContext.Provider value={valor}>
			<VersionApp />
		</ActualizacionAppContext.Provider>,
	);
	return valor;
};

describe("pantalla de versión de la app", () => {
	test("muestra la versión y la compilación cargadas", () => {
		renderConEstado();

		expect(screen.getByText("v1.37.3 (abc1234)")).toBeInTheDocument();
		expect(screen.getByText("abc1234")).toBeInTheDocument();
		expect(screen.getByText("Estás en la última versión disponible")).toBeInTheDocument();
	});

	test("permite revisar si hay una versión más reciente", () => {
		const valor = renderConEstado();

		fireEvent.click(screen.getByText("Buscar actualizaciones"));

		expect(valor.buscarActualizaciones).toHaveBeenCalled();
	});

	test("ofrece actualizar cuando el service worker detecta una versión nueva", () => {
		const valor = renderConEstado({ needRefresh: true });

		expect(screen.getByText("Hay una versión más reciente disponible")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Actualizar ahora"));

		expect(valor.actualizar).toHaveBeenCalled();
	});
});
