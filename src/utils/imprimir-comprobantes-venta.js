import { generarTicketVenta } from "./generarTicketVenta";
import { generarEtiquetasEstudiosImagen } from "./generar-etiquetas-estudios-imagen";
import { generarEtiquetasEstudiosLaboratorio } from "./generar-etiquetas-estudios-laboratorio";

// El ticket y las etiquetas se imprimen cuando la venta ya está guardada, así
// que un tropiezo aquí (un dato que le falta al ticket, un PDF que no se pudo
// armar) no debe tirar el registro ni cerrar la pestaña que sí se abrió. Cada
// comprobante va por su cuenta y lo que falle se reporta al final.
// Tope por comprobante: si algo se queda colgado, la venta igual termina de
// registrarse y el usuario se entera, en lugar de quedarse con una pestaña en
// blanco y la pantalla sin avanzar.
const ESPERA_MAXIMA_MS = 15000;

const conLimiteDeEspera = (promesa) =>
	Promise.race([
		Promise.resolve(promesa),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error("tardó demasiado en generarse")), ESPERA_MAXIMA_MS),
		),
	]);

const ejecutar = async (nombre, tarea, ventana, fallos) => {
	try {
		await conLimiteDeEspera(tarea());
	} catch (error) {
		console.error(`Error al generar ${nombre}:`, error);
		ventana?.close?.();
		fallos.push({ nombre, motivo: error?.message || "" });
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

	if (fallos.length === 0) return { error: "" };

	// El motivo va en la notificación: sin él, un comprobante que no abre sólo
	// deja una pestaña en blanco y nadie sabe qué pasó.
	const motivos = [...new Set(fallos.map(({ motivo }) => motivo).filter(Boolean))];
	const listado = fallos.map(({ nombre }) => nombre).join(" ni ");
	return {
		error: `No fue posible abrir ${listado}${motivos.length ? `: ${motivos.join(" · ")}` : "."}`,
	};
};
