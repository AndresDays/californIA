import "../pages/VisorDicom.css";

const ModalAsignar = ({ config, onSeleccionar, onConfirmar, onCerrar }) => {
	if (!config) return null;

	const {
		titulo,
		items,
		idKey,
		labelKey,
		sublabelKey,
		actual,
		seleccionado,
		loading,
	} = config;
	const chipItem = actual ? items.find((i) => i[idKey] == actual) : null;

	return (
		<div className="vd-modal-backdrop" onClick={onCerrar}>
			<div className="vd-modal" onClick={(e) => e.stopPropagation()}>
				<div className="vd-modal-header">
					<span>{titulo}</span>
					<button className="vd-modal-close" onClick={onCerrar}>
						✕
					</button>
				</div>

				<div className="vd-modal-body">
					{loading ? (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								color: "#53B9DB",
								padding: "0.5rem 0",
							}}>
							<div className="vd-spinner" /> Cargando...
						</div>
					) : (
						<>
							{chipItem && <div className="vd-modal-chip">{chipItem[labelKey]}</div>}
							<div className="vd-modal-list">
								{items.map((item) => {
									const id = item[idKey];
									const lbl =
										sublabelKey && item[sublabelKey]
											? `${item[labelKey]} — ${item[sublabelKey]}`
											: item[labelKey];
									return (
										<div
											key={id}
											className={`vd-modal-list-item${seleccionado == id ? " seleccionado" : ""}`}
											onClick={() => onSeleccionar(id)}>
											{lbl}
										</div>
									);
								})}
								{items.length === 0 && (
									<div
										style={{
											padding: "1rem",
											color: "#8ab",
											textAlign: "center",
											fontSize: "0.88rem",
										}}>
										Sin resultados
									</div>
								)}
							</div>
						</>
					)}
				</div>

				<div className="vd-modal-footer">
					<button className="vd-modal-btn-cancel" onClick={onCerrar}>
						Cancelar
					</button>
					<button
						className="vd-modal-btn-primary"
						onClick={onConfirmar}
						disabled={!seleccionado || loading}>
						Asignar Estudio
					</button>
				</div>
			</div>
		</div>
	);
};

export default ModalAsignar;
