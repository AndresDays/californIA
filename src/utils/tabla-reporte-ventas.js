import { calcularSaldoVentaReporte, formatoMonedaReporte } from "./reporte-ventas";

// El orden es el que se lee en caja: primero cómo se identifica la orden
// (folio, paciente, estudio), luego lo que se cobró y con quién, y al final los
// datos de contacto y seguimiento.
export const COLUMNAS_TABLA_VENTAS = [
	"Folio",
	"Paciente",
	"Estudio",
	"Precio",
	"Forma de pago",
	"Cliente",
	"Doctor",
	"Teléfono",
	"Fecha",
	"Adeudo",
];

export const estudiosDeVenta = (venta) =>
	(venta?.estudios_venta || [])
		.map((estudio) => estudio?.descripcion_estudio || estudio?.clave_estudio)
		.filter(Boolean)
		.join(", ");

export const telefonoDeVenta = (venta) =>
	venta?.pacientes?.telefono || venta?.telefono_paciente || "";

export const fechaDeVenta = (venta) =>
	venta?.fecha_venta ? new Date(venta.fecha_venta).toLocaleDateString("es-MX") : "";

// Una sola definición de renglón para lo que se pinta, se copia y se exporta:
// así las tres salidas no se van separando con el tiempo.
export const filaTablaVenta = (venta, { nombreDoctor = () => "-" } = {}) => [
	venta?.folio || venta?.id_venta || "",
	venta?.pacientes?.nombre || venta?.nombre_paciente || "Sin paciente",
	estudiosDeVenta(venta),
	formatoMonedaReporte(venta?.total),
	venta?.forma_pago || "-",
	venta?.clientes?.nombre || "Particular",
	nombreDoctor(venta),
	telefonoDeVenta(venta),
	fechaDeVenta(venta),
	formatoMonedaReporte(calcularSaldoVentaReporte(venta)),
];

// Se copia separado por tabuladores para que al pegar en Excel cada columna
// caiga en su celda; un salto de línea dentro de un dato rompería el renglón,
// así que se aplana. Va sin encabezado: lo copiado se pega debajo de lo que ya
// se tenga capturado.
export const tablaVentasComoTexto = (ventas = [], opciones = {}) =>
	ventas
		.map((venta) =>
			filaTablaVenta(venta, opciones)
				.map((celda) => String(celda ?? "").replace(/\s*\n\s*/g, " ").trim())
				.join("\t"),
		)
		.join("\n");

// navigator.clipboard no existe fuera de un contexto seguro y en algunos
// navegadores pide permiso: si falla se copia con un textarea temporal, que es
// lo que sigue funcionando en las cajas.
export const copiarTextoAlPortapapeles = async (texto) => {
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(texto);
			return true;
		}
	} catch {
		// Se intenta con el respaldo de abajo.
	}

	try {
		const area = document.createElement("textarea");
		area.value = texto;
		area.setAttribute("readonly", "");
		area.style.position = "fixed";
		area.style.opacity = "0";
		document.body.appendChild(area);
		area.select();
		const copiado = document.execCommand("copy");
		document.body.removeChild(area);
		return copiado;
	} catch {
		return false;
	}
};
