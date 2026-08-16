export const agruparEstudiosPorRecipiente = (estudios = []) => {
	const grupos = new Map();

	for (const estudio of estudios) {
		const recipiente = String(estudio.recipiente || '').trim();
		const clave = String(estudio.clave || estudio.clave_estudio || '').trim();

		if (estudio.modulo !== 'laboratorio' || !recipiente || !clave) continue;

		const grupo = grupos.get(recipiente) || {
			recipiente,
			tipoMuestra: String(estudio.tipo_muestra || '').trim(),
			claves: [],
		};

		grupo.claves.push(clave);
		grupos.set(recipiente, grupo);
	}

	return [...grupos.values()];
};

const crearBarcode = (folio) => {
	const canvas = document.createElement('canvas');
	JsBarcode(canvas, String(folio), {
		format: 'CODE128',
		width: 2,
		height: 105,
		displayValue: false,
		margin: 0,
	});
	return canvas.toDataURL('image/png');
};

export const generarEtiquetasEstudiosLaboratorio = ({
	folio,
	paciente,
	sexo,
	edad,
	estudios,
	ventana,
}) => {
	const grupos = agruparEstudiosPorRecipiente(estudios);
	if (!grupos.length) {
		ventana?.close?.();
		return false;
	}

	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	pdf.setProperties({ title: `Etiqueta ${folio}` });
	const barcode = crearBarcode(folio);

	grupos.forEach((grupo, indice) => {
		if (indice) pdf.addPage([50, 30], 'landscape');

		const encabezado = [sexo, edad, grupo.recipiente]
			.filter(Boolean)
			.join(' - ');

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(8.5);
		pdf.text(String(paciente || '').toUpperCase(), 25, 3, {
			align: 'center',
			maxWidth: 46,
		});
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(6.8);
		pdf.text(encabezado, 25, 5.8, { align: 'center', maxWidth: 46 });
		pdf.addImage(barcode, 'PNG', 4, 7.2, 42, 15);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(8.5);
		pdf.setCharSpace(1.2);
		pdf.text(String(folio), 25, 24.8, { align: 'center' });
		pdf.setCharSpace(0);
		pdf.setFontSize(7.5);
		pdf.text(grupo.claves.join(', '), 4, 27.5, { maxWidth: 42 });
	});

	const url = URL.createObjectURL(pdf.output('blob'));
	abrirPdfEnPestana({ url, titulo: `Etiqueta ${folio}`, ventana });
	return true;
};
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
