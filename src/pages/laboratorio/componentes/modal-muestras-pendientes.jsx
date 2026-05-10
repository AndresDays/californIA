import "./modal-muestras-pendientes.css";

const obtenerClaveEstudio = (estudio) =>
	estudio.id_estudio_venta || estudio.id || estudio.clave;

const ModalMuestrasPendientes = ({
	isOpen,
	estudios = [],
	onClose,
	onToggleMuestraPendiente,
}) => {
	if (!isOpen) return null;

	const pendientes = estudios.filter((estudio) => estudio.muestra_pendiente).length;

	return (
		<div className="modal-muestras-overlay" onClick={onClose}>
			<div
				className="modal-muestras-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-muestras-title"
				onClick={(event) => event.stopPropagation()}>
				<div className="modal-muestras-header">
					<div>
						<h2 id="modal-muestras-title">Muestras pendientes</h2>
						<p>
							Marca solo los estudios que todavía esperan muestra del paciente.
						</p>
					</div>
					<button
						type="button"
						className="modal-muestras-close"
						onClick={onClose}
						aria-label="Cerrar muestras pendientes">
						X
					</button>
				</div>

				<div className="modal-muestras-summary">
					<span>{estudios.length} estudios</span>
					<strong>{pendientes} pendientes</strong>
				</div>

				<div className="modal-muestras-list">
					{estudios.length === 0 ? (
						<div className="modal-muestras-empty">
							Agrega estudios para poder marcar muestras pendientes.
						</div>
					) : (
						estudios.map((estudio) => {
							const key = obtenerClaveEstudio(estudio);
							return (
								<label
									key={key}
									className={`modal-muestra-row ${
										estudio.muestra_pendiente ? "is-pending" : ""
									}`}>
									<input
										type="checkbox"
										checked={Boolean(estudio.muestra_pendiente)}
										onChange={(event) =>
											onToggleMuestraPendiente(key, event.target.checked)
										}
									/>
									<span className="modal-muestra-info">
										<strong>{estudio.clave || "Sin clave"}</strong>
										<span>{estudio.descripcion}</span>
									</span>
									<span className="modal-muestra-area">
										{estudio.area || "Estudio"}
									</span>
								</label>
							);
						})
					)}
				</div>

				<div className="modal-muestras-footer">
					<button type="button" className="modal-muestras-primary" onClick={onClose}>
						Listo
					</button>
				</div>
			</div>
		</div>
	);
};

export default ModalMuestrasPendientes;
