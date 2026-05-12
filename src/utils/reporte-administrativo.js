import { EVENTOS_SOLICITUD } from "./solicitud-auditoria";

const COLORES = ["#53B9DB", "#49B2D4", "#106DA0", "#1a7ab8", "#0d5580"];

const numero = (valor) => Number(valor) || 0;

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

export const formatoMonedaAdmin = (valor) =>
	`$${numero(valor).toLocaleString("es-MX", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

export const formatoDuracionHoras = (horas) => {
	if (!Number.isFinite(horas)) return "Sin datos";
	if (horas < 1) return `${Math.round(horas * 60)} min`;
	if (horas < 48) return `${horas.toFixed(1)} h`;
	return `${(horas / 24).toFixed(1)} dias`;
};

export const esEstudioImagenAdmin = (estudio = {}) => {
	const texto = normalizarTexto(
		`${estudio.clave_estudio || ""} ${estudio.descripcion_estudio || ""} ${estudio.area || ""}`,
	);
	return (
		/^(rm|rx|tac|us|ec|uo|vet)-/.test(texto) ||
		/\b(rm|rx|tac|us)\b|radiologia|imagen|rayos|ultrasonido|ultrasonografia|tomografia|resonancia|mastografia|contrastados|veterinaria/.test(
			texto,
		)
	);
};

export const obtenerNombreSucursal = (venta = {}, sucursalesPorId = new Map()) =>
	venta.sucursal ||
	venta.citas?.sucursales?.nombre ||
	sucursalesPorId.get(String(venta.id_sucursal || "")) ||
	"Sin sucursal";

export const calcularSaldoAdmin = (venta = {}) =>
	Math.max(numero(venta.total) - numero(venta.pago_recibido), 0);

export const agruparPorArea = (ventas = []) => {
	const agrupado = ventas.reduce((acc, venta) => {
		(venta.estudios_venta || []).forEach((estudio) => {
			const area = estudio.area || (esEstudioImagenAdmin(estudio) ? "Imagen" : "Laboratorio");
			if (!acc[area]) acc[area] = { nombre: area, estudios: 0, ingreso: 0 };
			acc[area].estudios += 1;
			acc[area].ingreso += numero(estudio.precio);
		});
		return acc;
	}, {});

	return Object.values(agrupado).sort((a, b) => b.estudios - a.estudios);
};

export const calcularPendientesPorEtapa = (ventas = [], estudiosRadiologia = []) => {
	const etapas = {
		muestra_pendiente: { id: "muestra_pendiente", label: "Muestra pendiente", total: 0 },
		captura: { id: "captura", label: "En captura", total: 0 },
		guardado: { id: "guardado", label: "Guardado", total: 0 },
		validado: { id: "validado", label: "Validado sin entregar", total: 0 },
		radiologia_toma: { id: "radiologia_toma", label: "Imagen por subir", total: 0 },
		radiologia_interpretar: { id: "radiologia_interpretar", label: "Por interpretar", total: 0 },
		entrega: { id: "entrega", label: "Listo entrega", total: 0 },
	};

	ventas.forEach((venta) => {
		(venta.estudios_venta || []).forEach((estudio) => {
			if (estudio.entregado) return;
			if (estudio.muestra_pendiente) etapas.muestra_pendiente.total += 1;
			else if (estudio.estado_validacion === "guardado") etapas.guardado.total += 1;
			else if (estudio.estado_validacion === "validado") etapas.validado.total += 1;
			else etapas.captura.total += 1;
		});
	});

	estudiosRadiologia.forEach((estudio) => {
		if (estudio.entregado) return;
		const estado = String(estudio.estado || "").toUpperCase();
		if (estudio.listo_entrega) etapas.entrega.total += 1;
		else if (["POR ASIGNAR", "ASIGNADO"].includes(estado)) etapas.radiologia_toma.total += 1;
		else etapas.radiologia_interpretar.total += 1;
	});

	return Object.values(etapas);
};

export const agruparIngresosPorSucursal = (ventas = [], sucursales = []) => {
	const sucursalesPorId = new Map(
		sucursales.map((sucursal) => [String(sucursal.id_sucursal), sucursal.nombre]),
	);
	const agrupado = ventas.reduce((acc, venta) => {
		const nombre = obtenerNombreSucursal(venta, sucursalesPorId);
		if (!acc[nombre]) acc[nombre] = { nombre, ordenes: 0, ingreso: 0, adeudo: 0 };
		acc[nombre].ordenes += 1;
		acc[nombre].ingreso += numero(venta.total);
		acc[nombre].adeudo += calcularSaldoAdmin(venta);
		return acc;
	}, {});
	return Object.values(agrupado).sort((a, b) => b.ingreso - a.ingreso);
};

export const agruparEstudiosMasVendidosAdmin = (ventas = [], limite = 8) => {
	const agrupado = ventas.reduce((acc, venta) => {
		(venta.estudios_venta || []).forEach((estudio) => {
			const nombre = estudio.descripcion_estudio || estudio.clave_estudio || "Sin estudio";
			if (!acc[nombre]) acc[nombre] = { nombre, cantidad: 0, ingreso: 0 };
			acc[nombre].cantidad += 1;
			acc[nombre].ingreso += numero(estudio.precio);
		});
		return acc;
	}, {});
	return Object.values(agrupado)
		.sort((a, b) => b.cantidad - a.cantidad || b.ingreso - a.ingreso)
		.slice(0, limite)
		.map((item, index) => ({ ...item, color: COLORES[index] || COLORES.at(-1) }));
};

export const agruparRemitentesAdmin = (ventas = [], doctores = [], clientes = []) => {
	const doctoresPorId = new Map(
		doctores.map((doctor) => [String(doctor.id_doctor || doctor.id_empleado), doctor.nombre]),
	);
	const clientesPorId = new Map(
		clientes.map((cliente) => [String(cliente.id_cliente), cliente.nombre]),
	);

	const acumular = (acc, id, nombre, total) => {
		const key = String(id || nombre || "sin-id");
		if (!acc[key]) acc[key] = { nombre: nombre || "Sin dato", ordenes: 0, ingreso: 0 };
		acc[key].ordenes += 1;
		acc[key].ingreso += numero(total);
	};

	const doctoresAgrupados = {};
	const clientesAgrupados = {};
	ventas.forEach((venta) => {
		acumular(
			doctoresAgrupados,
			venta.id_doctor,
			venta.doctores?.nombre || doctoresPorId.get(String(venta.id_doctor || "")) || "Sin doctor",
			venta.total,
		);
		acumular(
			clientesAgrupados,
			venta.id_cliente,
			venta.clientes?.nombre || clientesPorId.get(String(venta.id_cliente || "")) || "Particular",
			venta.total,
		);
	});

	const ordenar = (items) =>
		Object.values(items)
			.sort((a, b) => b.ordenes - a.ordenes || b.ingreso - a.ingreso)
			.slice(0, 8);

	return {
		doctores: ordenar(doctoresAgrupados),
		clientes: ordenar(clientesAgrupados),
	};
};

const EVENTO_POR_ETAPA = {
	recibido: EVENTOS_SOLICITUD.CREADA,
	captura: EVENTOS_SOLICITUD.CAPTURADA,
	validacion: EVENTOS_SOLICITUD.VALIDADA,
	entrega: EVENTOS_SOLICITUD.ENTREGADA,
};

const diferenciaHoras = (inicio, fin) => {
	const a = new Date(inicio).getTime();
	const b = new Date(fin).getTime();
	if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
	return (b - a) / 36e5;
};

export const calcularTiemposPromedio = (eventos = []) => {
	const porVenta = eventos.reduce((acc, evento) => {
		const id = evento.id_venta;
		if (!id) return acc;
		if (!acc[id]) acc[id] = {};
		Object.entries(EVENTO_POR_ETAPA).forEach(([etapa, nombreEvento]) => {
			if (evento.evento !== nombreEvento || acc[id][etapa]) return;
			acc[id][etapa] = evento.created_at;
		});
		return acc;
	}, {});

	const pares = [
		{ id: "recepcion_captura", label: "Recepcion -> captura", desde: "recibido", hasta: "captura" },
		{ id: "captura_validacion", label: "Captura -> validacion", desde: "captura", hasta: "validacion" },
		{ id: "validacion_entrega", label: "Validacion -> entrega", desde: "validacion", hasta: "entrega" },
		{ id: "recepcion_entrega", label: "Recepcion -> entrega", desde: "recibido", hasta: "entrega" },
	];

	return pares.map((par) => {
		const valores = Object.values(porVenta)
			.map((venta) => diferenciaHoras(venta[par.desde], venta[par.hasta]))
			.filter((valor) => valor !== null);
		const promedio = valores.length
			? valores.reduce((total, valor) => total + valor, 0) / valores.length
			: null;
		return { ...par, promedio, muestras: valores.length };
	});
};

export const calcularResumenAdministrativo = (
	ventas = [],
	estudiosRadiologia = [],
	eventosAuditoria = [],
) => {
	const totalIngresos = ventas.reduce((total, venta) => total + numero(venta.total), 0);
	const totalAdeudos = ventas.reduce((total, venta) => total + calcularSaldoAdmin(venta), 0);
	const totalEstudios = ventas.reduce(
		(total, venta) => total + (venta.estudios_venta || []).length,
		0,
	);
	const pendientes = calcularPendientesPorEtapa(ventas, estudiosRadiologia).reduce(
		(total, etapa) => total + etapa.total,
		0,
	);
	return {
		totalIngresos,
		totalAdeudos,
		totalVentas: ventas.length,
		totalEstudios,
		pendientes,
		tiemposPromedio: calcularTiemposPromedio(eventosAuditoria),
	};
};
