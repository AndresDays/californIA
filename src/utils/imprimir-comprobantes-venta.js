import { generarTicketVenta } from "./generarTicketVenta";
import { generarEtiquetasEstudiosImagen } from "./generar-etiquetas-estudios-imagen";
import { generarEtiquetasEstudiosLaboratorio } from "./generar-etiquetas-estudios-laboratorio";

// El ticket y las etiquetas se imprimen cuando la venta ya está guardada, así
// que un tropiezo aquí (un dato que le falta al ticket, un PDF que no se pudo
// armar) no debe tirar el registro ni cerrar la pestaña que sí se abrió. Cada
// comprobante va por su cuenta y lo que falle se reporta al final.
const ejecutar = async (nombre, tarea, ventana, fallos) => {
	try {
		await tarea();
	} catch (error) {
		console.error(`Error al generar ${nombre}:`, error);
		ventana?.close?.();
		fallos.push(nombre);
	}
};

export const imprimirComprobantesVenta = async ({
	ticket,
	etiquetasLaboratorio,
	etiquetasImagen,
} = {}) => {
	const fallos = [];

	if (ticket) {
		await ejecutar("el ticket", () => generarTicketVenta(ticket), ticket.ventana, fallos);
	}
	if (etiquetasLaboratorio) {
		await ejecutar(
			"las etiquetas de laboratorio",
			() => generarEtiquetasEstudiosLaboratorio(etiquetasLaboratorio),
			etiquetasLaboratorio.ventana,
			fallos,
		);
	}
	if (etiquetasImagen) {
		await ejecutar(
			"las etiquetas de imagen",
			() => generarEtiquetasEstudiosImagen(etiquetasImagen),
			etiquetasImagen.ventana,
			fallos,
		);
	}

	return {
		error: fallos.length ? `No fue posible abrir ${fallos.join(" ni ")}.` : "",
	};
};
