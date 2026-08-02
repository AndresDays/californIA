import jsPDF from "jspdf";
import QRCode from "qrcode";

const PAGINA_ANCHO = 210;
const PAGINA_ALTO = 297;
const MARGEN_LATERAL = 20;
const MARGEN_SUPERIOR = 42;
const MARGEN_INFERIOR = 46;

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

export const crearNombreArchivoReporte = (nombrePaciente = "") => {
	const base = String(nombrePaciente || "reporte")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();
	return `reporte_${base || "estudio"}.pdf`;
};
