// Fiscalmente son dos empresas —CDC (California) y CDI (Imagen)— y el folio
// tiene que decir a cuál se factura sin abrir la orden. Como el laboratorio de
// CDC se controla aparte de su imagen, quedan tres series corridas:
//
//   A → CDI, imagen (convenios ISSSTE, SSA, Medisim)
//   B → CDC, imagen (convenios IMSS y Odile/Anamaya, y la resonancia particular)
//   C → CDC, laboratorio (todos los análisis)
//
// Las sucursales foráneas llevan su propia serie corrida, sin partir la orden
// por empresa: en Ixtapa y Mascota se cobra todo en la misma caja y el folio
// tiene que decir de dónde salió la orden.
//
//   D → Ixtapa
//   E → Mascota
export const SERIES_FOLIO = {
	A: { empresa: "CDI", tipo: "imagen" },
	B: { empresa: "CDC", tipo: "imagen" },
	C: { empresa: "CDC", tipo: "laboratorio" },
	D: { empresa: "CDC", tipo: "sucursal", sucursal: "IXTAPA" },
	E: { empresa: "CDC", tipo: "sucursal", sucursal: "MASCOTA" },
};

// La sucursal se identifica por id y por nombre: el id es lo que trae la venta,
// y el nombre salva a los empleados cuyo registro sólo guarda el texto.
const SERIES_POR_SUCURSAL = [
	{ serie: "D", id_sucursal: 2, nombre: "IXTAPA" },
	{ serie: "E", id_sucursal: 3, nombre: "MASCOTA" },
];

const limpiarNombreSucursal = (valor = "") =>
	String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.replace(/\s+/g, " ")
		.toUpperCase();

// La serie de la sucursal donde se captura la orden, si esa sucursal tiene una.
// Acepta el objeto de la sucursal o del empleado, un id o el nombre suelto.
export const serieFolioDeSucursal = (sucursal) => {
	if (sucursal === null || sucursal === undefined || sucursal === "") return "";

	const esObjeto = typeof sucursal === "object";
	const id = esObjeto
		? (sucursal.id_sucursal ?? sucursal.sucursales?.id_sucursal ?? null)
		: Number.isFinite(Number(sucursal))
			? Number(sucursal)
			: null;
	const nombre = limpiarNombreSucursal(
		esObjeto
			? sucursal.sucursal || sucursal.nombre || sucursal.sucursales?.nombre || ""
			: typeof sucursal === "string"
				? sucursal
				: "",
	);

	const encontrada = SERIES_POR_SUCURSAL.find(
		(serie) =>
			(id !== null && Number(id) === serie.id_sucursal) ||
			(Boolean(nombre) && nombre === serie.nombre),
	);
	return encontrada?.serie || "";
};

export const SERIE_LABORATORIO = "C";
export const SERIE_POR_DEFECTO = "A";
export const LARGO_CONSECUTIVO = 4;

const SERIE_IMAGEN_POR_EMPRESA = { CDC: "B", CDI: "A" };

export const esEstudioDeLaboratorio = (estudio = {}) =>
	estudio?.modulo === "laboratorio" ||
	(estudio?.requiere_imagen === false && !estudio?.modalidad) ||
	estudio?.modalidad === "laboratorio";

export const MODALIDAD_TODAS = "*";

// Una regla de "toda la imagen" del convenio no arrastra el laboratorio, la
// veterinaria ni las urgencias: eso se cobra como particular salvo que el
// convenio los tenga pactados con su propia regla. Ningún convenio trae
// urgencias, así que ofrecerlas con el comodín las metía a todos.
export const MODALIDADES_FUERA_DE_CONVENIO = [
	"laboratorio",
	"veterinaria",
	"urgencias_otros",
];
const CRITERIO_DOPPLER = "doppler";

const esDoppler = (estudio = {}) =>
	/doppler/i.test(`${estudio?.clave || ""} ${estudio?.descripcion || ""}`);

const cumpleCriterio = (regla = {}, estudio = {}) => {
	if (!regla.criterio) return true;
	if (regla.criterio === CRITERIO_DOPPLER) return esDoppler(estudio);
	return false;
};

// Qué empresa factura no depende solo del convenio ni solo del estudio, sino de
// los dos: Medisim y SSA mandan su resonancia a CDC y el resto de su imagen a
// CDI, e IMSS sólo lleva ultrasonido cuando es doppler. Esa matriz se configura
// por convenio en la base, no en el código.
// Las reglas pueden venir como la lista del convenio seleccionado o como una
// función que las resuelve por estudio. Lo segundo es lo que necesita una orden
// con renglones de distintos clientes: cada uno se cotizó con su convenio y
// tiene que facturarse por la empresa de ese convenio, no por la del cliente
// que quedó elegido al final.
export const reglasParaEstudio = (reglasConvenio, estudio = {}) => {
	const reglas =
		typeof reglasConvenio === "function" ? reglasConvenio(estudio) : reglasConvenio;
	return Array.isArray(reglas) ? reglas : [];
};

export const reglaConvenioParaEstudio = (estudio = {}, reglasConvenio = []) => {
	const modalidad = String(estudio?.modalidad || "").toLowerCase();
	const reglas = reglasParaEstudio(reglasConvenio, estudio);

	const aplicables = reglas.filter((regla) => {
		const modalidadRegla = String(regla?.modalidad || "").toLowerCase();
		if (
			modalidadRegla === MODALIDAD_TODAS &&
			MODALIDADES_FUERA_DE_CONVENIO.includes(modalidad)
		) {
			return false;
		}
		const coincide =
			modalidadRegla === MODALIDAD_TODAS || modalidadRegla === modalidad;
		return coincide && cumpleCriterio(regla, estudio);
	});

	// La regla de una modalidad concreta gana sobre la del convenio completo, y
	// entre iguales gana la que tiene criterio (el doppler de IMSS).
	return (
		aplicables.find((regla) => regla.criterio && regla.modalidad !== MODALIDAD_TODAS) ||
		aplicables.find((regla) => regla.modalidad !== MODALIDAD_TODAS) ||
		aplicables.find((regla) => regla.criterio) ||
		aplicables[0] ||
		null
	);
};

export const resolverEmpresaFacturaEstudio = (estudio = {}, reglasConvenio = []) => {
	const regla = reglaConvenioParaEstudio(estudio, reglasConvenio);

	// Sin regla para esa combinación se usa la empresa del catálogo, que es como
	// se factura al particular: resonancia y veterinaria en CDC, el resto en CDI.
	return regla?.empresa || estudio?.empresa_operativa || "CDI";
};

// Un convenio sólo cubre las modalidades que tiene pactadas: IMSS no lleva
// radiología ni ultrasonido que no sea doppler, así que esos estudios no deben
// ni aparecer en la búsqueda cuando está seleccionado. El laboratorio no se
// acota aquí porque lo delimita el tarifario del cliente.
export const convenioCubreEstudio = (estudio = {}, reglasConvenio = []) => {
	if (esEstudioDeLaboratorio(estudio)) return true;
	const reglas = reglasParaEstudio(reglasConvenio, estudio);
	if (reglas.length === 0) return true;
	return Boolean(reglaConvenioParaEstudio(estudio, reglas));
};

// La serie de la sucursal manda sobre la de la empresa: la orden de Ixtapa es
// D0001 completa, no se parte en A, B y C.
export const resolverSerieFolio = (estudio = {}, reglasConvenio = [], sucursal = null) => {
	const serieSucursal = serieFolioDeSucursal(sucursal);
	if (serieSucursal) return serieSucursal;
	if (esEstudioDeLaboratorio(estudio)) return SERIE_LABORATORIO;
	const empresa = resolverEmpresaFacturaEstudio(estudio, reglasConvenio);
	return SERIE_IMAGEN_POR_EMPRESA[empresa] || SERIE_POR_DEFECTO;
};

export const empresaDeSerie = (serie = "") =>
	SERIES_FOLIO[String(serie).toUpperCase()]?.empresa || "";

// Los estudios de una orden se reparten en las series que les tocan; cada una
// lleva su folio.
export const agruparEstudiosPorSerie = (estudios = [], reglasConvenio = [], sucursal = null) => {
	const grupos = new Map();
	estudios.forEach((estudio) => {
		const serie = resolverSerieFolio(estudio, reglasConvenio, sucursal);
		if (!grupos.has(serie)) grupos.set(serie, []);
		grupos.get(serie).push(estudio);
	});
	return [...grupos.entries()]
		.sort(([unaSerie], [otraSerie]) => unaSerie.localeCompare(otraSerie))
		.map(([serie, estudiosSerie]) => ({
			serie,
			empresa: empresaDeSerie(serie),
			estudios: estudiosSerie,
		}));
};

// El folio es corrido por serie, sin fecha: A0001, A0002, B0001…
export const construirFolio = (serie, consecutivo) =>
	`${String(serie || "").toUpperCase()}${String(consecutivo).padStart(LARGO_CONSECUTIVO, "0")}`;

export const normalizarFolio = (folio = "") =>
	String(folio ?? "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");

// Los folios anteriores al cambio son DDMMYY + consecutivo, sin letra, y siguen
// siendo válidos.
export const separarFolio = (folio = "") => {
	const limpio = normalizarFolio(folio);
	const conSerie = limpio.match(/^([A-Z])(\d+)$/);
	if (conSerie) {
		return {
			serie: conSerie[1],
			empresa: empresaDeSerie(conSerie[1]),
			consecutivo: Number.parseInt(conSerie[2], 10),
			folio: limpio,
		};
	}
	const anterior = limpio.match(/^(\d{6})(\d{4,})$/);
	if (anterior) {
		return {
			serie: "",
			empresa: "",
			fecha: anterior[1],
			consecutivo: Number.parseInt(anterior[2], 10),
			folio: limpio,
		};
	}
	return { serie: "", empresa: "", consecutivo: null, folio: limpio };
};

export const foliosCoinciden = (unFolio, otroFolio) =>
	Boolean(unFolio) &&
	Boolean(otroFolio) &&
	normalizarFolio(unFolio) === normalizarFolio(otroFolio);

// Para consultar (portal y visor del paciente) sólo se corrigen los errores de
// captura que sí pasan: minúsculas, espacios y guiones sobre un folio con la
// forma del ticket. Un folio con otro formato se manda tal cual, porque ahí el
// separador puede ser parte del folio.
export const PATRON_FOLIO_TICKET = /^([A-Z]\d{3,}|\d{10})$/;

export const normalizarFolioConsulta = (folio = "") => {
	const limpio = String(folio ?? "").trim().toUpperCase();
	const estricto = normalizarFolio(limpio);
	return PATRON_FOLIO_TICKET.test(estricto) ? estricto : limpio;
};
