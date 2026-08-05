const normalizarTexto = (valor = "") =>
	valor
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

export const resolverEmpresaOperativaCatalogo = (empresaNombre = "") => {
	const texto = normalizarTexto(empresaNombre);
	if (/\bcdi\b|integral|diagnostico por imagen|imagen pvr/.test(texto)) return "CDI";
	if (/\bcdc\b|california/.test(texto)) return "CDC";
	return "";
};

export const resolverModalidadDesdeTipo = (tipoNombre = "") => {
	const texto = normalizarTexto(tipoNombre);
	if (!texto) return "";
	if (/laboratorio|lab/.test(texto)) return "laboratorio";
	if (/resonancia|\brm\b/.test(texto)) return "resonancia";
	if (/ultrasonido|ultrasonografia|\bus\b/.test(texto)) return "ultrasonido";
	if (/tomografia|\btac\b/.test(texto)) return "tomografia";
	if (/radiologia|radiografia|rayos|\brx\b/.test(texto)) return "radiografia";
	if (/contrast/.test(texto)) return "estudios_contrastados";
	if (/urgencia/.test(texto)) return "urgencias_otros";
	if (/veterinaria/.test(texto)) return "veterinaria";
	if (/mastografia|mamografia/.test(texto)) return "mastografia";
	if (/otros|otro/.test(texto)) return "otro";
	return "";
};

export const construirEstudioCatalogoUnificado = (estudio, modulo = "laboratorio") => {
	const esImagen = modulo === "imagen";
	return {
		...estudio,
		id: `${modulo}-${estudio.id}`,
		id_catalogo: estudio.id,
		modulo,
		clave: estudio.clave,
		descripcion: estudio.descripcion,
		area: estudio.area || (esImagen ? "Imagen" : ""),
		diasProceso: estudio.dias_proceso || 1,
		id_empresa: esImagen ? estudio.id_empresa || null : null,
		empresa_operativa: esImagen ? estudio.empresa_operativa || "" : "",
		modalidad: esImagen ? estudio.modalidad || "" : "laboratorio",
		requiere_imagen: esImagen,
		requiere_interpretacion: Boolean(estudio.requiere_interpretacion),
		requiere_contraste: Boolean(estudio.requiere_contraste),
	};
};

export const filtrarEstudiosCatalogo = ({
	estudios = [],
	busqueda = "",
	empresaId = "",
	empresaNombre = "",
	tipoNombre = "",
}) => {
	const termino = normalizarTexto(busqueda);
	const empresaOperativa = resolverEmpresaOperativaCatalogo(empresaNombre);
	const modalidad = resolverModalidadDesdeTipo(tipoNombre);
	const tieneTipoSeleccionado = Boolean(normalizarTexto(tipoNombre));
	const tipoEsLaboratorio = modalidad === "laboratorio";

	return estudios.filter((estudio) => {
		const coincideBusqueda =
			!termino ||
			normalizarTexto(estudio.descripcion).includes(termino) ||
			normalizarTexto(estudio.clave).includes(termino);
		if (!coincideBusqueda) return false;

		if (estudio.modulo === "imagen") {
			if (empresaId && estudio.id_empresa) {
				if (String(estudio.id_empresa) !== String(empresaId)) return false;
			} else if (empresaOperativa) {
				if (estudio.empresa_operativa !== empresaOperativa) return false;
			}
		}

		if (estudio.modulo === "laboratorio") {
			return !tieneTipoSeleccionado || tipoEsLaboratorio;
		}

		if (modalidad && estudio.modalidad !== modalidad) return false;

		return true;
	});
};

export const tipoEstudioEsImagen = (tipoNombre = "") => {
	const modalidad = resolverModalidadDesdeTipo(tipoNombre);
	return Boolean(modalidad && modalidad !== "laboratorio");
};

export const resolverCodigoTipoRadiologia = (estudio = {}) => {
	const clave = normalizarTexto(estudio.clave || estudio.clave_estudio || "");
	const modalidad = normalizarTexto(estudio.modalidad || "");
	const texto = normalizarTexto(
		`${estudio.area || ""} ${estudio.descripcion || ""} ${estudio.descripcion_estudio || ""}`,
	);

	if (clave.startsWith("rm-") || modalidad === "resonancia" || /\brm\b|resonancia/.test(texto)) return "MR";
	if (clave.startsWith("tac-") || modalidad === "tomografia" || /\btac\b|tomografia/.test(texto)) return "CT";
	if (clave.startsWith("rx-") || modalidad === "radiografia" || /\brx\b|radiografia|radiologia|rayos/.test(texto)) return "DX";
	if (clave.startsWith("us-") || modalidad === "ultrasonido" || /\bus\b|ultrasonido|ultrasonografia/.test(texto)) return "US";
	if (modalidad === "mastografia" || /mastografia|mamografia/.test(texto)) return "MG";

	throw new Error("Modalidad de radiologia no compatible con DICOM Cloud");
};

export const dividirEstudiosCita = (tipoEstudio = "") =>
	tipoEstudio
		.split(",")
		.map((estudio) => estudio.trim())
		.filter(Boolean);

export const encontrarEstudioCatalogo = (estudioCita, estudiosDisponibles = []) => {
	const estudioNormalizado = normalizarTexto(estudioCita);
	if (!estudioNormalizado) return null;

	return (
		estudiosDisponibles.find((estudio) => {
			const clave = normalizarTexto(estudio.clave);
			const descripcion = normalizarTexto(estudio.descripcion);
			return clave === estudioNormalizado || descripcion === estudioNormalizado;
		}) ||
		estudiosDisponibles.find((estudio) => {
			const descripcion = normalizarTexto(estudio.descripcion);
			return (
				descripcion.includes(estudioNormalizado) ||
				estudioNormalizado.includes(descripcion)
			);
		}) ||
		null
	);
};

export const construirEstudioSeleccionado = ({
	estudioCatalogo,
	precio,
	nombreCliente,
}) => ({
	...estudioCatalogo,
	precio: Number(precio) || 150,
	cantidad: 1,
	diasProceso: estudioCatalogo.diasProceso || estudioCatalogo.dias_proceso || 1,
	cliente: nombreCliente || "Sin cliente",
});
