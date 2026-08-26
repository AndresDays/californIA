import jsPDF from 'jspdf';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
import { esEstudioImagenCaptura } from './captura-row-status';

// Un estudio de imagen se reconoce por su módulo, y si viene sin clasificar, por
// su clave, área y descripción: así la etiqueta sale aunque la orden no traiga
// el módulo resuelto.
export const agruparEstudiosImagen = (estudios = []) =>
	estudios
		.filter((estudio) => {
			if (estudio?.modulo === 'imagen') return true;
			if (estudio?.modulo === 'laboratorio') return esEstudioImagenCaptura(estudio);
			const area = String(estudio?.area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
			return !area.includes('laboratorio');
		})
		.map((estudio) => String(estudio.descripcion || estudio.descripcion_estudio || '').trim())
		.filter(Boolean);

const textoMayusculas = (valor) => String(valor || '').trim().toUpperCase();

// Una visita que factura por las dos empresas parte su imagen en dos folios,
// así que las etiquetas se arman por grupo: cada estudio sale con el folio de
// la orden a la que pertenece, todas en el mismo PDF.
// Dibuja las etiquetas en el PDF que se le pase, para que una orden con
// laboratorio e imagen salga en un solo documento y una sola pestaña.
export const agregarEtiquetasImagenAlPdf = (
	pdf,
	{ folio, fecha, paciente, doctor, estudios, grupos } = {},
	{ paginaInicial = true } = {},
) => {
	const gruposEtiquetas = (grupos?.length ? grupos : [{ folio, estudios }])
		.map((grupo) => ({
			folio: grupo.folio,
			estudios: agruparEstudiosImagen(grupo.estudios),
		}))
		.filter((grupo) => grupo.estudios.length > 0);

	const estudiosImagen = gruposEtiquetas.flatMap((grupo) =>
		grupo.estudios.map((estudio) => ({ estudio, folio: grupo.folio })),
	);
	if (!estudiosImagen.length) return false;

	const fechaObj = fecha ? new Date(fecha) : new Date();
	const fechaEtiqueta = Number.isNaN(fechaObj.getTime())
		? ''
		: fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

	estudiosImagen.forEach(({ estudio, folio: folioEstudio }, indice) => {
		if (indice || !paginaInicial) pdf.addPage([50, 30], 'landscape');

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(7.2);
		pdf.text('CENTRAL DIAGNOSTICA CALIFORNIA', 2, 3.5);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(6.6);
		pdf.text('......................................................', 2, 5.3);
		pdf.setFontSize(7);
		pdf.text(`Folio: ${folioEstudio}`, 2, 8.2);
		if (fechaEtiqueta) pdf.text(fechaEtiqueta, 48, 8.2, { align: 'right' });
		pdf.setFont('helvetica', 'bold');
		pdf.text(`Paciente: ${textoMayusculas(paciente)}`, 2, 12.2, { maxWidth: 46 });
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(8);
		pdf.text(textoMayusculas(estudio), 2, 18.2, { maxWidth: 46 });
		pdf.setFontSize(7);
		pdf.text(textoMayusculas(doctor), 2, 25.7, { maxWidth: 46 });
	});

	return true;
};

export const generarEtiquetasEstudiosImagen = ({ ventana, ...datos } = {}) => {
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	const titulo = `Etiqueta ${datos.folio || ''}`.trim();
	pdf.setProperties({ title: titulo });

	if (!agregarEtiquetasImagenAlPdf(pdf, datos)) {
		ventana?.close?.();
		return false;
	}

	const url = URL.createObjectURL(pdf.output('blob'));
	abrirPdfEnPestana({ url, titulo, ventana });
	return true;
};
