import {
	BUCKET_TICKETS_COTIZACION,
	agregarEnlaceAlMensaje,
	rutaTicketCotizacion,
	subirTicketCotizacion,
} from "./ticket-cotizacion-enlace";

const crearSupabase = (almacen) => ({ storage: { from: jest.fn(() => almacen) } });

const almacenOk = () => ({
	upload: jest.fn().mockResolvedValue({ error: null }),
	createSignedUrl: jest
		.fn()
		.mockResolvedValue({ data: { signedUrl: "https://x/firmado.pdf" }, error: null }),
});

const blob = new Blob(["%PDF"], { type: "application/pdf" });

test("el ticket se guarda con el número de la cotización", () => {
	expect(rutaTicketCotizacion("COT-1209260001")).toBe("COT-1209260001.pdf");
	// Un número con caracteres raros no puede armar una ruta inesperada.
	expect(rutaTicketCotizacion("../../secreto")).toBe("secreto.pdf");
	expect(rutaTicketCotizacion()).toBe("cotizacion.pdf");
});

test("sube el ticket y devuelve su enlace firmado", async () => {
	const almacen = almacenOk();
	const supabase = crearSupabase(almacen);

	const enlace = await subirTicketCotizacion(supabase, {
		blob,
		numeroCotizacion: "COT-01",
	});

	expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET_TICKETS_COTIZACION);
	// Se reemplaza: la misma cotización se puede volver a mandar con un estudio más.
	expect(almacen.upload).toHaveBeenCalledWith("COT-01.pdf", blob, {
		contentType: "application/pdf",
		upsert: true,
	});
	// El enlace caduca: el ticket trae el nombre del paciente.
	expect(almacen.createSignedUrl).toHaveBeenCalledWith("COT-01.pdf", 30 * 24 * 60 * 60);
	expect(enlace).toBe("https://x/firmado.pdf");
});

test("sin bucket devuelve null en lugar de romper el envío", async () => {
	const almacen = almacenOk();
	almacen.upload.mockResolvedValue({ error: { message: "Bucket not found" } });

	expect(
		await subirTicketCotizacion(crearSupabase(almacen), { blob, numeroCotizacion: "COT-01" }),
	).toBeNull();
});

test("sin datos no intenta subir nada", async () => {
	expect(await subirTicketCotizacion(null, { blob, numeroCotizacion: "COT-01" })).toBeNull();
	expect(await subirTicketCotizacion(crearSupabase(almacenOk()), {})).toBeNull();
});

test("el enlace se agrega al mensaje, y sin enlace el mensaje no cambia", () => {
	expect(agregarEnlaceAlMensaje("Cotización COT-01", "https://x/f.pdf")).toContain(
		"Ticket en PDF: https://x/f.pdf",
	);
	expect(agregarEnlaceAlMensaje("Cotización COT-01", null)).toBe("Cotización COT-01");
});
