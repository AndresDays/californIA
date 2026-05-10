import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VisorDicom from "./visor-dicom";

const mockNavigate = jest.fn();
const mockUploadAdjunto = jest.fn().mockResolvedValue({ error: null });
const mockInsertAdjunto = jest.fn().mockReturnThis();
const mockHeader = jest.fn(() => <div>Header</div>);
const mockSidebar = jest.fn(({ isOpen }) => <div>{isOpen ? "Sidebar mobile abierto" : "Sidebar mobile cerrado"}</div>);
const mockSidebarHome = jest.fn(() => <div>Sidebar escritorio</div>);
const mockSetSidebarOpen = jest.fn();
let mockSidebarState = {
	sidebarOpen: false,
	setSidebarOpen: mockSetSidebarOpen,
	isMobile: false,
};

jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({
		user: { id: "user-1", email: "radiologo@test.com" },
		signOut: jest.fn(),
	}),
}));

jest.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
	useParams: () => ({ estudioId: "99" }),
	useLocation: () => ({
		state: {
			estudio: {
				id: 99,
				nombrePaciente: "Maria Gomez",
				tipoEstudio: "RX Torax",
				sucursal: "Centro",
				horaFecha: "10 mayo 2026, 10:30",
				estado: "EN PROCESO",
			},
		},
	}),
}));

jest.mock("../../../components/header-principal", () => (props) => mockHeader(props));
jest.mock("../../../components/sidebar", () => (props) => mockSidebar(props));
jest.mock("../../../components/sidebar-home", () => (props) => mockSidebarHome(props));
jest.mock("../../../utils/use-sidebar", () => () => mockSidebarState);
jest.mock("../componentes/ModalAsignar", () => () => null);
jest.mock("../../../components/ModalConfirmarEliminacion", () => () => null);
jest.mock("../../../components/ModalNotificacion", () => () => null);
jest.mock("./Panelia", () => ({ activo }) => (
	<div data-testid="panel-ia">{activo ? "IA activa" : "IA apagada"}</div>
));

jest.mock("cornerstone-core", () => ({
	getEnabledElement: jest.fn(() => ({})),
	enable: jest.fn(),
	events: { addEventListener: jest.fn() },
	getViewport: jest.fn(() => ({ scale: 1, voi: { windowWidth: 0, windowCenter: 0 } })),
	loadAndCacheImage: jest.fn(),
	displayImage: jest.fn(),
	setViewport: jest.fn(),
	resize: jest.fn(),
}));
jest.mock("dicom-parser", () => ({}));
jest.mock("cornerstone-tools", () => ({ external: {} }));
jest.mock("cornerstone-wado-image-loader", () => ({
	external: {},
	configure: jest.fn(),
}));

jest.mock("../../../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn((table) => {
			if (table === "empleados") {
				return {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					maybeSingle: jest.fn().mockResolvedValue({
						data: {
							nombre: "Dra. Ruiz",
							rol: "radiologo",
							cedula: "12345",
							especialidad: "Radiologia",
						},
					}),
				};
			}
			if (table === "plantillas_radiologia") {
				return {
					select: jest.fn().mockReturnThis(),
					order: jest.fn().mockResolvedValue({
						data: [
							{
								id: "tpl-1",
								nombre: "DRA ODILE",
								descripcion: "Membrete privado",
								categoria: "RX",
								visibilidad: "privado",
								mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
								archivo_url: "https://example.com/dra-odile.docx",
								created_at: "2024-09-06T14:32:00Z",
							},
						],
						error: null,
					}),
				};
			}
			if (table === "reporte_radiologia_adjuntos") {
				return {
					insert: mockInsertAdjunto,
					select: jest.fn().mockReturnThis(),
					single: jest.fn().mockResolvedValue({
						data: { id: "adjunto-1" },
						error: null,
					}),
				};
			}

			return {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						storage_path: null,
						reporte: "Reporte previo",
					},
					error: null,
				}),
				update: jest.fn().mockReturnThis(),
			};
		}),
		storage: {
			from: jest.fn(() => ({
				getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://example.com/a.dcm" } })),
				upload: mockUploadAdjunto,
			})),
		},
	},
}));

beforeAll(() => {
	HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
		clearRect: jest.fn(),
		beginPath: jest.fn(),
		moveTo: jest.fn(),
		lineTo: jest.fn(),
		arc: jest.fn(),
		ellipse: jest.fn(),
		rect: jest.fn(),
		stroke: jest.fn(),
		fill: jest.fn(),
		fillText: jest.fn(),
		measureText: jest.fn(() => ({ width: 40 })),
		save: jest.fn(),
		restore: jest.fn(),
		setLineDash: jest.fn(),
	}));
});

beforeEach(() => {
	jest.clearAllMocks();
	mockSidebarState = {
		sidebarOpen: false,
		setSidebarOpen: mockSetSidebarOpen,
		isMobile: false,
	};
});

test("keeps IA on its floating toggle and opens report/details only when requested", async () => {
	render(<VisorDicom />);

	await waitFor(() => expect(mockHeader).toHaveBeenCalled());
	const headerProps = mockHeader.mock.calls.at(-1)[0];
	expect(headerProps.menuOpen).toBe(false);
	expect(typeof headerProps.setMenuOpen).toBe("function");
	expect(headerProps.menuRef).toBeTruthy();

	expect(screen.getByText("Herramientas")).toBeInTheDocument();
	expect(screen.getByText("Flujo")).toBeInTheDocument();
	expect(screen.getAllByText("Maria Gomez").length).toBeGreaterThan(0);
	expect(screen.getAllByText("EN PROCESO").length).toBeGreaterThan(0);
	expect(screen.getByRole("button", { name: /Contraer series/i })).toBeInTheDocument();
	expect(screen.getByText(/Herramienta:/i)).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /^Info$/i })).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: /Activar IA/i })).toBeInTheDocument();
	expect(screen.getByTestId("panel-ia")).toHaveTextContent("IA apagada");
	expect(screen.queryByText("Reporte radiológico")).not.toBeInTheDocument();
	expect(screen.queryByText("Radiólogo")).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /^IA$/i })).not.toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: /Activar IA/i }));
	expect(screen.getByTestId("panel-ia")).toHaveTextContent("IA activa");

	fireEvent.click(screen.getAllByRole("button", { name: /^Reporte$/i })[0]);
	expect(screen.getByText("Documento de interpretación")).toBeInTheDocument();
	expect(screen.getByText("Centro Diagnóstico California")).toBeInTheDocument();
	expect(screen.getByRole("textbox", { name: /Editor de interpretación radiológica/i })).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /Buscar Plantilla/i })).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /\\+ Plantillas/i })).not.toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: /Buscar Plantilla/i }));
	expect(await screen.findByRole("dialog", { name: /Elegir plantilla/i })).toBeInTheDocument();
	expect(screen.getByRole("tab", { name: /Privado/i })).toBeInTheDocument();
	fireEvent.click(screen.getByRole("tab", { name: /Privado/i }));
	expect(await screen.findByText("DRA ODILE")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: /Cerrar selector de plantillas/i }));

	fireEvent.click(screen.getByRole("button", { name: /Opciones de reporte/i }));
	expect(screen.getByRole("button", { name: /Nueva pestaña/i })).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /Usar plantilla/i })).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: /Adjuntar/i }));
	fireEvent.change(screen.getByLabelText(/Adjuntar archivo al reporte/i), {
		target: {
			files: [
				new File(["archivo"], "interpretacion.docx", {
					type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				}),
			],
		},
	});
	await waitFor(() => expect(mockUploadAdjunto).toHaveBeenCalled());
	expect(mockInsertAdjunto).toHaveBeenCalled();

	fireEvent.click(screen.getByRole("button", { name: /Opciones de reporte/i }));
	fireEvent.mouseDown(document.body);
	expect(screen.queryByRole("button", { name: /Nueva pestaña/i })).not.toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: /^Detalle$/i }));
	expect(screen.getByText("Radiólogo")).toBeInTheDocument();
	expect(screen.getByText("Técnico")).toBeInTheDocument();
	fireEvent.mouseDown(document.body);
	expect(screen.queryByText("Técnico")).not.toBeInTheDocument();

	await waitFor(() => expect(screen.getAllByText(/Sin archivo/i).length).toBeGreaterThan(0));
});

test("connects the header hamburger to the responsive sidebar", async () => {
	mockSidebarState = {
		sidebarOpen: true,
		setSidebarOpen: mockSetSidebarOpen,
		isMobile: true,
	};

	render(<VisorDicom />);

	await waitFor(() => expect(mockHeader).toHaveBeenCalled());
	const headerProps = mockHeader.mock.calls.at(-1)[0];

	expect(headerProps.sidebarOpen).toBe(true);
	expect(headerProps.setSidebarOpen).toBe(mockSetSidebarOpen);
	expect(mockSidebar.mock.calls.at(-1)[0]).toEqual(
		expect.objectContaining({
			isOpen: true,
			setIsOpen: mockSetSidebarOpen,
		}),
	);
	expect(mockSidebarHome).not.toHaveBeenCalled();
});
