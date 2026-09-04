import jsPDF from 'jspdf';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
import { agregarEtiquetasImagenAlPdf } from './generar-etiquetas-estudios-imagen';
import { agregarEtiquetasLaboratorioAlPdf } from './generar-etiquetas-estudios-laboratorio';

// Las etiquetas de una orden salen en un solo PDF: con una orden de puro
// laboratorio —o de pura imagen— la pestaña que no tenía nada que mostrar se
// cerraba sola y parecía que la etiqueta no se generaba.
//
// Armar el documento se separa de abrirlo, igual que en el ticket: la
// reimpresión desde editar orden lo prepara antes y lo abre desde el clic de
// quien imprime, que es lo que el navegador sí deja pasar.
export const crearDocumentoEtiquetasOrden = ({ folio, laboratorio, imagen } = {}) => {
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	const titulo = `Etiqueta ${folio || ''}`.trim();
	pdf.setProperties({ title: titulo });

	const hayLaboratorio = laboratorio
		? agregarEtiquetasLaboratorioAlPdf(pdf, laboratorio)
		: false;
	const hayImagen = imagen
		? agregarEtiquetasImagenAlPdf(pdf, imagen, { paginaInicial: !hayLaboratorio })
		: false;

	if (!hayLaboratorio && !hayImagen) return null;

	return {
		url: URL.createObjectURL(pdf.output('blob')),
		titulo,
		laboratorio: hayLaboratorio,
		imagen: hayImagen,
	};
};

// Una sola pestaña: abrir dos hace que el navegador bloquee la segunda.
export const generarEtiquetasOrden = ({ folio, laboratorio, imagen, ventana } = {}) => {
	const documento = crearDocumentoEtiquetasOrden({ folio, laboratorio, imagen });

	if (!documento) {
		ventana?.close?.();
		return { generado: false, laboratorio: false, imagen: false };
	}

	abrirPdfEnPestana({ url: documento.url, titulo: documento.titulo, ventana });
	return { generado: true, laboratorio: documento.laboratorio, imagen: documento.imagen };
};
