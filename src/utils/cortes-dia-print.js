const escaparHtml = (valor) => String(valor ?? "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/\"/g, "&quot;")
	.replace(/'/g, "&#039;");

const dinero = (valor) => `$${Number(valor || 0).toLocaleString("es-MX", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})} MXN`;

const fechaCorta = (fecha) => {
	const [anio, mes, dia] = String(fecha || "").split("-");
	return anio && mes && dia ? `${dia}/${mes}/${anio}` : "-";
};

const detalleTransaccion = (tx) =>
	(tx.estudios || []).map((estudio) => estudio.descripcion_estudio).filter(Boolean).join(", ") ||
	tx.referencia ||
	tx.tipo ||
	"-";

const filaTransaccion = (tx) => `
	<tr>
		<td>${escaparHtml(tx.folio || "-")}</td>
		<td>${escaparHtml(tx.paciente || "-")}</td>
		<td>${escaparHtml(detalleTransaccion(tx))}</td>
		<td>${escaparHtml(tx.cliente || "Particular")}</td>
		<td>${escaparHtml(tx.forma_pago || "-")}</td>
		<td>${dinero(tx.monto)}</td>
		<td>${dinero(tx.pagoVenta || tx.monto)}</td>
		<td>${dinero(tx.adeudo)}</td>
	</tr>`;

const tablaMovimientos = (movimientos, mensaje) => movimientos.length > 0
	? `<table class="movimientos"><thead><tr><th>Folio</th><th>Paciente</th><th>Detalle</th><th>Cliente</th><th>Forma de pago</th><th>Monto</th><th>Pago</th><th>Saldo</th></tr></thead><tbody>${movimientos.map(filaTransaccion).join("")}</tbody></table>`
	: `<p class="sin-movimientos">${escaparHtml(mensaje)}</p>`;

const totalPorForma = (transacciones, forma) => transacciones
	.filter((tx) => forma(String(tx.forma_pago || "").toLowerCase()))
	.reduce((total, tx) => total + Number(tx.monto || 0), 0);

const totalAdeudos = (transacciones) => {
	const ventas = new Map();
	transacciones.forEach((tx) => {
		if (tx.id_venta) ventas.set(String(tx.id_venta), Number(tx.adeudo || 0));
	});
	return [...ventas.values()].reduce((total, adeudo) => total + adeudo, 0);
};

const hojaCorte = ({ corte, transacciones, fecha, sucursal, impresoEl, titulo }) => {
	const movimientosCorte = transacciones.filter((tx) => tx.motivo !== "apertura_caja" && tx.tipo !== "apertura");
	const ingresos = movimientosCorte.filter((tx) => tx.monto >= 0);
	const cancelaciones = movimientosCorte.filter((tx) => tx.monto < 0 && String(tx.tipo).includes("cancel"));
	const vales = movimientosCorte.filter((tx) => tx.monto < 0 && !String(tx.tipo).includes("cancel"));
	const efectivo = totalPorForma(ingresos, (forma) => forma.includes("efectivo"));
	const tarjetaCredito = totalPorForma(ingresos, (forma) => forma.includes("tarjeta_credito") || forma.includes("tarjeta crédito"));
	const tarjetaDebito = totalPorForma(ingresos, (forma) => forma.includes("tarjeta") && !forma.includes("credito") && !forma.includes("crédito"));
	const transferencias = totalPorForma(ingresos, (forma) => forma.includes("transfer"));
	const bancos = tarjetaDebito + tarjetaCredito + transferencias;
	const porCobrar = totalAdeudos(ingresos) || Number(corte.credito || 0);
	const totalCorte = movimientosCorte.reduce((total, tx) => total + Number(tx.monto || 0), 0);

	return `<section class="corte">
		<header>
		<h1>${escaparHtml(titulo || "Corte de Caja")}</h1>
			<p><b>Usuario:</b> ${escaparHtml(corte.empleadoNombre)}</p>
			<p><b>Sucursal:</b> ${escaparHtml(sucursal)}</p>
			<p><b>Fecha del corte:</b> ${fechaCorta(fecha)}</p>
			<p><b>Impreso el:</b> ${escaparHtml(impresoEl)}</p>
		</header>
		<hr />
		<div class="resumenes">
			<section><h2>Resumen</h2><table><thead><tr><th>Forma de pago</th><th>Monto</th></tr></thead><tbody>
				<tr class="grupo"><td colspan="2">Efectivo</td></tr>
				<tr><td>Efectivo</td><td>${dinero(efectivo)}</td></tr>
				<tr class="total"><td>Efectivo neto a entregar</td><td>${dinero(efectivo)}</td></tr>
				<tr class="grupo"><td colspan="2">Bancos</td></tr>
				<tr><td>Tarjeta de débito</td><td>${dinero(tarjetaDebito)}</td></tr>
				<tr><td>Tarjeta de crédito</td><td>${dinero(tarjetaCredito)}</td></tr>
				${transferencias ? `<tr><td>Transferencias</td><td>${dinero(transferencias)}</td></tr>` : ""}
				<tr class="total"><td>Total bancos</td><td>${dinero(bancos)}</td></tr>
				<tr class="grupo"><td colspan="2">Por cobrar</td></tr>
				<tr class="total"><td>Total por cobrar</td><td>${dinero(porCobrar)}</td></tr>
				<tr class="total"><td>Gran total del corte</td><td>${dinero(totalCorte)}</td></tr>
			</tbody></table></section>
			<section><h2>Resumen de movimientos</h2><table><tbody>
				<tr><td>Órdenes</td><td>${ingresos.length}</td></tr>
				<tr><td>Órdenes canceladas</td><td>${cancelaciones.length}</td></tr>
				<tr><td>Pagos cancelados</td><td>0</td></tr>
				<tr><td>Cupones</td><td>0</td></tr>
				<tr><td>Cortesías</td><td>0</td></tr>
			</tbody></table></section>
		</div>
		<section><h2>Ingresos</h2>${tablaMovimientos(ingresos, "Sin ingresos registrados para el usuario en el día seleccionado.")}</section>
		<section><h2>Cancelaciones</h2>${tablaMovimientos(cancelaciones, "Sin pagos cancelados registrados por el usuario en el día seleccionado.")}</section>
		<section><h2>Vales de caja</h2>${tablaMovimientos(vales, "Sin gastos registrados por el usuario en el día seleccionado.")}</section>
	</section>`;
};

export const construirDocumentoCortes = ({ fecha, sucursal, cortes = [], transacciones = [], titulo = "Corte de Caja" }) => {
	const impresoEl = new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
	const hojas = cortes.map((corte) => hojaCorte({
		corte,
		fecha,
		sucursal,
		impresoEl,
		titulo,
		transacciones: transacciones.filter((tx) => String(tx.empleadoKey) === String(corte.empleadoKey)),
	})).join("");

	return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title><style>
		@page { size: letter landscape; margin: 12mm; }
		* { box-sizing: border-box; } body { color: #111; font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
		.corte { break-after: page; page-break-after: always; } .corte:last-child { break-after: auto; page-break-after: auto; }
		h1 { font-size: 16px; margin: 0 0 7px; } header p { margin: 2px 0; } hr { border: 0; border-top: 2px solid #444; margin: 26px 0 20px; }
		.resumenes { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; } section { margin: 0 0 14px; } h2 { border-bottom: 2px solid #111; font-size: 13px; margin: 0 0 8px; padding-bottom: 2px; }
		table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #111; padding: 4px 5px; text-align: left; vertical-align: top; } th { font-size: 10px; } td:last-child, th:last-child { text-align: right; } .total td { font-weight: bold; }
		.sin-movimientos { color: #666; margin: 18px 0; text-align: center; } .movimientos { font-size: 9px; }
	</style></head><body>${hojas}</body></html>`;
};
