export const TURNO_ESTADOS = {
	ESPERANDO: "esperando",
	LLAMADO: "llamado",
	EN_ATENCION: "en_atencion",
	ATENDIDO: "atendido",
	AUSENTE: "ausente",
	CANCELADO: "cancelado",
};

export const TURNO_ESTADO_LABELS = {
	[TURNO_ESTADOS.ESPERANDO]: "En espera",
	[TURNO_ESTADOS.LLAMADO]: "Llamado",
	[TURNO_ESTADOS.EN_ATENCION]: "En atencion",
	[TURNO_ESTADOS.ATENDIDO]: "Atendido",
	[TURNO_ESTADOS.AUSENTE]: "Ausente",
	[TURNO_ESTADOS.CANCELADO]: "Cancelado",
};

export const TURNO_DESTINOS = [
	"Ultrasonido 1",
	"Ultrasonido 2",
	"Rayos x",
	"Laboratorio",
	"Densitometría",
	"Tomografía 1",
	"Tomografía 2",
	"Mastografía",
	"Resonancia Magnética",
];

export const normalizarNombrePaciente = (nombre = "") =>
	String(nombre).trim().replace(/\s+/g, " ");

// "De la Cruz" o "Del Río" son un solo apellido: las partículas se pegan a la
// palabra que sigue para que no cuenten como nombres sueltos.
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "san", "van", "von", "mc"]);

const agruparPalabras = (nombre = "") => {
	const palabras = normalizarNombrePaciente(nombre).split(" ").filter(Boolean);
	const grupos = [];
	let pendiente = [];
	for (const palabra of palabras) {
		pendiente.push(palabra);
		if (!PARTICULAS.has(palabra.toLowerCase())) {
			grupos.push(pendiente.join(" "));
			pendiente = [];
		}
	}
	if (pendiente.length) grupos.push(pendiente.join(" "));
	return grupos;
};

// En turnos y en la sala de espera va el primer nombre y el primer apellido.
// Un nombre escrito a mano llega como "Nombre(s) Paterno Materno": con tres
// palabras el apellido es la segunda; con cuatro o más, la penúltima.
export const obtenerNombrePrivado = (nombre = "") => {
	const partes = agruparPalabras(nombre);
	if (partes.length === 0) return "Paciente";
	if (partes.length <= 2) return partes.join(" ");
	if (partes.length === 3) return `${partes[0]} ${partes[1]}`;
	return `${partes[0]} ${partes[partes.length - 2]}`;
};

// El nombre completo del paciente se guarda con los apellidos primero, así que
// no sirve para sacar el primer nombre: se arma con los campos separados.
// Devuelve null cuando el paciente no los tiene capturados.
export const nombreCortoPaciente = (paciente) => {
	const primerNombre = normalizarNombrePaciente(paciente?.primer_nombre).split(" ")[0];
	const apellido = normalizarNombrePaciente(paciente?.apellido_paterno);
	if (!primerNombre || !apellido) return null;
	return `${primerNombre} ${apellido}`;
};

export const generarCodigoTurno = (consecutivo = 1, prefijo = "A") => {
	const numero = Number.isFinite(Number(consecutivo)) ? Number(consecutivo) : 1;
	return `${String(prefijo || "A").trim().charAt(0).toUpperCase()}-${String(numero).padStart(3, "0")}`;
};

export const obtenerRangoDiaLocalISO = (fecha = new Date()) => {
	const base =
		typeof fecha === "string"
			? new Date(`${fecha.slice(0, 10)}T00:00:00`)
			: new Date(fecha);
	const inicio = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate(),
		0,
		0,
		0,
		0,
	);
	const fin = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate(),
		23,
		59,
		59,
		999,
	);

	return {
		inicio: inicio.toISOString(),
		fin: fin.toISOString(),
	};
};

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

export const resolverDestinoTurnoDesdeEstudios = (estudios = []) => {
	const texto = normalizarTexto(
		estudios
			.map(
				(estudio) =>
					`${estudio.area || ""} ${estudio.descripcion || ""} ${estudio.descripcion_estudio || ""} ${estudio.clave || ""} ${estudio.clave_estudio || ""}`,
			)
			.join(" "),
	);

	if (/ultrasonido|ultrasonografia|\busg\b/.test(texto)) return "Ultrasonido 1";
	if (/rayos|radiologia|\brx\b/.test(texto)) return "Rayos x";
	if (/densitometria/.test(texto)) return "Densitometría";
	if (/tomografia|\btac\b/.test(texto)) return "Tomografía 1";
	if (/mastografia|mamografia/.test(texto)) return "Mastografía";
	if (/resonancia|\brm\b/.test(texto)) return "Resonancia Magnética";
	if (/laboratorio|quimica|biometria|sangre|orina|muestra/.test(texto)) {
		return "Laboratorio";
	}

	return "Laboratorio";
};

export const ordenarTurnosPorCola = (turnos = []) =>
	[...turnos].sort((a, b) => {
		const prioridad = Number(b.prioridad || 0) - Number(a.prioridad || 0);
		if (prioridad !== 0) return prioridad;
		return new Date(a.fecha_programada || a.created_at || 0) - new Date(b.fecha_programada || b.created_at || 0);
	});

export const esTurnoActivo = (turno = {}) =>
	[TURNO_ESTADOS.ESPERANDO, TURNO_ESTADOS.LLAMADO, TURNO_ESTADOS.EN_ATENCION].includes(
		turno.estado,
	);
