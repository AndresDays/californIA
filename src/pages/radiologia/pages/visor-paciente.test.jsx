import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "../../../lib/supabase-client";
import { generarReportePdf } from "../../../utils/reporte-pdf";
import VisorPaciente from "./visor-paciente";

// Polyfills
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock("cornerstone-core", () => ({
	enable: jest.fn(),
	disable: jest.fn(),
	loadAndCacheImage: jest.fn(() =>
		Promise.resolve({ imageId: "mock-id", width: 512, height: 512 }),
	),
	displayImage: jest.fn(),
	getViewport: jest.fn(() => ({
		scale: 1,
		voi: { windowWidth: 400, windowCenter: 40 },
		translation: { x: 0, y: 0 },
	})),
	setViewport: jest.fn(),
	updateImage: jest.fn(),
	reset: jest.fn(),
	resize: jest.fn(),
	getEnabledElement: jest.fn(() => ({ canvas: {} })),
	events: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
}));

jest.mock("cornerstone-wado-image-loader", () => ({
	external: { cornerstone: null, dicomParser: null },
	configure: jest.fn(),
}));

jest.mock("dicom-parser", () => ({}));

jest.mock("../../../utils/reporte-pdf", () => ({
	generarReportePdf: jest.fn().mockResolvedValue(undefined),
	crearNombreArchivoReporte: jest.fn(() => "reporte_test.pdf"),
}));

jest.mock("../../../utils/membrete-cdc", () => ({
	MEMBRETE_FALLBACK: "data:image/jpeg;base64,MEMBRETEMOCK",
	cargarMembreteCdc: jest.fn(() => Promise.resolve("data:image/jpeg;base64,MEMBRETECDC")),
}));

const ESTUDIO = {
	id_estudio: 123,
	storage_path: "123/imagen.dcm",
	reporte: "Hallazgos sin alteraciones.",
	tipo_estudio: "DX",
	descripcion: "Rodillas AP y Lateral",
	fecha_estudio: "2026-07-10",
	id_paciente: 7,
	id_radiologo: 4,
	doctor: { nombre: "Odile Desage" },
};

const PACIENTE = {
	nombre: "Maria Rosalia",
	apellido_paterno: "Lopez",
	apellido_materno: "",
	fecha_nacimiento: "1947-10-07",
	sexo: "F",
};

const IMAGENES = [
	{
		id_imagen: 1,
		id_estudio: 123,
		bucket: "radiologia",
		storage_path: "123/img-1.dcm",
		file_name: "img-1.dcm",
		instance_number: 1,
		modality: "DX",
		series_description: "Serie AP",
	},
	{
		id_imagen: 2,
		id_estudio: 123,
		bucket: "radiologia",
		storage_path: "123/img-2.dcm",
		file_name: "img-2.dcm",
		instance_number: 2,
		modality: "DX",
		series_description: "Serie AP",
	},
];

const configurarSupabase = ({ estudio = ESTUDIO, imagenes = IMAGENES } = {}) => {
	supabase.from.mockImplementation((tabla) => {
		if (tabla === "estudios_radiologia") {
			return {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue(
					estudio
						? { data: estudio, error: null }
						: { data: null, error: { message: "not found" } },
				),
			};
		}
		if (tabla === "empleados") {
			return {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: {
						nombre: "Dra. Odile Desage",
						cedula: "12345678",
						especialidad: "Radiología e Imagen",
						firma_digital: "https://firmas.test/odile.png",
					},
					error: null,
				}),
			};
		}
		if (tabla === "pacientes") {
			return {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: PACIENTE, error: null }),
			};
		}
		if (tabla === "estudio_dicom_imagenes") {
			return {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: imagenes, error: null }),
			};
		}
		return {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		};
	});
};

const renderVisor = () =>
	render(
		<MemoryRouter initialEntries={["/visor-paciente/123"]}>
			<Routes>
				<Route path="/visor-paciente/:estudioId" element={<VisorPaciente />} />
			</Routes>
		</MemoryRouter>,
	);

describe("VisorPaciente", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		configurarSupabase();
	});

	test("muestra los datos del paciente y las series al cargar", async () => {
		renderVisor();
		expect((await screen.findAllByText("Serie AP")).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Maria Rosalia Lopez").length).toBeGreaterThan(0);
		expect(screen.getAllByText(/2 imágenes/).length).toBeGreaterThan(0);
	});

	test("carga cada imagen DICOM mediante una URL firmada", async () => {
		const storage = {
			getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://public.example/imagen.dcm" } })),
			createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example/imagen.dcm" }, error: null }),
		};
		supabase.storage.from.mockReturnValue(storage);

		renderVisor();
		await screen.findAllByText("Serie AP");

		expect(storage.createSignedUrl).toHaveBeenCalledWith("123/img-1.dcm", 900);
		expect(storage.createSignedUrl).toHaveBeenCalledWith("123/img-2.dcm", 900);
	});

	test("muestra la toolbar simplificada de herramientas", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		["Scroll", "Ampliar", "W/L", "Mover", "Restaurar", "Descargar"].forEach(
			(etiqueta) => {
				expect(screen.getByText(etiqueta)).toBeInTheDocument();
			},
		);
		// Sin herramientas de edicion del visor interno
		expect(screen.queryByText("Anotar")).not.toBeInTheDocument();
		expect(screen.queryByText("Reporte")).toBeInTheDocument(); // solo miniatura
	});

	test("muestra la miniatura REP cuando el estudio tiene reporte", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		expect(screen.getByLabelText("Abrir reporte")).toBeInTheDocument();
	});

	test("no muestra la miniatura REP sin reporte", async () => {
		configurarSupabase({ estudio: { ...ESTUDIO, reporte: "" } });
		renderVisor();
		await screen.findAllByText("Serie AP");
		expect(screen.queryByLabelText("Abrir reporte")).not.toBeInTheDocument();
	});

	test("al abrir el reporte muestra la hoja membretada de la plantilla CDC", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		fireEvent.click(screen.getByLabelText("Abrir reporte"));
		await waitFor(() =>
			expect(screen.getByAltText("membrete")).toHaveAttribute(
				"src",
				"data:image/jpeg;base64,MEMBRETECDC",
			),
		);
		expect(screen.getByText("Hallazgos sin alteraciones.")).toBeInTheDocument();
	});

	test("el reporte ya no incluye fecha ni datos de paciente, doctor o estudio", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		fireEvent.click(screen.getByLabelText("Abrir reporte"));
		expect(screen.queryByText("PACIENTE:")).not.toBeInTheDocument();
		expect(screen.queryByText("DOCTOR:")).not.toBeInTheDocument();
		expect(screen.queryByText("ESTUDIO:")).not.toBeInTheDocument();
		expect(screen.queryByText(/PUERTO VALLARTA/i)).not.toBeInTheDocument();
	});

	test("en la vista de reporte Descargar genera el PDF con el QR al visor", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		fireEvent.click(screen.getByLabelText("Abrir reporte"));
		fireEvent.click(screen.getByText("Descargar"));
		await waitFor(() => expect(generarReportePdf).toHaveBeenCalled());
		expect(generarReportePdf).toHaveBeenCalledWith(
			expect.objectContaining({
				nombrePaciente: "Maria Rosalia Lopez",
				reporteTexto: "Hallazgos sin alteraciones.",
				qrData: expect.stringContaining("/visor-paciente/123"),
			}),
		);
		const argumentos = generarReportePdf.mock.calls.at(-1)[0];
		expect(argumentos).not.toHaveProperty("fechaEncabezado");
		expect(argumentos).not.toHaveProperty("doctorNombre");
		expect(argumentos).not.toHaveProperty("estudioDescripcion");
	});

	test("el reporte cierra con la firma del radiólogo que interpretó", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		fireEvent.click(screen.getByLabelText("Abrir reporte"));
		expect(await screen.findByText("Dra. Odile Desage")).toBeInTheDocument();
		expect(screen.getByText("MÉDICO RADIÓLOGO")).toBeInTheDocument();
		expect(screen.getByText("CE 12345678")).toBeInTheDocument();
		expect(screen.getByAltText("Firma de Dra. Odile Desage")).toHaveAttribute(
			"src",
			"https://firmas.test/odile.png",
		);
	});

	test("el PDF del visor incluye la firma del radiólogo", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		fireEvent.click(screen.getByLabelText("Abrir reporte"));
		await screen.findByText("Dra. Odile Desage");
		fireEvent.click(screen.getByText("Descargar"));
		await waitFor(() => expect(generarReportePdf).toHaveBeenCalled());
		expect(generarReportePdf).toHaveBeenCalledWith(
			expect.objectContaining({
				firma: expect.objectContaining({
					nombre: "Dra. Odile Desage",
					cedula: "12345678",
					firmaUrl: "https://firmas.test/odile.png",
				}),
			}),
		);
	});

	test("la barra de imágenes cambia de imagen en el visor", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		const barra = screen.getByLabelText("Cambiar de imagen");
		expect(barra).toHaveValue("0");
		fireEvent.change(barra, { target: { value: "1" } });
		expect(screen.getByLabelText("Cambiar de imagen")).toHaveValue("1");
	});

	test("cada deslizada del dedo avanza una sola imagen", async () => {
		renderVisor();
		await screen.findAllByText("Serie AP");
		const lienzo = document.querySelector(".vp-canvas");

		fireEvent.touchStart(lienzo, { touches: [{ clientX: 100, clientY: 300 }] });
		fireEvent.touchMove(lienzo, { touches: [{ clientX: 100, clientY: 200 }] });
		fireEvent.touchMove(lienzo, { touches: [{ clientX: 100, clientY: 90 }] });
		fireEvent.touchEnd(lienzo);
		expect(screen.getByLabelText("Cambiar de imagen")).toHaveValue("1");

		// Deslizar hacia abajo regresa una sola imagen.
		fireEvent.touchStart(lienzo, { touches: [{ clientX: 100, clientY: 180 }] });
		fireEvent.touchMove(lienzo, { touches: [{ clientX: 100, clientY: 300 }] });
		fireEvent.touchMove(lienzo, { touches: [{ clientX: 100, clientY: 420 }] });
		fireEvent.touchEnd(lienzo);
		expect(screen.getByLabelText("Cambiar de imagen")).toHaveValue("0");
	});

	test("muestra error cuando el estudio no existe", async () => {
		configurarSupabase({ estudio: null, imagenes: [] });
		renderVisor();
		expect(
			await screen.findByText("No encontramos el estudio solicitado"),
		).toBeInTheDocument();
	});
});
