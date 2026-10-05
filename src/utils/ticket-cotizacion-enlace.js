// Mandar el ticket de una cotización por WhatsApp o por correo.
//
// En el celular lo resuelve el menú de compartir del sistema, que sí manda el
// PDF. En el mostrador no existe ese menú, y por `wa.me` o `mailto:` sólo viaja
// texto: ahí el ticket se sube y lo que se manda es su enlace, para que el
// paciente abra el mismo PDF que se le habría adjuntado.

export const BUCKET_TICKETS_COTIZACION = "cotizaciones-tickets";

// Un mes: lo que dura viva una cotización en mostrador. Pasado eso el enlace
// caduca, que es lo que se quiere de un documento con el nombre del paciente.
export const DIAS_ENLACE_TICKET = 30;
const SEGUNDOS_ENLACE_TICKET = DIAS_ENLACE_TICKET * 24 * 60 * 60;

export const rutaTicketCotizacion = (numeroCotizacion) =>
	`${String(numeroCotizacion || "cotizacion").replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;

// Sube el ticket y devuelve su enlace firmado, o null si no se pudo: sin
// enlace se sigue mandando el mensaje, que es mejor que no mandar nada.
export const subirTicketCotizacion = async (
	supabase,
	{ blob, numeroCotizacion } = {},
) => {
	if (!supabase || !blob || !numeroCotizacion) return null;
	const ruta = rutaTicketCotizacion(numeroCotizacion);

	try {
		const almacen = supabase.storage.from(BUCKET_TICKETS_COTIZACION);
		// `upsert` porque la misma cotización se puede volver a mandar después de
		// agregarle un estudio: vale el ticket más reciente.
		const { error: errorSubida } = await almacen.upload(ruta, blob, {
			contentType: "application/pdf",
			upsert: true,
		});
		if (errorSubida) throw errorSubida;

		const { data, error } = await almacen.createSignedUrl(
			ruta,
			SEGUNDOS_ENLACE_TICKET,
		);
		if (error) throw error;
		return data?.signedUrl || null;
	} catch (error) {
		// Una base sin la migración del bucket no deja a recepción sin mandar la
		// cotización: se avisa en consola y el mensaje sale igual.
		console.warn("No se pudo subir el ticket de la cotización:", error);
		return null;
	}
};

export const agregarEnlaceAlMensaje = (mensaje, enlace) =>
	enlace ? `${mensaje}\n\nTicket en PDF: ${enlace}` : mensaje;
