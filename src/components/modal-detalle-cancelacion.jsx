import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase-client";
import {
	cargarDetalleCancelacion,
	formatearDetalleCancelacion,
} from "../utils/detalle-cancelacion";
import "./modal-detalle-cancelacion.css";

// El detalle de la orden que se acaba de cancelar, tal como lo abre el aviso de
// la campana. Antes el aviso llevaba a Editar solicitud, que sólo lista órdenes
// activas: la cancelada no salía ahí y no había manera de ver qué se canceló.
const ModalDetalleCancelacion = ({ idVenta, isOpen, onClose }) => {
	const [vista, setVista] = useState(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isOpen || !idVenta) return undefined;

		let vigente = true;
		setCargando(true);
		setError("");
		setVista(null);

		cargarDetalleCancelacion(supabase, idVenta)
			.then(({ detalle, error: fallo }) => {
				if (!vigente) return;
				if (fallo) {
					setError("No se pudo cargar el detalle de la orden.");
					return;
				}
				if (!detalle) {
					setError("La orden ya no existe.");
					return;
				}
				setVista(formatearDetalleCancelacion(detalle));
			})
			.finally(() => {
				if (vigente) setCargando(false);
			});

		// Si se cierra el modal o se abre otro aviso antes de que llegue la
		// respuesta, lo que llegue tarde ya no se pinta.
		return () => {
			vigente = false;
		};
	}, [idVenta, isOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const cerrarConEscape = (evento) => {
			if (evento.key === "Escape") onClose?.();
		};
		document.addEventListener("keydown", cerrarConEscape);
		return () => document.removeEventListener("keydown", cerrarConEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return createPortal(
		<div className="cancelacion-overlay" onClick={onClose}>
			<div
				className="cancelacion-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="cancelacion-titulo"
				onClick={(evento) => evento.stopPropagation()}>
				<div className="cancelacion-header">
					<div>
						<span className="cancelacion-etiqueta">Cancelada</span>
						<h2 id="cancelacion-titulo">
							{vista?.titulo || "Solicitud cancelada"}
						</h2>
					</div>
					<button
						type="button"
						className="cancelacion-cerrar"
						onClick={onClose}
						aria-label="Cerrar detalle">
						✕
					</button>
				</div>

				<div className="cancelacion-body">
					{cargando && <p className="cancelacion-aviso">Cargando detalle…</p>}
					{!cargando && error && <p className="cancelacion-aviso">{error}</p>}

					{!cargando && vista && (
						<>
							{/* Una orden que se reactivó después deja de ser una
							    cancelación, y el aviso viejo seguiría diciendo que lo es. */}
							{!vista.sigueCancelada && (
								<p className="cancelacion-nota">
									Esta orden ya no está cancelada: alguien la reactivó después
									del aviso.
								</p>
							)}

							{vista.hayPagoPorDevolver && (
								<p className="cancelacion-nota cancelacion-nota-dinero">
									La orden tenía pago recibido. Revisa la devolución.
								</p>
							)}

							<section className="cancelacion-bloque cancelacion-bloque-motivo">
								<h3>Cancelación</h3>
								<dl>
									{vista.cancelacion.map(([etiqueta, valor]) => (
										<div key={etiqueta}>
											<dt>{etiqueta}</dt>
											<dd>{valor}</dd>
										</div>
									))}
								</dl>
							</section>

							<section className="cancelacion-bloque">
								<h3>Orden</h3>
								<dl>
									{vista.datos.map(([etiqueta, valor]) => (
										<div key={etiqueta}>
											<dt>{etiqueta}</dt>
											<dd>{valor}</dd>
										</div>
									))}
								</dl>
							</section>

							<section className="cancelacion-bloque">
								<h3>Estudios ({vista.estudios.length})</h3>
								{vista.estudios.length === 0 ? (
									<p className="cancelacion-aviso">
										La orden no tenía estudios registrados.
									</p>
								) : (
									<div className="cancelacion-tabla-envoltura">
										<table className="cancelacion-tabla">
											<thead>
												<tr>
													<th>Clave</th>
													<th>Estudio</th>
													<th>Área</th>
													<th className="cancelacion-derecha">Precio</th>
												</tr>
											</thead>
											<tbody>
												{vista.estudios.map((estudio) => (
													<tr key={estudio.id}>
														<td>{estudio.clave}</td>
														<td>{estudio.descripcion}</td>
														<td>{estudio.area}</td>
														<td className="cancelacion-derecha">
															{estudio.precio}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							<section className="cancelacion-totales">
								{vista.totales.map(([etiqueta, valor]) => (
									<div key={etiqueta}>
										<span>{etiqueta}</span>
										<strong>{valor}</strong>
									</div>
								))}
							</section>

							{vista.observaciones && (
								<section className="cancelacion-bloque">
									<h3>Observaciones</h3>
									<p className="cancelacion-observaciones">{vista.observaciones}</p>
								</section>
							)}
						</>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default ModalDetalleCancelacion;
