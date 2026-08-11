import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDocument } from "pdf-lib";
import {
	esEstudioCultivo,
	hidratarArchivoCultivoUrl,
	separarEstudiosConCultivo,
} from "./resultados-cultivo";

const PAGINA_ANCHO = 210;
const PAGINA_ALTO = 297;
const MARGEN_LATERAL = 20;
const MARGEN_SUPERIOR = 42;
const MARGEN_INFERIOR = 72;

const cargarImagenComoDataUrl = async (src) => {
	if (!src) return null;
	if (src.startsWith("data:")) return src;
	try {
		const respuesta = await fetch(src);
		const blob = await respuesta.blob();
		return await new Promise((resolve, reject) => {
			const lector = new FileReader();
			lector.onload = () => resolve(lector.result);
			lector.onerror = reject;
			lector.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
};

export const generarReportePdf = async ({
	nombrePaciente = "",
	doctorNombre = "",
	estudioDescripcion = "",
	fechaEncabezado = "",
	reporteTexto = "",
	membreteSrc = null,
	qrData = "",
	nombreArchivo = "reporte.pdf",
} = {}) => {
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	const membrete = await cargarImagenComoDataUrl(membreteSrc);
	const anchoUtil = PAGINA_ANCHO - MARGEN_LATERAL * 2;

	const dibujarMembrete = () => {
		if (!membrete) return;
		try {
			doc.addImage(membrete, "JPEG", 0, 0, PAGINA_ANCHO, PAGINA_ALTO);
		} catch {}
	};

	dibujarMembrete();

	let y = MARGEN_SUPERIOR;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	if (fechaEncabezado) {
		doc.text(String(fechaEncabezado).toUpperCase(), PAGINA_ANCHO - MARGEN_LATERAL, y, {
			align: "right",
		});
		y += 10;
	}

	doc.setFont("helvetica", "bold");
	const datos = [
		["PACIENTE:", nombrePaciente],
		["DOCTOR:", doctorNombre],
		["ESTUDIO:", estudioDescripcion],
	].filter(([, valor]) => String(valor ?? "").trim());
	datos.forEach(([etiqueta, valor]) => {
		doc.text(etiqueta, MARGEN_LATERAL, y);
		doc.setFont("helvetica", "normal");
		doc.text(String(valor).toUpperCase(), MARGEN_LATERAL + 28, y);
		doc.setFont("helvetica", "bold");
		y += 6;
	});
	y += 6;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(11);
	const lineas = doc.splitTextToSize(String(reporteTexto || ""), anchoUtil);
	const interlineado = 5.4;
	lineas.forEach((linea) => {
		if (y > PAGINA_ALTO - MARGEN_INFERIOR) {
			doc.addPage();
			dibujarMembrete();
			y = MARGEN_SUPERIOR;
		}
		doc.text(linea, MARGEN_LATERAL, y);
		y += interlineado;
	});

	if (qrData) {
		try {
			const qrDataUrl = await QRCode.toDataURL(qrData, {
				margin: 1,
				width: 220,
				color: { dark: "#111111", light: "#ffffff" },
			});
			const qrTamano = 28;
			const qrX = PAGINA_ANCHO - MARGEN_LATERAL - qrTamano;
			const qrY = PAGINA_ALTO - MARGEN_INFERIOR - qrTamano - 4;
			doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrTamano, qrTamano);
			doc.link(qrX, qrY, qrTamano, qrTamano, { url: qrData });
		} catch {}
	}

	doc.save(nombreArchivo);
};

const normalizarPdf = (valor, fallback = "-") =>
	String(valor ?? fallback)
		.replace(/<br\s*\/?>/gi, "\n")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim() || fallback;

const calcularEdadPdf = (fechaNacimiento) => {
	if (!fechaNacimiento) return "-";
	const hoy = new Date();
	const nacimiento = new Date(fechaNacimiento);
	let edad = hoy.getFullYear() - nacimiento.getFullYear();
	if (
		hoy.getMonth() < nacimiento.getMonth() ||
		(hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
	) edad -= 1;
	return `${edad} AÑOS`;
};

const formatearFechaPdf = (fecha) => {
	if (!fecha) return "-";
	const valor = new Date(
		typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
			? `${fecha}T12:00:00`
			: fecha,
	);
	if (Number.isNaN(valor.getTime())) return normalizarPdf(fecha);
	return valor.toLocaleDateString("es-MX", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

const generarCodigoBarras = (folio) => {
	if (!folio || typeof document === "undefined") return null;
	try {
		const canvas = document.createElement("canvas");
		JsBarcode(canvas, String(folio), {
			format: "CODE128",
			width: 3,
			height: 56,
			displayValue: true,
			fontSize: 11,
			margin: 2,
			background: "#ffffff",
			lineColor: "#000000",
		});
		return canvas.toDataURL("image/png");
	} catch {
		return null;
	}
};

const generarResultadosPortalPdfConSalida = async ({
	venta = {},
	estudios = [],
	membreteSrc = null,
	datosQuimicoSrc = null,
	modoVistaPrevia = false,
	formatoSalida = "bloburl",
} = {}) => {
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	const membrete = await cargarImagenComoDataUrl(membreteSrc);
	const datosQuimico = await cargarImagenComoDataUrl(datosQuimicoSrc);
	const margen = 10;
	const yInicial = 47;
	const yLimite = PAGINA_ALTO - MARGEN_INFERIOR;
	const ancho = PAGINA_ANCHO - margen * 2;

	const dibujarMembrete = () => {
		if (!membrete) return;
		try {
			doc.addImage(membrete, "JPEG", 0, 0, PAGINA_ANCHO, PAGINA_ALTO);
		} catch {}
	};
	const dibujarDatosQuimico = () => {
		if (!datosQuimico) return;
		try {
			doc.addImage(datosQuimico, "PNG", 61.5, 220, 87.5, 35);
		} catch {}
	};
	const dibujarMarcaVistaPrevia = (estadoValidacion) => {
		if (!modoVistaPrevia) return;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(40);
		doc.setTextColor(70, 70, 70);
		doc.text(
			estadoValidacion === "validado"
				? "RESULTADOS VALIDADOS"
				: "RESULTADOS NO VALIDADOS",
			150,
			190,
			{ align: "center", angle: 45 },
		);
		doc.setTextColor(0, 0, 0);
	};
	const nuevaPagina = (estadoValidacion, marcarPaginaAnterior = true) => {
		if (marcarPaginaAnterior) dibujarMarcaVistaPrevia(estadoValidacion);
		dibujarDatosQuimico();
		doc.addPage();
		dibujarMembrete();
		return yInicial;
	};
	const texto = (valor, x, y, opciones = {}) => {
		doc.setFont("helvetica", opciones.bold ? "bold" : "normal");
		doc.setFontSize(opciones.size || 9);
		doc.text(normalizarPdf(valor), x, y, opciones.align ? { align: opciones.align } : undefined);
	};

	dibujarMembrete();
	let y = yInicial;
	const codigoBarras = generarCodigoBarras(venta.folio);
	doc.setDrawColor(105, 105, 105);
	doc.rect(margen, y, ancho, 22);
	texto("PACIENTE:", margen + 3, y + 5, { bold: true, size: 8 });
	texto(normalizarPdf(venta.paciente).toUpperCase(), margen + 25, y + 5, { bold: true, size: 8 });
	texto("EDAD:", margen + 3, y + 11, { bold: true, size: 8 });
	texto(calcularEdadPdf(venta.fecha_nacimiento), margen + 25, y + 11, { bold: true, size: 8 });
	texto("SEXO:", margen + 3, y + 17, { bold: true, size: 8 });
	texto(normalizarPdf(venta.sexo).toUpperCase(), margen + 25, y + 17, { bold: true, size: 8 });
	texto("FOLIO:", 105, y + 5, { bold: true, size: 7 });
	texto(normalizarPdf(venta.folio), 120, y + 5, { bold: true, size: 7 });
	texto("FECHA DE MUESTRA:", 105, y + 11, { bold: true, size: 7 });
	texto(formatearFechaPdf(venta.fecha_venta), 137, y + 11, { bold: true, size: 7 });
	texto("FECHA DE IMPRESIÓN:", 105, y + 17, { bold: true, size: 7 });
	texto(formatearFechaPdf(new Date()), 137, y + 17, { bold: true, size: 7 });
	if (codigoBarras) doc.addImage(codigoBarras, "PNG", 158, y + 2.5, 40, 16);
	y += 30;

	let indiceEstudio = 0;
	for (const estudio of estudios) {
		if (modoVistaPrevia) {
			if (indiceEstudio > 0) y = nuevaPagina(estudio.estado_validacion, false);
		}
		const titulo = normalizarPdf(estudio.descripcion).toUpperCase();
		if (y + 18 > yLimite) y = nuevaPagina(estudio.estado_validacion);
		texto(titulo, PAGINA_ANCHO / 2, y, { bold: true, size: 10, align: "center" });
		y += 7;

		if (estudio.tipo === "imagen") {
			const lineas = doc.splitTextToSize(normalizarPdf(estudio.reporte, "SIN REPORTE DISPONIBLE."), ancho - 4);
			for (const linea of lineas) {
				if (y > yLimite) y = nuevaPagina(estudio.estado_validacion);
				texto(linea, margen + 2, y, { size: 10 });
				y += 5;
			}
			y += 5;
			continue;
		}

		if (y + 10 > yLimite) y = nuevaPagina();
		doc.setFillColor(238, 238, 238);
		doc.rect(margen, y - 4, ancho, 6, "F");
		doc.setDrawColor(105, 105, 105);
		doc.line(margen, y - 4, margen + ancho, y - 4);
		doc.line(margen, y + 2, margen + ancho, y + 2);
		texto("PARÁMETRO", margen + 1, y, { size: 9 });
		texto("RESULTADO", 91, y, { size: 9 });
		texto("UNIDAD", 128, y, { size: 9 });
		texto("REFERENCIA", 150, y, { size: 9 });
		y += 8;

		for (const analito of estudio.analitos || []) {
			if (y > yLimite) {
				y = nuevaPagina(estudio.estado_validacion);
				doc.setFillColor(238, 238, 238);
				doc.rect(margen, y - 4, ancho, 6, "F");
				texto("PARÁMETRO", margen + 1, y, { size: 9 });
				texto("RESULTADO", 91, y, { size: 9 });
				texto("UNIDAD", 128, y, { size: 9 });
				texto("REFERENCIA", 150, y, { size: 9 });
				y += 8;
			}
			texto(normalizarPdf(analito.descripcion || analito.clave).toUpperCase(), margen + 1, y);
			texto(analito.resultado, 93, y);
			texto(analito.unidades || analito.unidad || "-", 130, y);
			const referencia = doc.splitTextToSize(normalizarPdf(analito.referencia), 50);
			referencia.forEach((linea, indice) => texto(linea, 150, y + indice * 4, { size: 8 }));
			y += Math.max(6, referencia.length * 4 + 2);
			doc.setDrawColor(220, 220, 220);
			doc.line(margen, y - 3, margen + ancho, y - 3);
		}
		y += 6;
		dibujarMarcaVistaPrevia(estudio.estado_validacion);
		indiceEstudio += 1;
	}

	dibujarDatosQuimico();
	return doc.output(formatoSalida);
};

export const generarResultadosPortalPdf = async (opciones = {}) =>
	generarResultadosPortalPdfConSalida(opciones);

const agregarPaginasPdf = async (destino, origen) => {
	const paginas = await destino.copyPages(origen, origen.getPageIndices());
	paginas.forEach((pagina) => destino.addPage(pagina));
};

const descargarPdfCultivo = async (url) => {
	let respuesta;
	try {
		respuesta = await fetch(url);
	} catch (error) {
		throw new Error(`No se pudo descargar el PDF de cultivo: ${error.message}`);
	}
	if (!respuesta?.ok || typeof respuesta.arrayBuffer !== "function") {
		throw new Error(
			`No se pudo descargar el PDF de cultivo (${respuesta?.status || "sin estado"}${respuesta?.statusText ? ` ${respuesta.statusText}` : ""}).`,
		);
	}
	return respuesta.arrayBuffer();
};

export const generarResultadosCombinadosPdf = async ({
	venta = {},
	estudios = [],
	membreteSrc = null,
	datosQuimicoSrc = null,
	modoVistaPrevia = false,
	supabase,
} = {}) => {
	const estudiosConUrl = await Promise.all((estudios || []).map((estudio) =>
		hidratarArchivoCultivoUrl(estudio, supabase),
	));
	const { generados, adjuntosCultivo } = separarEstudiosConCultivo(estudiosConUrl);
	if (estudiosConUrl.some((estudio) => esEstudioCultivo(estudio) && !estudio?.archivo_cultivo_url)) {
		throw new Error("No fue posible obtener la URL autorizada del PDF de cultivo.");
	}
	const cultivos = adjuntosCultivo;

	if (cultivos.some((estudio) => !estudio.archivo_cultivo_url)) {
		throw new Error("No fue posible obtener la URL autorizada del PDF de cultivo.");
	}
	if (generados.length === 0 && cultivos.length === 1) {
		return cultivos[0].archivo_cultivo_url;
	}
	if (cultivos.length === 0) {
		return generarResultadosPortalPdf({ venta, estudios: generados, membreteSrc, datosQuimicoSrc, modoVistaPrevia });
	}

	const combinado = await PDFDocument.create();
	if (generados.length > 0) {
	const pdfGenerado = await generarResultadosPortalPdfConSalida({
			venta,
			estudios: generados,
			membreteSrc,
			datosQuimicoSrc,
			modoVistaPrevia,
			formatoSalida: "arraybuffer",
		});
		await agregarPaginasPdf(combinado, await PDFDocument.load(pdfGenerado));
	}
	for (const cultivo of cultivos) {
		const pdfCultivo = await PDFDocument.load(
			await descargarPdfCultivo(cultivo.archivo_cultivo_url),
		);
		await agregarPaginasPdf(combinado, pdfCultivo);
	}
	return new Blob([await combinado.save()], { type: "application/pdf" });
};

export const crearNombreArchivoReporte = (nombrePaciente = "") => {
	const base = String(nombrePaciente || "reporte")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();
	return `reporte_${base || "estudio"}.pdf`;
};
