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
	getTextWidth: jest.fn((texto) => String(texto).length * 2),
	link: jest.fn(),
	autoPrint: jest.fn(),
	save: jest.fn(),
	output: jest.fn((tipo) => tipo === "arraybuffer" ? new Uint8Array([7, 8, 9]).buffer : "blob:resultados"),
};

jest.mock("jspdf", () => jest.fn(() => mockDoc));

jest.mock("qrcode", () => ({
	toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,QRMOCK"),
}));

jest.mock("jsbarcode", () => jest.fn());

jest.mock("./abrir-pdf-en-pestana", () => ({
	abrirPdfEnPestana: jest.fn(),
}));

jest.mock("pdf-lib", () => ({
	PDFDocument: {
		create: jest.fn(),
		load: jest.fn(),
	},
}), { virtual: true });

import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDocument } from "pdf-lib";
import { abrirPdfEnPestana } from "./abrir-pdf-en-pestana";
import {
	crearNombreArchivoReporte,
	generarReportePdf,
	generarResultadosCombinadosPdf,
	generarResultadosPortalPdf,
} from "./reporte-pdf";

const MEMBRETE_DATA_URL = "data:image/jpeg;base64,MEMBRETEMOCK";

const opcionesBase = {
	nombrePaciente: "Maria Rosalia Lopez",
	doctorNombre: "Odile Desage",
	estudioDescripcion: "Rodillas AP y Lateral",
	fechaEncabezado: "PUERTO VALLARTA JAL. 10 DE JULIO DE 2026.",
	reporteTexto: "<p>Hallazgos <strong>normales</strong>.</p>",
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

	test("abre la impresión en el visor PDF compartido por tickets y etiquetas", async () => {
		const ventana = { document: {} };
		const blob = new Blob(["pdf"], { type: "application/pdf" });
		URL.createObjectURL = jest.fn(() => "blob:reporte-imprimible");
		mockDoc.output.mockImplementation((tipo) =>
			tipo === "blob" ? blob : "blob:resultados",
		);

		await generarReportePdf({ ...opcionesBase, imprimir: true, ventana });

		expect(mockDoc.autoPrint).not.toHaveBeenCalled();
		expect(abrirPdfEnPestana).toHaveBeenCalledWith({
			url: "blob:reporte-imprimible",
			titulo: "Reporte Maria Rosalia Lopez",
			ventana,
		});
	});

	test("conserva el formato guardado por el radiólogo", async () => {
		await generarReportePdf({
			...opcionesBase,
			reporteTexto: '<p style="text-align:center"><strong>CONCLUSION</strong></p><p>Sin datos patológicos.</p>',
		});
		const escritos = mockDoc.text.mock.calls.map((llamada) => llamada[0]);
		expect(escritos).toEqual(expect.arrayContaining(["CONCLUSION", "Sin", "datos", "patológicos."]));
		expect(mockDoc.setFont).toHaveBeenCalledWith("helvetica", "bold");
		// El marcado nunca se imprime como texto.
		expect(escritos.join(" ")).not.toMatch(/</);
	});

	test("la hoja sólo lleva el reporte, sin fecha ni datos de paciente", async () => {
		await generarReportePdf(opcionesBase);
		const textos = mockDoc.text.mock.calls.map((llamada) => llamada[0]);
		expect(textos).not.toEqual(
			expect.arrayContaining(["PACIENTE:", "DOCTOR:", "ESTUDIO:", "MÉDICO REFERENTE"]),
		);
		expect(textos.join(" ")).not.toMatch(/PUERTO VALLARTA/i);
		expect(textos.join(" ")).not.toMatch(/MARIA ROSALIA LOPEZ/i);
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

	test("conserva el formato PNG de un membrete configurado", async () => {
		const membretePng = "data:image/png;base64,MEMBRETEPNG";

		await generarReportePdf({ ...opcionesBase, membreteSrc: membretePng });

		expect(mockDoc.addImage).toHaveBeenCalledWith(
			membretePng,
			"PNG",
			0,
			0,
			210,
			297,
		);
	});

	test("conserva el formato WEBP de un membrete configurado", async () => {
		const membreteWebp = "data:image/webp;base64,MEMBRETEWEBP";

		await generarReportePdf({ ...opcionesBase, membreteSrc: membreteWebp });

		expect(mockDoc.addImage).toHaveBeenCalledWith(
			membreteWebp,
			"WEBP",
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
		// El pie del membrete empieza en el px 998 de la hoja (≈262 mm).
		expect(qrY + qrAlto).toBeLessThanOrEqual(262);
	});

	test("no genera QR cuando no hay qrData", async () => {
		await generarReportePdf({ ...opcionesBase, qrData: "" });
		expect(QRCode.toDataURL).not.toHaveBeenCalled();
		expect(mockDoc.link).not.toHaveBeenCalled();
	});

	test("agrega paginas nuevas con membrete cuando el texto es largo", async () => {
		const textoLargo = Array.from({ length: 120 }, (_, i) => `<p>Linea ${i + 1}</p>`).join("");
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

	test("convierte la interpretación HTML de imagen en texto legible", async () => {
		await generarResultadosPortalPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [{
				tipo: "imagen",
				descripcion: "RX tórax",
				reporte: "<p>Sin hallazgos.</p><p>Correlacionar clínicamente.</p>",
			}],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => texto).join(" ");
		expect(textos).toContain("Sin hallazgos.");
		expect(textos).toContain("Correlacionar clinicamente.");
		expect(textos).not.toContain("<p>");
	});

	test("dibuja los datos del quimico en el pie de cada resultado", async () => {
		await generarResultadosPortalPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [{ tipo: "laboratorio", descripcion: "BHC", analitos: [] }],
			datosQuimicoSrc: "data:image/png;base64,QUIMICOMOCK",
		});

		expect(mockDoc.addImage).toHaveBeenCalledWith(
			"data:image/png;base64,QUIMICOMOCK",
			"PNG",
			61.5,
			220,
			87.5,
			35,
		);
	});

	test("repite los datos del quimico cuando el resultado ocupa varias paginas", async () => {
		await generarResultadosPortalPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [
				{ tipo: "laboratorio", descripcion: "BHC", estado_validacion: "validado", analitos: [] },
				{ tipo: "laboratorio", descripcion: "QS", estado_validacion: "validado", analitos: [] },
			],
			datosQuimicoSrc: "data:image/png;base64,QUIMICOMOCK",
			modoVistaPrevia: true,
		});

		const pies = mockDoc.addImage.mock.calls.filter(
			([src, formato, x, y, ancho, alto]) =>
				src === "data:image/png;base64,QUIMICOMOCK" &&
				formato === "PNG" && x === 61.5 && y === 220 && ancho === 87.5 && alto === 35,
		);
		expect(pies).toHaveLength(2);
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

describe("generarResultadosCombinadosPdf", () => {
	const cultivo = (id) => ({
		descripcion: "Cultivo bacteriológico",
		archivo_cultivo_url: `https://storage.test/${id}/cultivo.pdf`,
	});
	const bhc = { tipo: "laboratorio", descripcion: "BHC", analitos: [] };

	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn();
		jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,BARCODEMOCK");
		PDFDocument.create.mockResolvedValue({
			copyPages: jest.fn(async (_pdf, paginas) => paginas.map((pagina) => `copiada-${pagina}`)),
			addPage: jest.fn(),
			save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test("devuelve la URL firmada entregada por la consulta segura si solo hay un cultivo", async () => {
		const url = await generarResultadosCombinadosPdf({ estudios: [cultivo(17)] });

		expect(url).toBe("https://storage.test/17/cultivo.pdf");
		expect(global.fetch).not.toHaveBeenCalled();
	});

	test("rechaza cultivo sin URL firmada de la consulta segura", async () => {
		await expect(generarResultadosCombinadosPdf({
			estudios: [{ descripcion: "Cultivo bacteriológico" }],
		})).rejects.toThrow("URL autorizada");
	});

	test("conserva el PDF legado cuando no hay adjuntos de cultivo", async () => {
		const resultado = await generarResultadosCombinadosPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [bhc],
		});

		expect(resultado).toBe("blob:resultados");
		expect(PDFDocument.create).not.toHaveBeenCalled();
	});

	test("conserva páginas generadas antes del cultivo adjunto", async () => {
		const fuenteGenerada = { nombre: "generado", getPageIndices: jest.fn(() => [0]) };
		const fuenteCultivo = { nombre: "cultivo", getPageIndices: jest.fn(() => [0, 1]) };
		PDFDocument.load.mockResolvedValueOnce(fuenteGenerada).mockResolvedValueOnce(fuenteCultivo);
		global.fetch.mockResolvedValue({ ok: true, arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4)) });

		const resultado = await generarResultadosCombinadosPdf({
			venta: { paciente: "Paciente", folio: "F-1" },
			estudios: [bhc, cultivo(21)],
		});

		expect(resultado).toBeInstanceOf(Blob);
		expect(PDFDocument.load).toHaveBeenCalledWith(expect.any(ArrayBuffer));
		const combinado = await PDFDocument.create.mock.results[0].value;
		expect(combinado.copyPages.mock.calls.map(([fuente]) => fuente.nombre)).toEqual([
			"generado", "cultivo",
		]);
		expect(combinado.addPage.mock.calls.map(([pagina]) => pagina)).toEqual([
			expect.anything(), "copiada-0", "copiada-1",
		]);
	});

	test("combina varios cultivos adjuntos en el orden recibido", async () => {
		PDFDocument.load
			.mockResolvedValueOnce({ getPageIndices: () => [0] })
			.mockResolvedValueOnce({ getPageIndices: () => [0, 1] });
		global.fetch
			.mockResolvedValueOnce({ ok: true, arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1)) })
			.mockResolvedValueOnce({ ok: true, arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(2)) });

		await generarResultadosCombinadosPdf({ estudios: [cultivo(1), cultivo(2)] });

		expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
			"https://storage.test/1/cultivo.pdf",
			"https://storage.test/2/cultivo.pdf",
		]);
		const combinado = await PDFDocument.create.mock.results[0].value;
		expect(combinado.addPage.mock.calls.map(([pagina]) => pagina)).toEqual([
			"copiada-0", "copiada-0", "copiada-1",
		]);
	});

	test("informa cuando no puede descargar un cultivo adjunto", async () => {
		global.fetch.mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" });

		await expect(generarResultadosCombinadosPdf({ estudios: [cultivo(1), cultivo(2)] }))
			.rejects.toThrow("No se pudo descargar el PDF de cultivo");
	});

	test("informa claramente cuando falla la red al descargar un cultivo", async () => {
		global.fetch.mockRejectedValue(new Error("network"));

		await expect(generarResultadosCombinadosPdf({ estudios: [cultivo(1), cultivo(2)] }))
			.rejects.toThrow("No se pudo descargar el PDF de cultivo: network");
	});

	test("informa cuando la descarga no devuelve una respuesta", async () => {
		global.fetch.mockResolvedValue(undefined);

		await expect(generarResultadosCombinadosPdf({ estudios: [cultivo(1), cultivo(2)] }))
			.rejects.toThrow("No se pudo descargar el PDF de cultivo");
	});
});
