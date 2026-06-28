import React, { useEffect, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import empresaIcono from "../../assets/empresaIcono.png";
import pacienteIcono from "../../assets/pacientesIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import {
	filtrarVentasCortePorRecepcionista,
	formatearMontoCaja,
	formatearMontoCajaPorForma,
	limitarMontoCajaADosDecimales,
	normalizarMontoCajaPorForma,
	redondearMontoCaja,
} from "../../utils/cierre-caja";
import { resumirMovimientosCaja } from "../../utils/pagos-ventas";
import { esErrorTablaInexistente } from "../../utils/supabase-errors";
import "./cierre-caja.css";

const ModalAperturaCaja = ({ onConfirmar, onCerrar, montoActual }) => {
	const [monto, setMonto] = useState(montoActual || 0);
	const [nota, setNota] = useState("");
	const [guardando, setGuardando] = useState(false);

	const handleConfirmar = async () => {
		setGuardando(true);
		await onConfirmar(parseFloat(monto) || 0, nota.trim());
		setGuardando(false);
	};

	return (
		<div className="modal-cierre-overlay" onClick={onCerrar}>
			<div className="modal-cierre-box" onClick={(e) => e.stopPropagation()}>
				<h2 className="modal-cierre-titulo">Apertura de Caja</h2>
				<p className="modal-cierre-subtitulo">Registra el fondo inicial del día para esta sucursal.</p>
				<div className="modal-cierre-campo">
					<label>Monto de apertura</label>
					<input
						type="number"
						min="0"
						step="0.50"
						value={monto}
						onChange={(e) => setMonto(e.target.value)}
						className="modal-cierre-input azul"
						autoFocus
					/>
				</div>
				<div className="modal-cierre-campo">
					<label>Nota (opcional)</label>
					<input
						type="text"
						value={nota}
						onChange={(e) => setNota(e.target.value)}
						placeholder="Ej. Fondo inicial turno mañana"
						className="modal-cierre-input"
					/>
				</div>
				<div className="modal-cierre-acciones">
					<button className="btn-modal-cancelar" onClick={onCerrar} disabled={guardando}>
						Cancelar
					</button>
					<button className="btn-modal-confirmar azul" onClick={handleConfirmar} disabled={guardando}>
						{guardando ? "Guardando…" : "Confirmar apertura"}
					</button>
				</div>
			</div>
		</div>
	);
};

const FORMAS_PAGO = ["Efectivo", "Tarjeta", "Transferencia", "Crédito"];

const ModalNuevoMovimiento = ({ onConfirmar, onCerrar }) => {
	const [tipo, setTipo] = useState("ingreso");
	const [concepto, setConcepto] = useState("");
	const [formaPago, setFormaPago] = useState("Efectivo");
	const [monto, setMonto] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState("");

	const handleConfirmar = async () => {
		if (!concepto.trim()) { setError("El concepto es obligatorio."); return; }
		const montoNum = parseFloat(monto);
		if (!montoNum || montoNum <= 0) { setError("El monto debe ser mayor a 0."); return; }
		setError("");
		setGuardando(true);
		await onConfirmar({ tipo, concepto: concepto.trim(), formaPago, monto: montoNum });
		setGuardando(false);
	};

	return (
		<div className="modal-cierre-overlay" onClick={onCerrar}>
			<div className="modal-cierre-box" onClick={(e) => e.stopPropagation()}>
				<h2 className="modal-cierre-titulo">Nuevo Movimiento</h2>
				<p className="modal-cierre-subtitulo">Registra un ingreso o egreso manual de caja.</p>
				<div className="modal-cierre-toggle">
					<button
						className={`toggle-tipo ${tipo === "ingreso" ? "activo verde" : ""}`}
						onClick={() => setTipo("ingreso")}>
						+ Ingreso
					</button>
					<button
						className={`toggle-tipo ${tipo === "egreso" ? "activo rojo" : ""}`}
						onClick={() => setTipo("egreso")}>
						− Egreso
					</button>
				</div>
				<div className="modal-cierre-campo">
					<label>Concepto</label>
					<input
						type="text"
						value={concepto}
						onChange={(e) => setConcepto(e.target.value)}
						placeholder="Ej. Pago a proveedor, depósito extra…"
						className="modal-cierre-input"
						autoFocus
					/>
				</div>
				<div className="modal-cierre-fila">
					<div className="modal-cierre-campo">
						<label>Forma de pago</label>
						<select
							value={formaPago}
							onChange={(e) => setFormaPago(e.target.value)}
							className="modal-cierre-select">
							{FORMAS_PAGO.map((f) => (
								<option key={f} value={f}>{f}</option>
							))}
						</select>
					</div>
					<div className="modal-cierre-campo">
						<label>Monto</label>
						<input
							type="number"
							min="0.01"
							step={String(formaPago || "").toLowerCase().includes("efectivo") ? "0.50" : "0.01"}
							value={monto}
							onChange={(e) => setMonto(e.target.value)}
							placeholder="0.00"
							className={`modal-cierre-input ${tipo === "ingreso" ? "verde" : "rojo"}`}
						/>
					</div>
				</div>
				{error && <p className="modal-cierre-error">{error}</p>}
				<div className="modal-cierre-acciones">
					<button className="btn-modal-cancelar" onClick={onCerrar} disabled={guardando}>
						Cancelar
					</button>
					<button
						className={`btn-modal-confirmar ${tipo === "ingreso" ? "verde" : "rojo"}`}
						onClick={handleConfirmar}
						disabled={guardando}>
						{guardando ? "Guardando…" : `Registrar ${tipo}`}
					</button>
				</div>
			</div>
		</div>
	);
};

const FILAS_PAGO = [
	{ key: "efectivo",  label: "Efectivo",      clase: "efectivo" },
	{ key: "tarjeta",   label: "Tarjeta",        clase: "tarjeta"  },
	{ key: "transfer",  label: "Transferencia",  clase: "transfer" },
	{ key: "credito",   label: "Crédito",        clase: "credito"  },
];

const CierreCaja = () => {
	const { user, empleadoData: empleadoContext } = useAuth();

	const [fechaActual, setFechaActual] = useState(new Date().toISOString().split("T")[0]);
	const [sucursales, setSucursales] = useState([]);
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [empleados, setEmpleados] = useState([]);
	const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
	const [montoApertura, setMontoApertura] = useState(0);

	const [ventas, setVentas] = useState({ efectivo: 0, tarjeta: 0, transfer: 0, credito: 0 });
	const [ingresos, setIngresos] = useState({ efectivo: 0, tarjeta: 0, transfer: 0, credito: 0 });
	const [egresos, setEgresos] = useState({ efectivo: 0, tarjeta: 0, transfer: 0, credito: 0 });

	const [montoCancelados, setMontoCancelados] = useState(0);
	const [totalAdeudos, setTotalAdeudos] = useState(0);
	const [empleadoData, setEmpleadoData] = useState(empleadoContext || null);
	const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
	const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
	const [notificacion, setNotificacion] = useState(null);

	const totales = FILAS_PAGO.reduce((acc, { key }) => {
		acc[key] = normalizarMontoCajaPorForma(
			ventas[key] + ingresos[key] - egresos[key],
			key,
		);
		return acc;
	}, {});

	const totalEnCaja = limitarMontoCajaADosDecimales(
		montoApertura +
			Object.values(totales).reduce((s, v) => s + v, 0) -
			montoCancelados,
	);

	useEffect(() => {
		if (empleadoContext) setEmpleadoData(empleadoContext);
	}, [empleadoContext]);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (!error && empleado) setEmpleadoData(empleado);
			} catch (error) {
				console.error("Error:", error);
			}
		};
		fetchEmpleadoData();
		cargarSucursales();
		cargarEmpleados();
	}, [user]);

	useEffect(() => {
		cargarCorteCaja();
	}, [fechaActual, sucursalSeleccionada, usuarioSeleccionado]);

	useEffect(() => {
		if (!notificacion) return;
		const t = setTimeout(() => setNotificacion(null), 3000);
		return () => clearTimeout(t);
	}, [notificacion]);

	const cargarSucursales = async () => {
		try {
			const { data, error } = await supabase
				.from("sucursales")
				.select("id_sucursal, nombre")
				.order("nombre");
			if (error) throw error;
			setSucursales(data || []);
			if (data?.length > 0) setSucursalSeleccionada(data[0].id_sucursal);
		} catch (error) {
			console.error("Error al cargar sucursales:", error);
		}
	};

	const cargarEmpleados = async () => {
		try {
			const { data, error } = await supabase
				.from("empleados")
				.select("id_empleado, nombre, rol, auth_uuid")
				.order("nombre");
			if (error) throw error;
			setEmpleados(data || []);
		} catch (error) {
			console.error("Error al cargar empleados:", error);
		}
	};

	const sumarPorForma = (movs, forma) =>
		normalizarMontoCajaPorForma(
			movs
				.filter((m) => String(m.forma_pago || "").toLowerCase().includes(forma))
				.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0),
			forma,
		);

	const cargarCorteCaja = async () => {
		const inicio = `${fechaActual}T00:00:00`;
		const fin = `${fechaActual}T23:59:59`;
		try {
			let query = supabase
				.from("movimientos_pago_venta")
				.select("*")
				.gte("created_at", inicio)
				.lte("created_at", fin);
			if (sucursalSeleccionada) query = query.eq("id_sucursal", sucursalSeleccionada);
			if (usuarioSeleccionado) query = query.eq("actor_auth_uuid", usuarioSeleccionado);

			const { data, error } = await query;
			if (error) {
				if (!esErrorTablaInexistente(error, "movimientos_pago_venta")) throw error;
				await cargarCorteDesdeVentas(inicio, fin);
				return;
			}

			const movVentas    = (data || []).filter((m) => !["apertura_caja", "movimiento_manual_ingreso", "movimiento_manual_egreso"].includes(m.motivo));
			const movIngreso   = (data || []).filter((m) => m.motivo === "movimiento_manual_ingreso");
			const movEgreso    = (data || []).filter((m) => m.motivo === "movimiento_manual_egreso");
			const apertura     = (data || []).find((m) => m.motivo === "apertura_caja");

			if (apertura) setMontoApertura(redondearMontoCaja(apertura.monto));

			const resumen = resumirMovimientosCaja(movVentas);
			setVentas({
				efectivo: redondearMontoCaja(resumen.efectivo),
				tarjeta: normalizarMontoCajaPorForma(resumen.tarjeta, "tarjeta"),
				transfer: normalizarMontoCajaPorForma(resumen.transferencia, "transfer"),
				credito: normalizarMontoCajaPorForma(resumen.credito, "credito"),
			});
			setMontoCancelados(limitarMontoCajaADosDecimales(resumen.cancelaciones));
			setTotalAdeudos(limitarMontoCajaADosDecimales(resumen.adeudos));

			setIngresos({
				efectivo: sumarPorForma(movIngreso, "efectivo"),
				tarjeta:  sumarPorForma(movIngreso, "tarjeta"),
				transfer: sumarPorForma(movIngreso, "transfer"),
				credito:  sumarPorForma(movIngreso, "credito") + sumarPorForma(movIngreso, "crédito"),
			});
			setEgresos({
				efectivo: sumarPorForma(movEgreso, "efectivo"),
				tarjeta:  sumarPorForma(movEgreso, "tarjeta"),
				transfer: sumarPorForma(movEgreso, "transfer"),
				credito:  sumarPorForma(movEgreso, "credito") + sumarPorForma(movEgreso, "crédito"),
			});
		} catch (error) {
			console.error("Error al cargar corte de caja:", error);
		}
	};

	const cargarCorteDesdeVentas = async (inicio, fin) => {
		let query = supabase
			.from("ventas")
			.select("total, pago_recibido, forma_pago, estado, id_sucursal, id_empleado")
			.gte("fecha_venta", inicio)
			.lte("fecha_venta", fin);
		if (sucursalSeleccionada) query = query.eq("id_sucursal", sucursalSeleccionada);
		const { data, error } = await query;
		if (error) throw error;
		const vs = filtrarVentasCortePorRecepcionista(
			data || [],
			empleados,
			usuarioSeleccionado,
		);
		const suma = (forma) =>
			normalizarMontoCajaPorForma(
				vs.filter((v) => String(v.forma_pago || "").toLowerCase().includes(forma))
					.reduce((t, v) => t + (parseFloat(v.pago_recibido) || 0), 0),
				forma,
			);
		setVentas({ efectivo: suma("efectivo"), tarjeta: suma("tarjeta"), transfer: suma("transfer"), credito: suma("credito") });
		setMontoCancelados(
			limitarMontoCajaADosDecimales(
				vs.filter((v) => String(v.estado || "").toLowerCase().includes("cancel"))
					.reduce((t, v) => t + (parseFloat(v.pago_recibido) || 0), 0),
			),
		);
		setTotalAdeudos(
			limitarMontoCajaADosDecimales(
				vs.reduce((t, v) => t + Math.max((parseFloat(v.total) || 0) - (parseFloat(v.pago_recibido) || 0), 0), 0),
			),
		);
	};

	const handleAperturaCaja = async (monto, nota) => {
		try {
			const sucursalObj = sucursales.find((s) => s.id_sucursal === sucursalSeleccionada);
			const montoRedondeado = normalizarMontoCajaPorForma(monto, "efectivo");
			const { error } = await supabase.from("movimientos_pago_venta").insert({
				tipo_movimiento: "ajuste",
				monto: montoRedondeado,
				forma_pago: "efectivo",
				motivo: "apertura_caja",
				referencia: nota || null,
				id_sucursal: sucursalSeleccionada || null,
				sucursal: sucursalObj?.nombre || null,
				actor_nombre: empleadoData?.nombre || null,
				actor_rol: empleadoData?.rol || null,
				actor_auth_uuid: user?.id || null,
			});
			if (error && !esErrorTablaInexistente(error, "movimientos_pago_venta")) throw error;
			setMontoApertura(montoRedondeado);
			setModalAperturaOpen(false);
			setNotificacion({ tipo: "exito", texto: `Apertura registrada: $${formatearMontoCaja(montoRedondeado)}` });
		} catch (err) {
			console.error("Error al registrar apertura:", err);
			setNotificacion({ tipo: "error", texto: "No se pudo registrar la apertura." });
		}
	};

	const handleNuevoMovimiento = async ({ tipo, concepto, formaPago, monto }) => {
		try {
			const sucursalObj = sucursales.find((s) => s.id_sucursal === sucursalSeleccionada);
			const motivo = tipo === "ingreso" ? "movimiento_manual_ingreso" : "movimiento_manual_egreso";
			const montoRedondeado = normalizarMontoCajaPorForma(monto, formaPago);
			const { error } = await supabase.from("movimientos_pago_venta").insert({
				tipo_movimiento: "ajuste",
				monto: montoRedondeado,
				forma_pago: formaPago.toLowerCase(),
				motivo,
				referencia: concepto,
				id_sucursal: sucursalSeleccionada || null,
				sucursal: sucursalObj?.nombre || null,
				actor_nombre: empleadoData?.nombre || null,
				actor_rol: empleadoData?.rol || null,
				actor_auth_uuid: user?.id || null,
			});
			if (error && !esErrorTablaInexistente(error, "movimientos_pago_venta")) throw error;

			const fp = formaPago.toLowerCase();
			const clave = fp.includes("efectivo") ? "efectivo"
				: fp.includes("tarjeta") ? "tarjeta"
				: fp.includes("transfer") ? "transfer"
				: "credito";

			if (tipo === "ingreso") {
				setIngresos((p) => ({
					...p,
					[clave]: normalizarMontoCajaPorForma(p[clave] + montoRedondeado, clave),
				}));
			} else {
				setEgresos((p) => ({
					...p,
					[clave]: normalizarMontoCajaPorForma(p[clave] + montoRedondeado, clave),
				}));
			}

			setModalMovimientoOpen(false);
			setNotificacion({ tipo: "exito", texto: `${tipo === "ingreso" ? "Ingreso" : "Egreso"} registrado: $${formatearMontoCaja(montoRedondeado)} (${formaPago})` });
		} catch (err) {
			console.error("Error al registrar movimiento:", err);
			setNotificacion({ tipo: "error", texto: "No se pudo registrar el movimiento." });
		}
	};

	const getPrimerNombre = (nombreCompleto) =>
		nombreCompleto || user?.email?.split("@")[0] || "Usuario";

	const formatRol = (rol) => {
		if (!rol) return "Usuario";
		return {
			admin: "Administrador", administrador: "Administrador",
			radiologo: "Radiólogo - Director", doctor: "Médico", medico: "Médico",
			tecnico_radiologia: "Técnico en Radiología", tecnico: "Técnico",
			quimico: "Químico", recepcionista: "Recepcionista", desarrollador: "Desarrollador",
		}[rol] || rol;
	};

	const fmt = (n) => `$${limitarMontoCajaADosDecimales(n).toFixed(2)}`;
	const fmtForma = (n, formaPago) => `$${formatearMontoCajaPorForma(n, formaPago)}`;
	const nombreSucursal = sucursales.find((s) => s.id_sucursal === sucursalSeleccionada)?.nombre || "Todas";

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>

			{notificacion && (
				<div className={`cierre-toast ${notificacion.tipo}`}>{notificacion.texto}</div>
			)}

			<div className="cierre-caja-wrapper">
				<div className="cierre-caja-header">
					<h1 className="cierre-caja-title">Cierre de Caja</h1>
					<div className="botones-accion-cierre">
						<button className="btn-apertura-caja" onClick={() => setModalAperturaOpen(true)}>
							Apertura Caja
						</button>
						<button className="btn-nuevo-movimiento" onClick={() => setModalMovimientoOpen(true)}>
							+ Movimiento
						</button>
						<button className="btn-imprimir-detalle" onClick={() => window.print()}>
							Imprimir
						</button>
						<button className="btn-imprimir-sucursal" onClick={() => window.print()}>
							Imprimir Sucursal
						</button>
					</div>
				</div>

				<div className="cierre-caja-content">
					<div className="controles-cierre">
						<div className="fecha-actual-grupo">
							<label>
								<img src={calendarioIcono} alt="" className="icono-label-cierre" />
								Fecha
							</label>
							<input
								type="date"
								value={fechaActual}
								onChange={(e) => setFechaActual(e.target.value)}
								className="input-fecha-cierre"
							/>
						</div>
						<div className="sucursal-grupo">
							<label>
								<img src={empresaIcono} alt="" className="icono-label-cierre" />
								Sucursal
							</label>
							<select
								value={sucursalSeleccionada}
								onChange={(e) => setSucursalSeleccionada(e.target.value)}
								className="select-sucursal-cierre">
								<option value="">Todas las sucursales</option>
								{sucursales.map((s) => (
									<option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
								))}
							</select>
						</div>
						<div className="usuario-grupo">
							<label>
								<img src={pacienteIcono} alt="" className="icono-label-cierre" />
								Empleado
							</label>
							<select
								value={usuarioSeleccionado}
								onChange={(e) => setUsuarioSeleccionado(e.target.value)}
								className="select-usuario-cierre">
								<option value="">Todos los empleados</option>
								{empleados.map((e) => (
									<option key={e.auth_uuid || e.nombre} value={e.auth_uuid || ""}>{e.nombre}</option>
								))}
							</select>
						</div>
						<div className="monto-apertura-section">
							<label>Apertura</label>
							<input
								type="number"
								step="0.50"
								value={formatearMontoCaja(montoApertura)}
								onChange={(e) => setMontoApertura(redondearMontoCaja(e.target.value))}
								className="input-monto-apertura"
							/>
						</div>
					</div>

					<div className="campos-cierre-grid">
						<div className="fila-encabezado">
							<span>Forma de pago</span>
							<span>Ventas</span>
							<span>Ingresos</span>
							<span>Egresos</span>
							<span>Total</span>
						</div>

						{FILAS_PAGO.map(({ key, label, clase }) => (
							<div key={key} className={`fila-forma-pago ${clase}`}>
								<div className="fila-label">
									<span className="fila-dot" />
									{label}
								</div>
								<div className="campo-cierre verde">
									<input type="number" step={key === "efectivo" ? "0.50" : "0.01"} value={formatearMontoCajaPorForma(ventas[key], key)}
										onChange={(e) => setVentas((p) => ({ ...p, [key]: normalizarMontoCajaPorForma(e.target.value, key) }))}
										className="input-campo-cierre" />
								</div>
								<div className="campo-cierre verde">
									<input type="number" step={key === "efectivo" ? "0.50" : "0.01"} value={formatearMontoCajaPorForma(ingresos[key], key)}
										onChange={(e) => setIngresos((p) => ({ ...p, [key]: normalizarMontoCajaPorForma(e.target.value, key) }))}
										className="input-campo-cierre" />
								</div>
								<div className="campo-cierre rojo">
									<input type="number" step={key === "efectivo" ? "0.50" : "0.01"} value={formatearMontoCajaPorForma(egresos[key], key)}
										onChange={(e) => setEgresos((p) => ({ ...p, [key]: normalizarMontoCajaPorForma(e.target.value, key) }))}
										className="input-campo-cierre" />
								</div>
								<div className="campo-cierre azul">
									<input type="number" step={key === "efectivo" ? "0.50" : "0.01"} value={formatearMontoCajaPorForma(totales[key], key)} readOnly className="input-campo-cierre" />
								</div>
							</div>
						))}
					</div>

					<div className="totales-finales-cierre">
						<div className="total-card cancelados">
							<label>Cancelados</label>
							<input type="number" step="0.01" value={limitarMontoCajaADosDecimales(montoCancelados).toFixed(2)}
								onChange={(e) => setMontoCancelados(limitarMontoCajaADosDecimales(e.target.value))}
								className="input-campo-cierre" />
						</div>
						<div className="total-card">
							<label>Adeudos</label>
							<input type="number" step="0.01" value={limitarMontoCajaADosDecimales(totalAdeudos).toFixed(2)}
								onChange={(e) => setTotalAdeudos(limitarMontoCajaADosDecimales(e.target.value))}
								className="input-campo-cierre" />
						</div>
						<div className="total-card destacado">
							<label>Total en Caja</label>
							<input type="number" step="0.01" value={limitarMontoCajaADosDecimales(totalEnCaja).toFixed(2)} readOnly className="input-campo-cierre" />
						</div>
					</div>
				</div>
			</div>

			<div className="print-only cierre-print-detalle">
				<h2>Detalle de Caja — {nombreSucursal}</h2>
				<p>Fecha: {fechaActual}</p>
				<table>
					<tbody>
						<tr><td>Monto Apertura</td><td>{fmt(montoApertura)}</td></tr>
						{FILAS_PAGO.map(({ key, label }) => (
							<React.Fragment key={key}>
								<tr><td>Ventas {label}</td><td>{fmtForma(ventas[key], key)}</td></tr>
								<tr><td>Ingresos {label}</td><td>{fmtForma(ingresos[key], key)}</td></tr>
								<tr><td>Egresos {label}</td><td>-{fmtForma(egresos[key], key)}</td></tr>
								<tr><td>Total {label}</td><td>{fmtForma(totales[key], key)}</td></tr>
							</React.Fragment>
						))}
						<tr><td>Cancelados</td><td>-{fmt(montoCancelados)}</td></tr>
						<tr className="fila-total">
							<td><strong>TOTAL EN CAJA</strong></td>
							<td><strong>{fmt(totalEnCaja)}</strong></td>
						</tr>
						<tr><td>Total Adeudos</td><td>{fmt(totalAdeudos)}</td></tr>
					</tbody>
				</table>
			</div>

			{modalAperturaOpen && (
				<ModalAperturaCaja
					montoActual={montoApertura}
					onConfirmar={handleAperturaCaja}
					onCerrar={() => setModalAperturaOpen(false)}
				/>
			)}

			{modalMovimientoOpen && (
				<ModalNuevoMovimiento
					onConfirmar={handleNuevoMovimiento}
					onCerrar={() => setModalMovimientoOpen(false)}
				/>
			)}
		</PageLayout>
	);
};

export default CierreCaja;
