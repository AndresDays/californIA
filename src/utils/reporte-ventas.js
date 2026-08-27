const COLORES_TOP = ["#53B9DB", "#49B2D4", "#106DA0", "#1a7ab8", "#0d5580"];
export const SIN_SUCURSAL_REPORTE = "__sin_sucursal";

export const GRUPOS_REPORTE_POR_AREA = [
	{ id: "laboratorio", nombre: "Laboratorio", archivo: "laboratorio" },
	{
		id: "resonancias_veterinaria",
		nombre: "Resonancias y Veterinaria",
		archivo: "resonancias-y-veterinaria",
	},
	{
		id: "radiologia_imagen",
		nombre: "Radiología/Imagen",
		archivo: "radiologia-imagen",
	},
];

const numero = (valor) => Number(valor) || 0;

const redondearMoneda = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

const normalizarAreaReporte = (area) =>
	String(area || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

export const obtenerGrupoReportePorEstudio = (estudio = {}) => {
	const area = normalizarAreaReporte(estudio.area);
	if (!area) return "";
	if (area.includes("laboratorio")) return "laboratorio";
	if (area.includes("resonancia") || area.includes("veterinaria")) {
		return "resonancias_veterinaria";
	}
	return "radiologia_imagen";
};

const distribuirMonto = (monto, fragmentos) => {
	let acumulado = 0;
	return fragmentos.map((fragmento, index) => {
		if (index === fragmentos.length - 1) return redondearMoneda(numero(monto) - acumulado);
		const parte = redondearMoneda(numero(monto) * fragmento.proporcion);
		acumulado = redondearMoneda(acumulado + parte);
		return parte;
	});
};

export const partirVentasPorArea = (ventas = []) => {
	const resultado = Object.fromEntries(
		GRUPOS_REPORTE_POR_AREA.map(({ id }) => [id, []]),
	);

	ventas.forEach((venta) => {
		const estudiosPorGrupo = new Map();
		(venta.estudios_venta || []).forEach((estudio) => {
			const grupo = obtenerGrupoReportePorEstudio(estudio);
			if (!grupo) return;
			if (!estudiosPorGrupo.has(grupo)) estudiosPorGrupo.set(grupo, []);
			estudiosPorGrupo.get(grupo).push(estudio);
		});

		const precioClasificado = [...estudiosPorGrupo.values()]
			.flat()
			.reduce((total, estudio) => total + numero(estudio.precio), 0);
		if (precioClasificado <= 0) return;

		const fragmentos = GRUPOS_REPORTE_POR_AREA
			.filter(({ id }) => estudiosPorGrupo.has(id))
			.map(({ id }) => {
				const estudios = estudiosPorGrupo.get(id);
				const importeEstudios = estudios.reduce(
					(total, estudio) => total + numero(estudio.precio),
					0,
				);
				return { id, estudios, importeEstudios, proporcion: importeEstudios / precioClasificado };
			});

		const totales = distribuirMonto(venta.total, fragmentos);
		const pagos = distribuirMonto(venta.pago_recibido, fragmentos);
		fragmentos.forEach((fragmento, index) => {
			const total = totales[index];
			const pagoRecibido = pagos[index];
			resultado[fragmento.id].push({
				...venta,
				estudios_venta: fragmento.estudios,
				total,
				pago_recibido: pagoRecibido,
				saldo_reporte: redondearMoneda(Math.max(total - pagoRecibido, 0)),
				areaReporte: fragmento.id,
				proporcionAreaReporte: fragmento.proporcion,
			});
		});
	});

	return resultado;
};

export const formatoMonedaReporte = (valor) =>
	`$${numero(valor).toLocaleString("es-MX", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

export const obtenerIdSucursalVenta = (venta) =>
	venta?.id_sucursal ||
	venta?.citas?.id_sucursal ||
	venta?.citas?.sucursales?.id_sucursal ||
	venta?.estudios_venta?.find((estudio) => estudio.id_sucursal)?.id_sucursal ||
	"";

export const calcularSaldoVentaReporte = (venta) =>
	Math.max(numero(venta?.total) - numero(venta?.pago_recibido), 0);

export const calcularMetricasVentas = (ventas = []) => {
	const totalVentas = ventas.reduce((total, venta) => total + numero(venta.total), 0);
	const adeudosPendientes = ventas.reduce(
		(total, venta) => total + calcularSaldoVentaReporte(venta),
		0,
	);

	return {
		totalVentas,
		ordenes: ventas.length,
		ticketPromedio: ventas.length ? totalVentas / ventas.length : 0,
		adeudosPendientes,
		pacientesConSaldo: ventas.filter((venta) => calcularSaldoVentaReporte(venta) > 0)
			.length,
	};
};

// El folio dice a qué empresa se factura la orden sin abrirla: A es la imagen de
// CDI, B la de CDC y C el laboratorio de CDC. Los folios anteriores al cambio
// son de puros dígitos y no tienen serie.
export const SERIES_FOLIO = [
	{ id: "A", nombre: "A — Imagen CDI", empresa: "CDI" },
	{ id: "B", nombre: "B — Imagen CDC", empresa: "CDC" },
	{ id: "C", nombre: "C — Laboratorio CDC", empresa: "CDC" },
];

export const serieDeFolio = (folio = "") => {
	const coincidencia = String(folio ?? "").trim().toUpperCase().match(/^([A-Z])\d+$/);
	return coincidencia ? coincidencia[1] : "";
};

// La empresa que factura sale de la serie del folio, que es como se decidió al
// cobrar. Una orden vieja, sin serie, se resuelve con la empresa del catálogo.
export const empresaFacturaVenta = (venta = {}, nombreEmpresa = "") => {
	const serie = SERIES_FOLIO.find((item) => item.id === serieDeFolio(venta?.folio));
	if (serie) return serie.empresa;

	const texto = String(nombreEmpresa || venta?.empresas?.nombre || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
	if (/\bcdi\b|imagen/.test(texto)) return "CDI";
	if (/\bcdc\b|california/.test(texto)) return "CDC";
	return "";
};

export const filtrarVentasReporte = (ventas = [], filtros = {}) => {
	const estudio = (filtros.estudio || "").trim().toLowerCase();

	return ventas.filter((venta) => {
		if (
			filtros.sucursal === SIN_SUCURSAL_REPORTE &&
			obtenerIdSucursalVenta(venta)
		) {
			return false;
		}
		if (
			filtros.sucursal &&
			filtros.sucursal !== SIN_SUCURSAL_REPORTE &&
			String(obtenerIdSucursalVenta(venta)) !== String(filtros.sucursal)
		) {
			return false;
		}
		if (filtros.vendedor && String(venta.id_empleado || "") !== String(filtros.vendedor)) {
			return false;
		}
		if (filtros.formaPago && venta.forma_pago !== filtros.formaPago) return false;
		if (filtros.cliente && String(venta.id_cliente || "") !== String(filtros.cliente)) {
			return false;
		}
		if (filtros.doctor && String(venta.id_doctor || "") !== String(filtros.doctor)) {
			return false;
		}
		if (filtros.serie && serieDeFolio(venta.folio) !== filtros.serie) return false;
		if (
			filtros.empresaFactura &&
			empresaFacturaVenta(venta, filtros.nombreEmpresaVenta?.(venta)) !==
				filtros.empresaFactura
		) {
			return false;
		}
		if (
			filtros.area &&
			!venta.estudios_venta?.some((item) => item.area === filtros.area)
		) {
			return false;
		}
		if (
			estudio &&
			!venta.estudios_venta?.some((item) =>
				[item.clave_estudio, item.descripcion_estudio]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(estudio),
			)
		) {
			return false;
		}
		return true;
	});
};

export const agruparVentasPorDia = (ventas = []) => {
	const porDia = ventas.reduce((acc, venta) => {
		const fecha = new Date(venta.fecha_venta);
		const key = Number.isNaN(fecha.getTime())
			? "Sin fecha"
			: fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
		acc[key] = (acc[key] || 0) + numero(venta.total);
		return acc;
	}, {});

	return Object.entries(porDia).map(([label, total]) => ({ label, total }));
};

export const agruparEstudiosVendidos = (ventas = []) => {
	const maxTotal = { value: 0 };
	const agrupados = ventas.reduce((acc, venta) => {
		(venta.estudios_venta || []).forEach((estudio) => {
			const name = estudio.descripcion_estudio || estudio.clave_estudio || "Sin estudio";
			if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
			acc[name].count += 1;
			acc[name].total += numero(estudio.precio);
			maxTotal.value = Math.max(maxTotal.value, acc[name].total);
		});
		return acc;
	}, {});

	return Object.values(agrupados)
		.sort((a, b) => b.count - a.count || b.total - a.total)
		.slice(0, 5)
		.map((item, index) => ({
			...item,
			pct: maxTotal.value ? Math.round((item.total / maxTotal.value) * 100) : 0,
			color: COLORES_TOP[index] || COLORES_TOP[COLORES_TOP.length - 1],
		}));
};

export const agruparVentasPorVendedor = (ventas = []) => {
	const agrupados = ventas.reduce((acc, venta) => {
		const id = venta.id_empleado || "sin-vendedor";
		const name = venta.empleados?.nombre || "Sin vendedor";
		if (!acc[id]) acc[id] = { name, amount: 0, orders: 0 };
		acc[id].amount += numero(venta.total);
		acc[id].orders += 1;
		return acc;
	}, {});

	return Object.values(agrupados).sort((a, b) => b.amount - a.amount);
};

export const crearCsvVentas = (ventas = []) => {
	const filas = [
		["Folio", "Fecha", "Paciente", "Cliente", "Forma de pago", "Total", "Pago", "Adeudo"],
		...ventas.map((venta) => [
			venta.folio || "",
			venta.fecha_venta || "",
			venta.pacientes?.nombre || "",
			venta.clientes?.nombre || "Particular",
			venta.forma_pago || "",
			numero(venta.total).toFixed(2),
			numero(venta.pago_recibido).toFixed(2),
			calcularSaldoVentaReporte(venta).toFixed(2),
		]),
	];

	return filas
		.map((fila) =>
			fila
				.map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
				.join(","),
		)
		.join("\n");
};
