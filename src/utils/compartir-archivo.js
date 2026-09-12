// Mandar un archivo -el ticket de una cotización, por ejemplo- por WhatsApp o
// por correo.
//
// Ni `wa.me` ni `mailto:` admiten adjuntos: por ahí sólo viaja texto. El único
// camino para que salga el PDF de verdad es el menú de compartir del sistema,
// que sí recibe archivos y ofrece WhatsApp y el correo entre sus destinos.
// Donde no exista -navegadores de escritorio viejos- el archivo se descarga y
// se abre la conversación con el mensaje, para que quien envía lo adjunte.

export const puedeCompartirArchivo = (archivo) => {
	try {
		return Boolean(
			typeof navigator !== "undefined" &&
				navigator.canShare?.({ files: [archivo] }) &&
				navigator.share,
		);
	} catch {
		return false;
	}
};

export const crearArchivoPdf = (blob, nombre) =>
	new File([blob], nombre, { type: "application/pdf" });

// Devuelve true si el archivo salió por el menú de compartir. Cancelar no es un
// error -quien envía se arrepintió- y también devuelve true para no acabar
// abriendo WhatsApp por detrás de un menú que se acaba de cerrar.
export const compartirArchivo = async ({ archivo, titulo = "", texto = "" }) => {
	if (!puedeCompartirArchivo(archivo)) return false;
	try {
		await navigator.share({ files: [archivo], title: titulo, text: texto });
		return true;
	} catch (error) {
		if (error?.name === "AbortError") return true;
		console.warn("No se pudo compartir el archivo:", error);
		return false;
	}
};

export const descargarArchivo = (blob, nombre) => {
	const url = URL.createObjectURL(blob);
	const enlace = document.createElement("a");
	enlace.href = url;
	enlace.download = nombre;
	document.body.appendChild(enlace);
	enlace.click();
	enlace.remove();
	// El navegador necesita un momento con la URL viva para arrancar la descarga.
	setTimeout(() => URL.revokeObjectURL(url), 10000);
};
