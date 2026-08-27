import { crearDocumentoTicketsVenta, generarTicketsVenta } from "./generarTicketVenta";
import {
	crearDocumentoEtiquetasImagen,
	generarEtiquetasEstudiosImagen,
} from "./generar-etiquetas-estudios-imagen";
import {
	crearDocumentoEtiquetasLaboratorio,
	generarEtiquetasEstudiosLaboratorio,
} from "./generar-etiquetas-estudios-laboratorio";

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

// El motivo va en la notificación: sin él, un comprobante que no sale sólo deja
// una pestaña en blanco y nadie sabe qué pasó.
const describirFallos = (fallos) => {
	if (fallos.length === 0) return "";
	const motivos = [...new Set(fallos.map(({ motivo }) => motivo).filter(Boolean))];
	const listado = fallos.map(({ nombre }) => nombre).join(" ni ");
	return `No fue posible abrir ${listado}${motivos.length ? `: ${motivos.join(" · ")}` : "."}`;
};

const ejecutar = async (nombre, tarea, ventana, fallos) => {
	try {
		// Los generadores devuelven false cuando no encontraron nada que imprimir.
		// Antes eso cerraba la pestaña en silencio: en caja salía el ticket, las
		// etiquetas no, y no había forma de saber por qué.
		if ((await conLimiteDeEspera(tarea())) === false) {
			ventana?.close?.();
			fallos.push({ nombre, motivo: "la orden no trae estudios que etiquetar" });
		}
	} catch (error) {
		console.error(`Error al generar ${nombre}:`, error);
		ventana?.close?.();
		fallos.push({ nombre, motivo: error?.message || "" });
	}
};

export const imprimirComprobantesVenta = async ({
	ticket,
	tickets,
	etiquetasLaboratorio,
	etiquetasImagen,
} = {}) => {
	const fallos = [];

	// Una orden que factura por las dos empresas lleva un ticket por empresa, y
	// los dos salen en el mismo PDF para que sea una sola impresión.
	const ticketsAImprimir = (tickets || (ticket ? [ticket] : [])).filter(Boolean);
	if (ticketsAImprimir.length > 0) {
		const ventana = ticketsAImprimir[0].ventana;
		await ejecutar(
			ticketsAImprimir.length > 1 ? "los tickets" : "el ticket",
			() => generarTicketsVenta({ tickets: ticketsAImprimir, ventana }),
			ventana,
			fallos,
		);
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

	return { error: describirFallos(fallos) };
};

// Los comprobantes se arman al guardar, pero se abren después, desde el clic de
// quien cobra: abrir tres pestañas de golpe hacía que el navegador dejara pasar
// nada más la primera, así que salía el ticket y las etiquetas se perdían sin
// aviso. Lo que no se pueda armar se reporta igual que antes.
export const prepararComprobantesVenta = async ({
	tickets,
	ticket,
	etiquetasLaboratorio,
	etiquetasImagen,
} = {}) => {
	const fallos = [];
	const comprobantes = [];

	const preparar = async (id, nombre, etiqueta, tarea) => {
		try {
			const documento = await conLimiteDeEspera(tarea());
			if (!documento) {
				fallos.push({ nombre, motivo: "la orden no trae estudios que etiquetar" });
				return;
			}
			comprobantes.push({ id, etiqueta, ...documento });
		} catch (error) {
			console.error(`Error al generar ${nombre}:`, error);
			fallos.push({ nombre, motivo: error?.message || "" });
		}
	};

	const ticketsAImprimir = (tickets || (ticket ? [ticket] : [])).filter(Boolean);
	if (ticketsAImprimir.length > 0) {
		await preparar(
			"ticket",
			ticketsAImprimir.length > 1 ? "los tickets" : "el ticket",
			ticketsAImprimir.length > 1 ? "Imprimir tickets" : "Imprimir ticket",
			() => crearDocumentoTicketsVenta({ tickets: ticketsAImprimir }),
		);
	}
	if (etiquetasLaboratorio) {
		await preparar(
			"etiquetas-laboratorio",
			"las etiquetas de laboratorio",
			"Imprimir etiquetas de laboratorio",
			() => crearDocumentoEtiquetasLaboratorio(etiquetasLaboratorio),
		);
	}
	if (etiquetasImagen) {
		await preparar(
			"etiquetas-imagen",
			"las etiquetas de imagen",
			"Imprimir etiquetas de imagen",
			() => crearDocumentoEtiquetasImagen(etiquetasImagen),
		);
	}

	return { comprobantes, error: describirFallos(fallos) };
};
