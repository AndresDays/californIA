const mockDoc = {
	addImage: jest.fn(),
	addPage: jest.fn(),
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	setDrawColor: jest.fn(),
	setFillColor: jest.fn(),
	setTextColor: jest.fn(),
	rect: jest.fn(),
	line: jest.fn(),
	text: jest.fn(),
	splitTextToSize: jest.fn((texto) => String(texto).split("\n")),
	link: jest.fn(),
	save: jest.fn(),
	output: jest.fn(() => "blob:resultados"),
};

jest.mock("jspdf", () => jest.fn(() => mockDoc));

jest.mock("qrcode", () => ({
	toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,QRMOCK"),
}));

jest.mock("jsbarcode", () => jest.fn());

import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
	crearNombreArchivoReporte,
	generarReportePdf,
	generarResultadosPortalPdf,
} from "./reporte-pdf";

const MEMBRETE_DATA_URL = "data:image/jpeg;base64,MEMBRETEMOCK";

const opcionesBase = {
	nombrePaciente: "Maria Rosalia Lopez",
	doctorNombre: "Odile Desage",
	estudioDescripcion: "Rodillas AP y Lateral",
	fechaEncabezado: "PUERTO VALLARTA JAL. 10 DE JULIO DE 2026.",
	reporteTexto: "Hallazgos normales.",
	membreteSrc: MEMBRETE_DATA_URL,
	qrData: "https://california.test/visor-paciente/123",
	nombreArchivo: "reporte_maria.pdf",
};

describe("generarReportePdf", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("crea el PDF y lo guarda con el nombre indicado", async () => {
		await generarReportePdf(opcionesBase);
		expect(jsPDF).toHaveBeenCalledWith(
			expect.objectContaining({ unit: "mm", format: "a4" }),
		);
		expect(mockDoc.save).toHaveBeenCalledWith("reporte_maria.pdf");
	});

	test("incluye los datos del paciente, doctor y estudio", async () => {
		await generarReportePdf(opcionesBase);
		const textos = mockDoc.text.mock.calls.map((llamada) => llamada[0]);
		expect(textos).toContain("PACIENTE:");
		expect(textos).toContain("MARIA ROSALIA LOPEZ");
		expect(textos).toContain("DOCTOR:");
		expect(textos).toContain("ODILE DESAGE");
		expect(textos).toContain("ESTUDIO:");
		expect(textos).toContain("RODILLAS AP Y LATERAL");
		expect(textos).toContain("PUERTO VALLARTA JAL. 10 DE JULIO DE 2026.");
	});

	test("omite fecha y líneas clínicas vacías", async () => {
		await generarReportePdf({
			...opcionesBase,
			fechaEncabezado: "",
			nombrePaciente: "",
			doctorNombre: "",
			estudioDescripcion: "",
		});
		const textos = mockDoc.text.mock.calls.map((llamada) => llamada[0]);
		expect(textos).not.toEqual(
			expect.arrayContaining(["PACIENTE:", "DOCTOR:", "ESTUDIO:", "MÉDICO REFERENTE"]),
		);
	});


	test("dibuja el membrete como fondo de pagina completa", async () => {
		await generarReportePdf(opcionesBase);
		expect(mockDoc.addImage).toHaveBeenCalledWith(
			MEMBRETE_DATA_URL,
			"JPEG",
			0,
			0,
			210,
			297,
		);
	});

	test("agrega el QR con enlace clicable sobre la misma area", async () => {
		await generarReportePdf(opcionesBase);
		expect(QRCode.toDataURL).toHaveBeenCalledWith(
			opcionesBase.qrData,
			expect.any(Object),
		);
		const llamadaQr = mockDoc.addImage.mock.calls.find(
			(llamada) => llamada[0] === "data:image/png;base64,QRMOCK",
		);
		expect(llamadaQr).toBeDefined();
		const [, , qrX, qrY, qrAncho, qrAlto] = llamadaQr;
		expect(mockDoc.link).toHaveBeenCalledWith(qrX, qrY, qrAncho, qrAlto, {
			url: opcionesBase.qrData,
		});
	});

	test("el QR queda completo por encima del margen inferior (footer)", async () => {
		await generarReportePdf(opcionesBase);
		const llamadaQr = mockDoc.addImage.mock.calls.find(
			(llamada) => llamada[0] === "data:image/png;base64,QRMOCK",
		);
		const [, , , qrY, , qrAlto] = llamadaQr;
		expect(qrY + qrAlto).toBeLessThanOrEqual(297 - 46);
	});

	test("no genera QR cuando no hay qrData", async () => {
		await generarReportePdf({ ...opcionesBase, qrData: "" });
		expect(QRCode.toDataURL).not.toHaveBeenCalled();
		expect(mockDoc.link).not.toHaveBeenCalled();
	});

	test("agrega paginas nuevas con membrete cuando el texto es largo", async () => {
		const textoLargo = Array.from({ length: 120 }, (_, i) => `Linea ${i + 1}`).join("\n");
		await generarReportePdf({ ...opcionesBase, reporteTexto: textoLargo });
		expect(mockDoc.addPage).toHaveBeenCalled();
		const membretes = mockDoc.addImage.mock.calls.filter(
			(llamada) => llamada[0] === MEMBRETE_DATA_URL,
		);
		expect(membretes.length).toBeGreaterThan(1);
	});
});

describe("crearNombreArchivoReporte", () => {
	test("normaliza acentos, espacios y mayusculas", () => {
		expect(crearNombreArchivoReporte("José Pérez García")).toBe(
			"reporte_jose_perez_garcia.pdf",
		);
	});

	test("usa fallback cuando no hay nombre", () => {
		expect(crearNombreArchivoReporte("")).toBe("reporte_reporte.pdf");
		expect(crearNombreArchivoReporte("···")).toBe("reporte_estudio.pdf");
	});
});

describe("generarResultadosPortalPdf", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,BARCODEMOCK");
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test("usa el membrete y organiza los analitos en una tabla", async () => {
		const url = await generarResultadosPortalPdf({
			venta: {
				paciente: "Cynthia Lorena Cortes",
				folio: "1506260003",
				fecha_venta: "2026-06-15",
				fecha_nacimiento: "1978-01-01",
				sexo: "Femenino",
			},
			estudios: [{
				tipo: "laboratorio",
				descripcion: "Quimica sanguinea",
				analitos: [{ descripcion: "Glucosa serica", resultado: "81", unidades: "mg/dL", referencia: "Mujeres: 0.5 - 1.2<BR>Hombres: 0.6 - 1.5" }],
			}],
			membreteSrc: MEMBRETE_DATA_URL,
		});

		expect(url).toBe("blob:resultados");
		expect(JsBarcode).toHaveBeenCalledWith(
			expect.any(HTMLCanvasElement),
			"1506260003",
			expect.objectContaining({ format: "CODE128", width: 3, height: 56 }),
		);
		expect(mockDoc.addImage).toHaveBeenCalledWith(MEMBRETE_DATA_URL, "JPEG", 0, 0, 210, 297);
		expect(mockDoc.rect).toHaveBeenCalledWith(10, 47, 190, 22);
		expect(mockDoc.addImage).toHaveBeenCalledWith("data:image/png;base64,BARCODEMOCK", "PNG", 158, 49.5, 40, 16);
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);
		expect(textos).toEqual(expect.arrayContaining(["PACIENTE:", "CYNTHIA LORENA CORTES", "PARAMETRO", "RESULTADO", "UNIDAD", "REFERENCIA", "GLUCOSA SERICA", "81", "mg/dL"]));
		expect(textos.join(" ")).not.toContain("<BR>");
		expect(textos).toEqual(expect.arrayContaining(["Mujeres: 0.5 - 1.2", "Hombres: 0.6 - 1.5"]));
	});

	test("en vista previa separa estudios y marca cada página según su validación", async () => {
		await generarResultadosPortalPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [
				{ tipo: "laboratorio", descripcion: "Estudio validado", estado_validacion: "validado", analitos: [] },
				{ tipo: "laboratorio", descripcion: "Estudio pendiente", estado_validacion: "guardado", analitos: [] },
			],
			membreteSrc: MEMBRETE_DATA_URL,
			modoVistaPrevia: true,
		});

		expect(mockDoc.addPage).toHaveBeenCalledTimes(1);
		expect(mockDoc.setFontSize).toHaveBeenCalledWith(40);
		expect(mockDoc.text).toHaveBeenCalledWith(
			"RESULTADOS VALIDADOS",
			150,
			190,
			expect.objectContaining({ align: "center", angle: 45 }),
		);
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);
		expect(textos).toEqual(expect.arrayContaining(["RESULTADOS VALIDADOS", "RESULTADOS NO VALIDADOS"]));
	});
});
