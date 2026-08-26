import jsPDF from 'jspdf';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';

export const agruparEstudiosImagen = (estudios = []) =>
	estudios
		.filter((estudio) => {
			const area = String(estudio?.area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
			return !area.includes('laboratorio') && estudio?.modulo !== 'laboratorio';
		})
		.map((estudio) => String(estudio.descripcion || estudio.descripcion_estudio || '').trim())
		.filter(Boolean);

const textoMayusculas = (valor) => String(valor || '').trim().toUpperCase();

// Una visita que factura por las dos empresas parte su imagen en dos folios,
// así que las etiquetas se arman por grupo: cada estudio sale con el folio de
// la orden a la que pertenece, todas en el mismo PDF.
export const generarEtiquetasEstudiosImagen = ({
	folio,
	paciente,
	doctor,
	estudios,
	grupos,
	ventana,
}) => {
	const gruposEtiquetas = (grupos?.length ? grupos : [{ folio, estudios }])
		.map((grupo) => ({
			folio: grupo.folio,
			estudios: agruparEstudiosImagen(grupo.estudios),
		}))
		.filter((grupo) => grupo.estudios.length > 0);

	const estudiosImagen = gruposEtiquetas.flatMap((grupo) =>
		grupo.estudios.map((estudio) => ({ estudio, folio: grupo.folio })),
	);
	if (!estudiosImagen.length) {
		ventana?.close?.();
		return false;
	}

	const folioTitulo = gruposEtiquetas.map((grupo) => grupo.folio).join(' · ');
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	pdf.setProperties({ title: `Etiqueta ${folioTitulo}` });

	estudiosImagen.forEach(({ estudio, folio: folioEstudio }, indice) => {
		if (indice) pdf.addPage([50, 30], 'landscape');

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(7.2);
		pdf.text('CENTRAL DIAGNOSTICA CALIFORNIA', 2, 3.5);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(6.6);
		pdf.text('......................................................', 2, 5.3);
		pdf.setFontSize(7);
		pdf.text(`Folio: ${folioEstudio}`, 2, 8.2);
		pdf.setFont('helvetica', 'bold');
		pdf.text(`Paciente: ${textoMayusculas(paciente)}`, 2, 12.2, { maxWidth: 46 });
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(8);
		pdf.text(textoMayusculas(estudio), 2, 18.2, { maxWidth: 46 });
		pdf.setFontSize(7);
		pdf.text(textoMayusculas(doctor), 2, 25.7, { maxWidth: 46 });
	});

	const url = URL.createObjectURL(pdf.output('blob'));
	abrirPdfEnPestana({ url, titulo: `Etiqueta ${folioTitulo}`, ventana });
	return true;
};
