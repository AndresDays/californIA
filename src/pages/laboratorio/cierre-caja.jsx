import { useEffect, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import empresaIcono from "../../assets/empresaIcono.png";
import pacienteIcono from "../../assets/pacientesIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
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
				<p className="modal-cierre-subtitulo">
					Registra el fondo inicial del día para esta sucursal.
				</p>
				<div className="modal-cierre-campo">
					<label>Monto de apertura</label>
					<input
						type="number"
						min="0"
						step="0.01"
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
					<button
						className="btn-modal-confirmar azul"
						onClick={handleConfirmar}
						disabled={guardando}>
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
				<p className="modal-cierre-subtitulo">
					Registra un ingreso o egreso manual de caja.
				</p>
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
							step="0.01"
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

const CierreCaja = () => {
	const { user } = useAuth();

	const [fechaActual, setFechaActual] = useState(new Date().toISOString().split("T")[0]);
	const [sucursales, setSucursales] = useState([]);
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [empleados, setEmpleados] = useState([]);
	const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
	const [montoApertura, setMontoApertura] = useState(0);
	const [ventasEfectivo, setVentasEfectivo] = useState(0);
	const [ingresosEfectivo, setIngresosEfectivo] = useState(0);
	const [egresosEfectivo, setEgresosEfectivo] = useState(0);
	const [totalEfectivo, setTotalEfectivo] = useState(0);
	const [ventasTarjeta, setVentasTarjeta] = useState(0);
	const [ingresosTarjeta, setIngresosTarjeta] = useState(0);
	const [egresosTarjeta, setEgresosTarjeta] = useState(0);
	const [totalTarjeta, setTotalTarjeta] = useState(0);
	const [transferencias, setTransferencias] = useState(0);
	const [ingresosTransferencias, setIngresosTransferencias] = useState(0);
	const [egresosTransferencias, setEgresosTransferencias] = useState(0);
	const [totalTransferencias, setTotalTransferencias] = useState(0);
	const [credito, setCredito] = useState(0);
	const [ingresosCredito, setIngresosCredito] = useState(0);
	const [egresosCredito, setEgresosCredito] = useState(0);
	const [totalCredito, setTotalCredito] = useState(0);
	const [montoCancelados, setMontoCancelados] = useState(0);
	const [totalEnCaja, setTotalEnCaja] = useState(0);
	const [totalAdeudos, setTotalAdeudos] = useState(0);
	const [empleadoData, setEmpleadoData] = useState(null);
	const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
	const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
	const [notificacion, setNotificacion] = useState(null);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol, id_sucursal, sucursal")
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
		calcularTotales();
	}, [
		montoApertura,
		ventasEfectivo, ingresosEfectivo, egresosEfectivo,
		ventasTarjeta, ingresosTarjeta, egresosTarjeta,
		transferencias, ingresosTransferencias, egresosTransferencias,
		credito, ingresosCredito, egresosCredito,
		montoCancelados,
	]);

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
			if (data && data.length > 0) setSucursalSeleccionada(data[0].id_sucursal);
		} catch (error) {
			console.error("Error al cargar sucursales:", error);
		}
	};

	const cargarEmpleados = async () => {
		try {
			const { data, error } = await supabase
				.from("empleados")
				.select("nombre, rol, auth_uuid")
				.order("nombre");
			if (error) throw error;
			setEmpleados(data || []);
		} catch (error) {
			console.error("Error al cargar empleados:", error);
		}
	};

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

			const movVentas = (data || []).filter(
				(m) => m.motivo !== "apertura_caja" &&
					m.motivo !== "movimiento_manual_ingreso" &&
					m.motivo !== "movimiento_manual_egreso",
			);
			const movManualesIngreso = (data || []).filter((m) => m.motivo === "movimiento_manual_ingreso");
			const movManualesEgreso = (data || []).filter((m) => m.motivo === "movimiento_manual_egreso");
			const apertura = (data || []).find((m) => m.motivo === "apertura_caja");

			if (apertura) setMontoApertura(parseFloat(apertura.monto) || 0);

			const resumen = resumirMovimientosCaja(movVentas);
			setVentasEfectivo(resumen.efectivo);
			setVentasTarjeta(resumen.tarjeta);
			setTransferencias(resumen.transferencia);
			setCredito(resumen.credito);
			setMontoCancelados(resumen.cancelaciones);
			setTotalAdeudos(resumen.adeudos);

			const sumarPorForma = (movs, forma) =>
				movs
					.filter((m) => String(m.forma_pago || "").toLowerCase().includes(forma))
					.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);

			setIngresosEfectivo(sumarPorForma(movManualesIngreso, "efectivo"));
			setIngresosTarjeta(sumarPorForma(movManualesIngreso, "tarjeta"));
			setIngresosTransferencias(sumarPorForma(movManualesIngreso, "transfer"));
			setIngresosCredito(sumarPorForma(movManualesIngreso, "credito") + sumarPorForma(movManualesIngreso, "crédito"));

			setEgresosEfectivo(sumarPorForma(movManualesEgreso, "efectivo"));
			setEgresosTarjeta(sumarPorForma(movManualesEgreso, "tarjeta"));
			setEgresosTransferencias(sumarPorForma(movManualesEgreso, "transfer"));
			setEgresosCredito(sumarPorForma(movManualesEgreso, "credito") + sumarPorForma(movManualesEgreso, "crédito"));
		} catch (error) {
			console.error("Error al cargar corte de caja:", error);
		}
	};

	const cargarCorteDesdeVentas = async (inicio, fin) => {
		let query = supabase
			.from("ventas")
			.select("total, pago_recibido, forma_pago, estado, id_sucursal")
			.gte("fecha_venta", inicio)
			.lte("fecha_venta", fin);
		if (sucursalSeleccionada) query = query.eq("id_sucursal", sucursalSeleccionada);
		const { data, error } = await query;
		if (error) throw error;
		const ventas = data || [];
		const suma = (forma) =>
			ventas
				.filter((v) => String(v.forma_pago || "").toLowerCase().includes(forma))
				.reduce((t, v) => t + (parseFloat(v.pago_recibido) || 0), 0);
		setVentasEfectivo(suma("efectivo"));
		setVentasTarjeta(suma("tarjeta"));
		setTransferencias(suma("transfer"));
		setCredito(suma("credito"));
		setMontoCancelados(
			ventas
				.filter((v) => String(v.estado || "").toLowerCase().includes("cancel"))
				.reduce((t, v) => t + (parseFloat(v.pago_recibido) || 0), 0),
		);
		setTotalAdeudos(
			ventas.reduce(
				(t, v) => t + Math.max((parseFloat(v.total) || 0) - (parseFloat(v.pago_recibido) || 0), 0),
				0,
			),
		);
	};

	const calcularTotales = () => {
		const totEfectivo = ventasEfectivo + ingresosEfectivo - egresosEfectivo;
		const totTarjeta = ventasTarjeta + ingresosTarjeta - egresosTarjeta;
		const totTransferencias = transferencias + ingresosTransferencias - egresosTransferencias;
		const totCredito = credito + ingresosCredito - egresosCredito;
		setTotalEfectivo(totEfectivo);
		setTotalTarjeta(totTarjeta);
		setTotalTransferencias(totTransferencias);
		setTotalCredito(totCredito);
		setTotalEnCaja(
			montoApertura + totEfectivo + totTarjeta + totTransferencias + totCredito - montoCancelados,
		);
	};

	const handleAperturaCaja = async (monto, nota) => {
		try {
			const sucursalObj = sucursales.find((s) => s.id_sucursal === sucursalSeleccionada);
			const payload = {
				tipo_movimiento: "ajuste",
				monto,
				forma_pago: "efectivo",
				motivo: "apertura_caja",
				referencia: nota || null,
				id_sucursal: sucursalSeleccionada || null,
				sucursal: sucursalObj?.nombre || null,
				actor_nombre: empleadoData?.nombre || null,
				actor_rol: empleadoData?.rol || null,
				actor_auth_uuid: user?.id || null,
			};
			const { error } = await supabase.from("movimientos_pago_venta").insert(payload);
			if (error && !esErrorTablaInexistente(error, "movimientos_pago_venta")) throw error;
			setMontoApertura(monto);
			setModalAperturaOpen(false);
			setNotificacion({ tipo: "exito", texto: `Apertura registrada: $${monto.toFixed(2)}` });
		} catch (err) {
			console.error("Error al registrar apertura:", err);
			setNotificacion({ tipo: "error", texto: "No se pudo registrar la apertura." });
		}
	};

	const handleNuevoMovimiento = async ({ tipo, concepto, formaPago, monto }) => {
		try {
			const sucursalObj = sucursales.find((s) => s.id_sucursal === sucursalSeleccionada);
			const motivo = tipo === "ingreso" ? "movimiento_manual_ingreso" : "movimiento_manual_egreso";
			const payload = {
				tipo_movimiento: "ajuste",
				monto,
				forma_pago: formaPago.toLowerCase(),
				motivo,
				referencia: concepto,
				id_sucursal: sucursalSeleccionada || null,
				sucursal: sucursalObj?.nombre || null,
				actor_nombre: empleadoData?.nombre || null,
				actor_rol: empleadoData?.rol || null,
				actor_auth_uuid: user?.id || null,
			};
			const { error } = await supabase.from("movimientos_pago_venta").insert(payload);
			if (error && !esErrorTablaInexistente(error, "movimientos_pago_venta")) throw error;

			const fp = formaPago.toLowerCase();
			if (tipo === "ingreso") {
				if (fp.includes("efectivo")) setIngresosEfectivo((p) => p + monto);
				else if (fp.includes("tarjeta")) setIngresosTarjeta((p) => p + monto);
				else if (fp.includes("transfer")) setIngresosTransferencias((p) => p + monto);
				else if (fp.includes("credito") || fp.includes("crédito")) setIngresosCredito((p) => p + monto);
			} else {
				if (fp.includes("efectivo")) setEgresosEfectivo((p) => p + monto);
				else if (fp.includes("tarjeta")) setEgresosTarjeta((p) => p + monto);
				else if (fp.includes("transfer")) setEgresosTransferencias((p) => p + monto);
				else if (fp.includes("credito") || fp.includes("crédito")) setEgresosCredito((p) => p + monto);
			}

			setModalMovimientoOpen(false);
			setNotificacion({
				tipo: "exito",
				texto: `${tipo === "ingreso" ? "Ingreso" : "Egreso"} registrado: $${monto.toFixed(2)} (${formaPago})`,
			});
		} catch (err) {
			console.error("Error al registrar movimiento:", err);
			setNotificacion({ tipo: "error", texto: "No se pudo registrar el movimiento." });
		}
	};

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	const formatRol = (rol) => {
		if (!rol) return "Usuario";
		const roles = {
			admin: "Administrador",
			administrador: "Administrador",
			radiologo: "Radiólogo - Director",
			doctor: "Médico",
			medico: "Médico",
			tecnico_radiologia: "Técnico en Radiología",
			tecnico: "Técnico",
			quimico: "Químico",
			recepcionista: "Recepcionista",
			desarrollador: "Desarrollador",
		};
		return roles[rol] || rol;
	};

	const nombreSucursal =
		sucursales.find((s) => s.id_sucursal === sucursalSeleccionada)?.nombre || "Todas";

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>

			{notificacion && (
				<div className={`cierre-toast ${notificacion.tipo}`}>
					{notificacion.texto}
				</div>
			)}

			<div className="cierre-caja-wrapper">
				<div className="cierre-caja-header">
					<h1 className="cierre-caja-title">Cierre Caja</h1>
				</div>

				<div className="cierre-caja-content">
					<div className="controles-cierre">
						<div className="fecha-actual-grupo">
							<label>
								<img src={calendarioIcono} alt="Fecha" className="icono-label-cierre" />
								Fecha Actual:
							</label>
							<input
								type="date"
								value={fechaActual}
								onChange={(e) => setFechaActual(e.target.value)}
								className="input-fecha-cierre"
							/>
						</div>
						<div className="sucursal-grupo">
							<img src={empresaIcono} alt="Empresa" className="icono-campo-cierre" />
							<select
								value={sucursalSeleccionada}
								onChange={(e) => setSucursalSeleccionada(e.target.value)}
								className="select-sucursal-cierre">
								<option value="">Selecciona una Sucursal</option>
								{sucursales.map((s) => (
									<option key={s.id_sucursal} value={s.id_sucursal}>
										{s.nombre}
									</option>
								))}
							</select>
						</div>
						<div className="usuario-grupo">
							<img src={pacienteIcono} alt="Usuario" className="icono-campo-cierre" />
							<select
								value={usuarioSeleccionado}
								onChange={(e) => setUsuarioSeleccionado(e.target.value)}
								className="select-usuario-cierre">
								<option value="">Todos los empleados</option>
								{empleados.map((empleado) => (
									<option
										key={empleado.auth_uuid || empleado.nombre}
										value={empleado.auth_uuid || ""}>
										{empleado.nombre}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="botones-accion-cierre">
						<button className="btn-apertura-caja" onClick={() => setModalAperturaOpen(true)}>
							Apertura Caja
						</button>
						<button className="btn-nuevo-movimiento" onClick={() => setModalMovimientoOpen(true)}>
							Nuevo movimiento
						</button>
						<button className="btn-imprimir-detalle" onClick={() => window.print()}>
							Imprimir Detalle Caja
						</button>
						<button className="btn-imprimir-sucursal" onClick={() => window.print()}>
							Imprimir Detalle Caja Sucursal
						</button>
					</div>

					<div className="monto-apertura-section">
						<label>Monto Apertura</label>
						<input
							type="number"
							value={montoApertura}
							onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
							className="input-monto-apertura"
						/>
					</div>

					<div className="campos-cierre-grid">
						<div className="campo-cierre verde">
							<label>Ventas Efectivo</label>
							<input type="number" value={ventasEfectivo} onChange={(e) => setVentasEfectivo(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre verde">
							<label>Ingresos Efectivo</label>
							<input type="number" value={ingresosEfectivo} onChange={(e) => setIngresosEfectivo(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre rojo">
							<label>Egresos Efectivo</label>
							<input type="number" value={egresosEfectivo} onChange={(e) => setEgresosEfectivo(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre azul">
							<label>Total Efectivo</label>
							<input type="number" value={totalEfectivo} readOnly className="input-campo-cierre" />
						</div>

						<div className="campo-cierre verde">
							<label>Ventas Tarjeta</label>
							<input type="number" value={ventasTarjeta} onChange={(e) => setVentasTarjeta(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre verde">
							<label>Ingresos Tarjeta</label>
							<input type="number" value={ingresosTarjeta} onChange={(e) => setIngresosTarjeta(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre rojo">
							<label>Egresos Tarjeta</label>
							<input type="number" value={egresosTarjeta} onChange={(e) => setEgresosTarjeta(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre azul">
							<label>Total Tarjeta</label>
							<input type="number" value={totalTarjeta} readOnly className="input-campo-cierre" />
						</div>

						<div className="campo-cierre verde">
							<label>Transferencias</label>
							<input type="number" value={transferencias} onChange={(e) => setTransferencias(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre verde">
							<label>Ingresos Transferencias</label>
							<input type="number" value={ingresosTransferencias} onChange={(e) => setIngresosTransferencias(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre rojo">
							<label>Egresos Transferencias</label>
							<input type="number" value={egresosTransferencias} onChange={(e) => setEgresosTransferencias(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre azul">
							<label>Total Transferencias</label>
							<input type="number" value={totalTransferencias} readOnly className="input-campo-cierre" />
						</div>

						<div className="campo-cierre verde">
							<label>Credito</label>
							<input type="number" value={credito} onChange={(e) => setCredito(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre verde">
							<label>Ingresos Credito</label>
							<input type="number" value={ingresosCredito} onChange={(e) => setIngresosCredito(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre rojo">
							<label>Egresos Credito</label>
							<input type="number" value={egresosCredito} onChange={(e) => setEgresosCredito(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="campo-cierre azul">
							<label>Total Credito</label>
							<input type="number" value={totalCredito} readOnly className="input-campo-cierre" />
						</div>
					</div>

					<div className="totales-finales-cierre">
						<div className="campo-cierre rojo">
							<label>Monto Cancelados</label>
							<input type="number" value={montoCancelados} onChange={(e) => setMontoCancelados(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
						<div className="espacio-vacio" />
						<div className="campo-cierre azul">
							<label>Total en Caja</label>
							<input type="number" value={totalEnCaja} readOnly className="input-campo-cierre" />
						</div>
						<div className="campo-cierre azul">
							<label>Total Adeudos</label>
							<input type="number" value={totalAdeudos} onChange={(e) => setTotalAdeudos(parseFloat(e.target.value) || 0)} className="input-campo-cierre" />
						</div>
					</div>
				</div>
			</div>

			<div className="print-only cierre-print-detalle">
				<h2>Detalle de Caja — {nombreSucursal}</h2>
				<p>Fecha: {fechaActual}</p>
				<table>
					<tbody>
						<tr><td>Monto Apertura</td><td>${montoApertura.toFixed(2)}</td></tr>
						<tr><td>Ventas Efectivo</td><td>${ventasEfectivo.toFixed(2)}</td></tr>
						<tr><td>Ingresos Efectivo</td><td>${ingresosEfectivo.toFixed(2)}</td></tr>
						<tr><td>Egresos Efectivo</td><td>-${egresosEfectivo.toFixed(2)}</td></tr>
						<tr><td>Total Efectivo</td><td>${totalEfectivo.toFixed(2)}</td></tr>
						<tr><td>Ventas Tarjeta</td><td>${ventasTarjeta.toFixed(2)}</td></tr>
						<tr><td>Ingresos Tarjeta</td><td>${ingresosTarjeta.toFixed(2)}</td></tr>
						<tr><td>Egresos Tarjeta</td><td>-${egresosTarjeta.toFixed(2)}</td></tr>
						<tr><td>Total Tarjeta</td><td>${totalTarjeta.toFixed(2)}</td></tr>
						<tr><td>Transferencias</td><td>${transferencias.toFixed(2)}</td></tr>
						<tr><td>Ingresos Transferencias</td><td>${ingresosTransferencias.toFixed(2)}</td></tr>
						<tr><td>Egresos Transferencias</td><td>-${egresosTransferencias.toFixed(2)}</td></tr>
						<tr><td>Total Transferencias</td><td>${totalTransferencias.toFixed(2)}</td></tr>
						<tr><td>Crédito</td><td>${credito.toFixed(2)}</td></tr>
						<tr><td>Ingresos Crédito</td><td>${ingresosCredito.toFixed(2)}</td></tr>
						<tr><td>Egresos Crédito</td><td>-${egresosCredito.toFixed(2)}</td></tr>
						<tr><td>Total Crédito</td><td>${totalCredito.toFixed(2)}</td></tr>
						<tr><td>Monto Cancelados</td><td>-${montoCancelados.toFixed(2)}</td></tr>
						<tr className="fila-total"><td><strong>TOTAL EN CAJA</strong></td><td><strong>${totalEnCaja.toFixed(2)}</strong></td></tr>
						<tr><td>Total Adeudos</td><td>${totalAdeudos.toFixed(2)}</td></tr>
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
