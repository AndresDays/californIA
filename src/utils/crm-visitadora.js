// Vocabulario del CRM de la visitadora. Vive aparte de las pantallas porque las
// mismas etiquetas salen en el directorio, en la agenda, en los pendientes y en
// el reporte; tenerlas en un solo lugar evita que una pantalla diga "Prospecto"
// y otra "prospecto" sobre el mismo dato.
import { hoyEnMexico, sumarDias } from "./semanas-visitadora";

export const ESTATUS_MEDICO = [
	{ valor: "activo", etiqueta: "Activo" },
	{ valor: "prospecto", etiqueta: "Prospecto" },
	{ valor: "inactivo", etiqueta: "Inactivo" },
	{ valor: "suspendido", etiqueta: "Suspendido" },
];

export const TIPOS_CONVENIO = [
	{ valor: "mixto", etiqueta: "Mixto" },
	{ valor: "puntos", etiqueta: "Puntos" },
	{ valor: "especial", etiqueta: "Convenio especial" },
	{ valor: "prospecto", etiqueta: "Prospecto" },
	{ valor: "sin_convenio", etiqueta: "Sin convenio" },
];

export const TIPOS_VISITA = [
	{ valor: "seguimiento", etiqueta: "Seguimiento" },
	{ valor: "prospeccion", etiqueta: "Prospección" },
	{ valor: "entrega_ordenes", etiqueta: "Entrega de órdenes" },
	{ valor: "reactivacion_convenio", etiqueta: "Reactivación de convenio" },
	{ valor: "presentacion_servicios", etiqueta: "Presentación de servicios" },
	{ valor: "cobranza", etiqueta: "Cobranza" },
	{ valor: "otro", etiqueta: "Otro" },
];

export const ESTATUS_AGENDA = [
	{ valor: "programada", etiqueta: "Programada" },
	{ valor: "realizada", etiqueta: "Realizada" },
	{ valor: "reprogramada", etiqueta: "Reprogramada" },
	{ valor: "cancelada", etiqueta: "Cancelada" },
];

export const TIPOS_TAREA = [
	{ valor: "seguimiento", etiqueta: "Dar seguimiento" },
	{ valor: "llamada", etiqueta: "Llamada" },
	{ valor: "visita", etiqueta: "Visitar de nuevo" },
	{ valor: "entrega_ordenes", etiqueta: "Entregar órdenes" },
	{ valor: "reactivar_convenio", etiqueta: "Reactivar convenio" },
	{ valor: "alta_visordicom", etiqueta: "Crear usuario en VisorDICOM" },
	{ valor: "confirmar_cita", etiqueta: "Confirmar cita" },
	{ valor: "cumpleanos", etiqueta: "Cumpleaños" },
	{ valor: "otro", etiqueta: "Otro" },
];

export const ESTADOS_VISORDICOM = [
	{ valor: "pendiente", etiqueta: "Pendiente" },
	{ valor: "creado", etiqueta: "Usuario creado" },
	{ valor: "activo", etiqueta: "Usuario activo" },
	{ valor: "no_aplica", etiqueta: "No aplica" },
];

const etiquetaDe = (lista, valor) =>
	lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? (valor ? String(valor) : "—");

export const etiquetaEstatus = (valor) => etiquetaDe(ESTATUS_MEDICO, valor);
export const etiquetaConvenio = (valor) => etiquetaDe(TIPOS_CONVENIO, valor);
export const etiquetaTipoVisita = (valor) => etiquetaDe(TIPOS_VISITA, valor);
export const etiquetaTipoTarea = (valor) => etiquetaDe(TIPOS_TAREA, valor);
export const etiquetaVisorDicom = (valor) => etiquetaDe(ESTADOS_VISORDICOM, valor);

// Se compara sin acentos ni mayúsculas y sin el "Dr." de adelante, igual que en
// el informe: el nombre que ella escribe casi nunca coincide letra por letra
// con el del catálogo.
export const claveDeNombre = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/^(dr|dra|doctor|doctora)\.?\s+/, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

export const coincideBusqueda = (medico, texto) => {
	const buscado = claveDeNombre(texto);
	if (!buscado) return true;
	const campos = [
		medico?.nombre_completo,
		medico?.especialidad,
		medico?.hospital,
		medico?.zona,
		medico?.telefono,
		medico?.whatsapp,
		medico?.email,
	];
	return campos.some((campo) => claveDeNombre(campo).includes(buscado));
};

const soloDigitos = (valor) => String(valor || "").replace(/\D/g, "");

// Antes de dar de alta a un médico hay que ver si ya está: el mismo doctor
// capturado dos veces parte su historial en dos y las comisiones dejan de
// cuadrar. Se compara el nombre sin acentos ni "Dr.", y también el teléfono y
// el correo, porque el nombre se escribe de muchas maneras.
export const buscarMedicoExistente = (medicos = [], { nombre, telefono, email } = {}) => {
	const clave = claveDeNombre(nombre);
	const digitos = soloDigitos(telefono);
	const correo = String(email || "").trim().toLowerCase();

	return (
		medicos.find((medico) => {
			if (clave && claveDeNombre(medico?.nombre_completo ?? medico?.nombre) === clave) return true;
			// Los últimos diez dígitos: unos teléfonos traen lada de país y otros no.
			if (digitos.length >= 10) {
				for (const campo of [medico?.telefono, medico?.whatsapp]) {
					const guardado = soloDigitos(campo);
					if (guardado.length >= 10 && guardado.slice(-10) === digitos.slice(-10)) return true;
				}
			}
			if (correo && String(medico?.email || "").trim().toLowerCase() === correo) return true;
			return false;
		}) ?? null
	);
};

// --- cumpleaños -----------------------------------------------------------
// La fecha de nacimiento trae el año del médico; para el calendario sólo
// importan el mes y el día, así que se proyectan sobre el año en curso y, si ya
// pasaron, sobre el siguiente.
export const proximoCumpleanos = (fechaNacimiento, hoy = hoyEnMexico()) => {
	const nacimiento = String(fechaNacimiento || "").slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) return null;
	const mesDia = nacimiento.slice(5);
	const anio = Number(hoy.slice(0, 4));
	const esteAnio = `${anio}-${mesDia}`;
	return esteAnio >= hoy ? esteAnio : `${anio + 1}-${mesDia}`;
};

export const diasParaCumpleanos = (fechaNacimiento, hoy = hoyEnMexico()) => {
	const proximo = proximoCumpleanos(fechaNacimiento, hoy);
	if (!proximo) return null;
	const diferencia = Date.parse(`${proximo}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`);
	return Math.round(diferencia / 86400000);
};

export const cumpleHoy = (fechaNacimiento, hoy = hoyEnMexico()) =>
	diasParaCumpleanos(fechaNacimiento, hoy) === 0;

export const cumpleanosProximos = (medicos = [], dias = 15, hoy = hoyEnMexico()) =>
	medicos
		.map((medico) => ({ medico, faltan: diasParaCumpleanos(medico?.fecha_nacimiento, hoy) }))
		.filter((fila) => fila.faltan !== null && fila.faltan >= 0 && fila.faltan <= dias)
		.sort((uno, otro) => uno.faltan - otro.faltan);

export const cumpleanosDelMes = (medicos = [], mes) =>
	medicos
		.filter((medico) => String(medico?.fecha_nacimiento || "").slice(5, 7) === String(mes).padStart(2, "0"))
		.sort((uno, otro) =>
			String(uno.fecha_nacimiento).slice(8, 10).localeCompare(String(otro.fecha_nacimiento).slice(8, 10)),
		);

// --- visitas ---------------------------------------------------------------
// La siguiente visita sale de la frecuencia que ella le puso al médico: si lo ve
// cada 30 días y la última fue el 1°, toca el 31.
export const proximaVisitaSugerida = (ultimaVisita, frecuenciaDias) => {
	const fecha = String(ultimaVisita || "").slice(0, 10);
	const dias = Number(frecuenciaDias);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(dias) || dias <= 0) return null;
	return sumarDias(fecha, dias);
};

export const visitaVencida = (proximaVisita, hoy = hoyEnMexico()) => {
	const fecha = String(proximaVisita || "").slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
	return fecha < hoy;
};

// --- ubicación -------------------------------------------------------------
// Distancia en línea recta, que para ordenar "médicos cercanos" dentro de una
// ciudad alcanza y no obliga a pagar una API de rutas.
const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados) => (grados * Math.PI) / 180;

// `Number(null)` es 0, que es un punto perfectamente válido en el Golfo de
// Guinea: por eso la coordenada vacía se descarta antes de convertirla.
const coordenada = (valor) => {
	if (valor === null || valor === undefined || valor === "") return NaN;
	return Number(valor);
};

export const distanciaKm = (desde, hasta) => {
	const valores = [desde?.latitud, desde?.longitud, hasta?.latitud, hasta?.longitud].map(coordenada);
	if (valores.some((valor) => !Number.isFinite(valor))) return null;
	const [lat1, lon1, lat2, lon2] = valores;
	const dLat = aRadianes(lat2 - lat1);
	const dLon = aRadianes(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLon / 2) ** 2;
	return Math.round(RADIO_TIERRA_KM * 2 * Math.asin(Math.sqrt(a)) * 100) / 100;
};

export const medicosCercanos = (medicos = [], origen, limite = 10) =>
	medicos
		.map((medico) => ({ medico, km: distanciaKm(origen, medico) }))
		.filter((fila) => fila.km !== null)
		.sort((uno, otro) => uno.km - otro.km)
		.slice(0, limite);

export const enlaceMapa = (medico) => {
	if (Number.isFinite(Number(medico?.latitud)) && Number.isFinite(Number(medico?.longitud))) {
		return `https://www.google.com/maps/search/?api=1&query=${medico.latitud},${medico.longitud}`;
	}
	const direccion = [medico?.direccion_consultorio, medico?.hospital, medico?.zona]
		.filter(Boolean)
		.join(", ");
	if (!direccion) return null;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
};

// El teléfono se manda a WhatsApp con lada de México cuando viene de 10 dígitos,
// que es como está capturado casi todo el directorio.
export const enlaceWhatsApp = (telefono, mensaje = "") => {
	const digitos = String(telefono || "").replace(/\D/g, "");
	if (digitos.length < 10) return null;
	const numero = digitos.length === 10 ? `52${digitos}` : digitos;
	const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
	return `https://wa.me/${numero}${texto}`;
};
