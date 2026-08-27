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

// La etiqueta mide 50 x 30 mm y el contenido va centrado en ella.
const ANCHO_TEXTO = 46;
const TAMANO_MEMBRETE = 7.2;
const TAMANO_MEMBRETE_MINIMO = 5;
const ALTO_ETIQUETA = 30;
const MARGEN_SUPERIOR = 3.2;

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

	// El membrete va en un solo renglón: se achica lo necesario para que quepa a
	// lo ancho de la etiqueta en vez de partirse en dos.
	const tamanoMembrete = (texto) => {
		let tamano = TAMANO_MEMBRETE;
		pdf.setFont('helvetica', 'bold');
		while (tamano > TAMANO_MEMBRETE_MINIMO) {
			pdf.setFontSize(tamano);
			if (pdf.splitTextToSize(texto, ANCHO_TEXTO).length <= 1) break;
			tamano -= 0.2;
		}
		return Math.round(tamano * 10) / 10;
	};

	estudiosImagen.forEach(({ estudio, folio: folioEstudio }, indice) => {
		if (indice || !paginaInicial) pdf.addPage([50, 30], 'landscape');

		// El contenido se arma antes de dibujarlo para poder centrarlo en la
		// etiqueta: con textos cortos quedaba todo arriba y un hueco abajo.
		const renglones = [];

		const agregar = (texto, { tam, negritas = false, alto, centrado = true }) => {
			pdf.setFont('helvetica', negritas ? 'bold' : 'normal');
			pdf.setFontSize(tam);
			pdf.splitTextToSize(String(texto || ''), ANCHO_TEXTO).forEach((linea) => {
				renglones.push({ texto: linea, tam, negritas, alto, centrado });
			});
		};

		const membrete = 'CENTRAL DIAGNOSTICA CALIFORNIA';
		agregar(membrete, {
			tam: tamanoMembrete(membrete),
			negritas: true,
			alto: 3.2,
		});
		renglones.push({ tipo: 'separador', alto: 2.6 });
		renglones.push({ tipo: 'folio', folio: folioEstudio, tam: 7, alto: 4 });
		agregar(`Paciente: ${textoMayusculas(paciente)}`, { tam: 7.5, negritas: true, alto: 3.4 });
		agregar(textoMayusculas(estudio), { tam: 8, alto: 3.6 });
		if (doctor) agregar(textoMayusculas(doctor), { tam: 7, alto: 3.4 });

		// Con textos largos el contenido no cabe: se aprieta el interlineado en vez
		// de desbordarse fuera de la etiqueta.
		const altoDisponible = ALTO_ETIQUETA - MARGEN_SUPERIOR;
		const altoNatural = renglones.reduce((total, renglon) => total + renglon.alto, 0);
		const compresion = altoNatural > altoDisponible ? altoDisponible / altoNatural : 1;
		renglones.forEach((renglon) => {
			renglon.alto = Math.round(renglon.alto * compresion * 100) / 100;
		});

		const altoContenido = renglones.reduce((total, renglon) => total + renglon.alto, 0);
		let y = Math.max(MARGEN_SUPERIOR, (ALTO_ETIQUETA - altoContenido) / 2 + 2.4);

		renglones.forEach((renglon) => {
			if (renglon.tipo === 'separador') {
				pdf.setFont('helvetica', 'normal');
				pdf.setFontSize(6.6);
				pdf.text('..............................................', 25, y, { align: 'center' });
			} else if (renglon.tipo === 'folio') {
				pdf.setFont('helvetica', 'normal');
				pdf.setFontSize(renglon.tam);
				pdf.text(`Folio: ${renglon.folio}`, 2, y);
				if (fechaEtiqueta) pdf.text(fechaEtiqueta, 48, y, { align: 'right' });
			} else {
				pdf.setFont('helvetica', renglon.negritas ? 'bold' : 'normal');
				pdf.setFontSize(renglon.tam);
				pdf.text(renglon.texto, 25, y, { align: 'center' });
			}
			y += renglon.alto;
		});
	});

	return true;
};

export const crearDocumentoEtiquetasImagen = (datos = {}) => {
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	const titulo = `Etiqueta ${datos.folio || ''}`.trim();
	pdf.setProperties({ title: titulo });

	if (!agregarEtiquetasImagenAlPdf(pdf, datos)) return null;

	return { url: URL.createObjectURL(pdf.output('blob')), titulo };
};

export const generarEtiquetasEstudiosImagen = ({ ventana, ...datos } = {}) => {
	const documento = crearDocumentoEtiquetasImagen(datos);
	if (!documento) {
		ventana?.close?.();
		return false;
	}

	abrirPdfEnPestana({ ...documento, ventana });
	return true;
};
