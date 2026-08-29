import {
	construirDocumentoImpresion,
	dinero,
	escaparHtml,
} from "./cortes-dia-print";

// El reporte se imprime con el mismo formato del corte de caja: hoja apaisada,
// blanco y negro y tablas cuadriculadas. Antes salía la pantalla tal cual, con
// su fondo oscuro y los controles de la página encima.
const fechaCorta = (fecha) => {
	const [anio, mes, dia] = String(fecha || "").split("-");
	return anio && mes && dia ? `${dia}/${mes}/${anio}` : "-";
};

const filaVenta = (fila = []) =>
	`<tr>${fila.map((celda) => `<td>${escaparHtml(celda)}</td>`).join("")}</tr>`;

const tablaVentas = (columnas, filas) =>
	filas.length > 0
		? `<table class="movimientos"><thead><tr>${columnas
				.map((columna) => `<th>${escaparHtml(columna)}</th>`)
				.join("")}</tr></thead><tbody>${filas.map(filaVenta).join("")}</tbody></table>`
		: `<p class="sin-movimientos">No hay ventas para los filtros seleccionados.</p>`;

// Sólo se listan los filtros que traen algo, para que el encabezado diga qué se
// está viendo sin llenarse de renglones vacíos.
const lineasFiltros = (filtros = {}) =>
	Object.entries(filtros)
		.filter((entrada) => String(entrada[1] ?? "").trim())
		.map(
			(entrada) =>
				`<p><b>${escaparHtml(entrada[0])}:</b> ${escaparHtml(entrada[1])}</p>`,
		)
		.join("");

export const construirDocumentoReporteVentas = ({
	titulo = "Reporte de Ventas",
	fechaInicial,
	fechaFinal,
	usuario = "",
	columnas = [],
	filas = [],
	metricas = {},
	filtros = {},
} = {}) => {
	const impresoEl = new Date().toLocaleString("es-MX", {
		dateStyle: "short",
		timeStyle: "short",
	});

	const contenido = `<section class="corte">
		<header>
			<h1>${escaparHtml(titulo)}</h1>
			${usuario ? `<p><b>Usuario:</b> ${escaparHtml(usuario)}</p>` : ""}
			<p><b>Periodo:</b> ${fechaCorta(fechaInicial)} a ${fechaCorta(fechaFinal)}</p>
			${lineasFiltros(filtros)}
			<p><b>Impreso el:</b> ${escaparHtml(impresoEl)}</p>
		</header>
		<hr />
		<div class="resumenes">
			<section><h2>Resumen</h2><table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead><tbody>
				<tr><td>Total vendido</td><td>${dinero(metricas.totalVentas)}</td></tr>
				<tr><td>Ticket promedio</td><td>${dinero(metricas.ticketPromedio)}</td></tr>
				<tr class="total"><td>Adeudos pendientes</td><td>${dinero(metricas.adeudosPendientes)}</td></tr>
			</tbody></table></section>
			<section><h2>Resumen de movimientos</h2><table><tbody>
				<tr><td>Órdenes</td><td>${filas.length}</td></tr>
				<tr><td>Ventas con saldo</td><td>${Number(metricas.pacientesConSaldo || 0)}</td></tr>
			</tbody></table></section>
		</div>
		<section><h2>Ventas</h2>${tablaVentas(columnas, filas)}</section>
	</section>`;

	return construirDocumentoImpresion({ titulo, contenido });
};
