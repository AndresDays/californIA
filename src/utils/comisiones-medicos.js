// El concentrado mensual sale de las ventas ya capturadas: `ventas.id_doctor`
// dice a qué médico se le atribuye la orden y `ventas.total` cuánto se facturó.
// Lo único que se captura a mano es el porcentaje de cada médico.
import { crearRangoFechaMexico } from "./fecha-mexico";

// La comisión se calcula sobre el total facturado, con IVA incluido: es lo que
// la clínica cobró por los pacientes que mandó el médico. Si algún día se
// decide comisionar sobre el subtotal, se cambia aquí y nada más.
const CAMPO_BASE_COMISION = "total";

const numero = (valor) => {
	const convertido = Number(valor);
	return Number.isFinite(convertido) ? convertido : 0;
};

const redondearPesos = (valor) => Math.round(numero(valor) * 100) / 100;

const esVentaActiva = (venta) =>
	String(venta?.estado ?? "activo").trim().toLowerCase() === "activo";

export const nombreDoctor = (doctor) => {
	if (!doctor) return "Sin nombre";
	const partes = [doctor.primer_nombre, doctor.apellido_paterno, doctor.apellido_materno]
		.map((parte) => String(parte || "").trim())
		.filter(Boolean);
	if (partes.length > 0) return partes.join(" ");
	return String(doctor.nombre || "").trim() || "Sin nombre";
};

// El periodo llega como "YYYY-MM". Las ventas se acotan con el mismo offset de
// Ciudad de México que usa el resto de los reportes, para que una orden de las
// 23:00 del último día del mes no se vaya al mes siguiente.
export const rangoDelPeriodo = (periodo) => {
	const [anio, mes] = String(periodo || "").split("-").map(Number);
	const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
	const ultimoDia = new Date(Date.UTC(anio, mes, 0));
	return crearRangoFechaMexico(
		primerDia.toISOString().slice(0, 10),
		ultimoDia.toISOString().slice(0, 10),
	);
};

const ultimoDiaDelPeriodo = (periodo) => {
	const [anio, mes] = String(periodo || "").split("-").map(Number);
	return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
};

// Se busca el porcentaje que estaba vigente al cierre del mes, no el más
// reciente: subirle hoy a un médico de 10% a 15% no debe recalcular los meses
// que ya se le pagaron.
export const porcentajeVigente = (historial = [], periodo) => {
	const corte = ultimoDiaDelPeriodo(periodo);
	const vigentes = (historial || [])
		.filter((registro) => String(registro?.vigente_desde || "") <= corte)
		.sort((a, b) => String(a.vigente_desde).localeCompare(String(b.vigente_desde)));
	if (vigentes.length === 0) return null;
	return numero(vigentes[vigentes.length - 1].porcentaje);
};

export const construirConcentradoMensual = ({
	ventas = [],
	doctores = [],
	comisiones = [],
	periodo,
} = {}) => {
	const doctoresPorId = new Map(
		(doctores || []).map((doctor) => [String(doctor.id_doctor), doctor]),
	);

	const historialPorDoctor = new Map();
	for (const registro of comisiones || []) {
		const clave = String(registro?.id_doctor);
		if (!historialPorDoctor.has(clave)) historialPorDoctor.set(clave, []);
		historialPorDoctor.get(clave).push(registro);
	}

	const acumulado = new Map();
	for (const venta of ventas || []) {
		// Una orden sin médico remitente no comisiona a nadie, y una cancelada
		// tampoco: si contara, el médico cobraría por una venta que no existió.
		if (venta?.id_doctor === null || venta?.id_doctor === undefined) continue;
		if (!esVentaActiva(venta)) continue;

		const clave = String(venta.id_doctor);
		const fila = acumulado.get(clave) || { ordenes: 0, ingreso: 0 };
		fila.ordenes += 1;
		fila.ingreso += numero(venta[CAMPO_BASE_COMISION]);
		acumulado.set(clave, fila);
	}

	return [...acumulado.entries()]
		.map(([clave, fila]) => {
			const porcentaje = porcentajeVigente(historialPorDoctor.get(clave), periodo);
			const ingreso = redondearPesos(fila.ingreso);
			return {
				idDoctor: Number(clave),
				nombre: nombreDoctor(doctoresPorId.get(clave)),
				ordenes: fila.ordenes,
				ingreso,
				porcentaje,
				comision: porcentaje === null ? 0 : redondearPesos((ingreso * porcentaje) / 100),
				sinPorcentaje: porcentaje === null,
			};
		})
		.sort((a, b) => b.ingreso - a.ingreso || a.nombre.localeCompare(b.nombre));
};

export const totalesConcentrado = (filas = []) =>
	(filas || []).reduce(
		(acumulado, fila) => ({
			medicos: acumulado.medicos + 1,
			ordenes: acumulado.ordenes + numero(fila.ordenes),
			ingreso: redondearPesos(acumulado.ingreso + numero(fila.ingreso)),
			comision: redondearPesos(acumulado.comision + numero(fila.comision)),
			sinPorcentaje: acumulado.sinPorcentaje + (fila.sinPorcentaje ? 1 : 0),
		}),
		{ medicos: 0, ordenes: 0, ingreso: 0, comision: 0, sinPorcentaje: 0 },
	);

export const formatoMonedaComision = (valor) =>
	numero(valor).toLocaleString("es-MX", {
		style: "currency",
		currency: "MXN",
		minimumFractionDigits: 2,
	});
