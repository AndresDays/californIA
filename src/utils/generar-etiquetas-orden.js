import jsPDF from 'jspdf';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
import { agregarEtiquetasImagenAlPdf } from './generar-etiquetas-estudios-imagen';
import { agregarEtiquetasLaboratorioAlPdf } from './generar-etiquetas-estudios-laboratorio';

// Las etiquetas de una orden salen en un solo PDF y una sola pestaña: abrir dos
// hace que el navegador bloquee la segunda, y con una orden de puro laboratorio
// —o de pura imagen— la pestaña que no tenía nada que mostrar se cerraba sola y
// parecía que la etiqueta no se generaba.
export const generarEtiquetasOrden = ({ folio, laboratorio, imagen, ventana } = {}) => {
	const pdf = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape' });
	const titulo = `Etiqueta ${folio || ''}`.trim();
	pdf.setProperties({ title: titulo });

	const hayLaboratorio = laboratorio
		? agregarEtiquetasLaboratorioAlPdf(pdf, laboratorio)
		: false;
	const hayImagen = imagen
		? agregarEtiquetasImagenAlPdf(pdf, imagen, { paginaInicial: !hayLaboratorio })
		: false;

	if (!hayLaboratorio && !hayImagen) {
		ventana?.close?.();
		return { generado: false, laboratorio: false, imagen: false };
	}

	const url = URL.createObjectURL(pdf.output('blob'));
	abrirPdfEnPestana({ url, titulo, ventana });
	return { generado: true, laboratorio: hayLaboratorio, imagen: hayImagen };
};
