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

// La etiqueta mide 50 x 30 mm: el código de barras siempre termina a la misma
// altura para que el folio y las claves queden donde la impresora los espera.
const ANCHO_TEXTO = 46;
const TAMANO_NOMBRE = 8.5;
const TAMANO_NOMBRE_LARGO = 7;
const MAX_LINEAS_NOMBRE = 2;
const ALTO_LINEA = 2.7;
const FIN_BARCODE = 22.2;
const ALTO_BARCODE_MINIMO = 11;

// Las medidas se redondean para que el PDF salga siempre igual y no arrastre
// los decimales de la suma.
const redondear = (valor) => Math.round(valor * 100) / 100;

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

		// Un nombre largo ocupa dos renglones y antes se encimaba con el sexo y el
		// recipiente, que estaban en una altura fija: el resto de la etiqueta se
		// acomoda debajo de lo que realmente ocupó el nombre.
		const nombre = String(paciente || '').toUpperCase();
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(TAMANO_NOMBRE);
		let lineasNombre = pdf.splitTextToSize(nombre, ANCHO_TEXTO);
		if (lineasNombre.length > 1) {
			pdf.setFontSize(TAMANO_NOMBRE_LARGO);
			lineasNombre = pdf.splitTextToSize(nombre, ANCHO_TEXTO).slice(0, MAX_LINEAS_NOMBRE);
		}

		let cursor = 3;
		lineasNombre.forEach((linea) => {
			pdf.text(linea, 25, cursor, { align: 'center' });
			cursor += ALTO_LINEA;
		});

		const yEncabezado = redondear(cursor + 0.1);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(6.8);
		pdf.text(encabezado, 25, yEncabezado, { align: 'center', maxWidth: ANCHO_TEXTO });

		const yBarcode = redondear(yEncabezado + 1.4);
		const altoBarcode = redondear(Math.max(ALTO_BARCODE_MINIMO, FIN_BARCODE - yBarcode));
		pdf.addImage(barcode, 'PNG', 4, yBarcode, 42, altoBarcode);
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
