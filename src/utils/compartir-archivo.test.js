import {
	compartirArchivo,
	crearArchivoPdf,
	descargarArchivo,
	puedeCompartirArchivo,
} from "./compartir-archivo";

const archivoDePrueba = () => crearArchivoPdf(new Blob(["%PDF"]), "Cotizacion C-1.pdf");

describe("compartir un archivo", () => {
	afterEach(() => {
		delete navigator.share;
		delete navigator.canShare;
	});

	test("el archivo va como PDF y con su nombre", () => {
		const archivo = archivoDePrueba();
		expect(archivo.name).toBe("Cotizacion C-1.pdf");
		expect(archivo.type).toBe("application/pdf");
	});

	// Ni wa.me ni mailto aceptan adjuntos: el menú del sistema es el único que sí.
	test("sin menu de compartir no se intenta mandar el archivo", async () => {
		expect(puedeCompartirArchivo(archivoDePrueba())).toBe(false);
		expect(await compartirArchivo({ archivo: archivoDePrueba() })).toBe(false);
	});

	test("con menu de compartir el archivo sale por ahi", async () => {
		const compartir = jest.fn().mockResolvedValue(undefined);
		navigator.canShare = () => true;
		navigator.share = compartir;

		const archivo = archivoDePrueba();
		expect(
			await compartirArchivo({ archivo, titulo: "Cotización C-1", texto: "Hola" }),
		).toBe(true);
		expect(compartir).toHaveBeenCalledWith({
			files: [archivo],
			title: "Cotización C-1",
			text: "Hola",
		});
	});

	// Arrepentirse no es un error: si además se abriera WhatsApp, quien envía
	// acabaría con una conversación abierta que no pidió.
	test("cancelar el menu cuenta como enviado", async () => {
		navigator.canShare = () => true;
		navigator.share = jest.fn().mockRejectedValue(
			Object.assign(new Error("cancelado"), { name: "AbortError" }),
		);

		expect(await compartirArchivo({ archivo: archivoDePrueba() })).toBe(true);
	});

	test("si el menu falla se cae al camino de respaldo", async () => {
		navigator.canShare = () => true;
		navigator.share = jest.fn().mockRejectedValue(new Error("sin permiso"));

		expect(await compartirArchivo({ archivo: archivoDePrueba() })).toBe(false);
	});

	test("la descarga usa el nombre del archivo", () => {
		const clic = jest.fn();
		const enlace = { href: "", download: "", click: clic, remove: jest.fn() };
		jest.spyOn(document, "createElement").mockReturnValue(enlace);
		jest.spyOn(document.body, "appendChild").mockImplementation(() => enlace);
		URL.createObjectURL = jest.fn(() => "blob:x");
		URL.revokeObjectURL = jest.fn();

		descargarArchivo(new Blob(["%PDF"]), "Cotizacion C-1.pdf");

		expect(enlace.download).toBe("Cotizacion C-1.pdf");
		expect(clic).toHaveBeenCalled();
		document.createElement.mockRestore();
		document.body.appendChild.mockRestore();
	});
});
