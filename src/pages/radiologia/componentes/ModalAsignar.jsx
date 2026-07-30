import { useMemo, useState } from "react";
import "../pages/VisorDicom.css";

const ModalAsignar = ({ config, onSeleccionar, onConfirmar, onCerrar, backdropClassName = "" }) => {
	const [busqueda, setBusqueda] = useState("");
	const {
		titulo,
		items = [],
		idKey,
		labelKey,
		sublabelKey,
		actual,
		seleccionado,
		loading,
	} = config || {};
	const chipItem = actual ? items.find((i) => i[idKey] == actual) : null;
	const itemsFiltrados = useMemo(() => {
		const termino = busqueda.trim().toLowerCase();
		if (!termino) return items;
		return items.filter((item) => {
			const label = String(item[labelKey] || "").toLowerCase();
			const sublabel = String(sublabelKey ? item[sublabelKey] || "" : "").toLowerCase();
			return label.includes(termino) || sublabel.includes(termino);
		});
	}, [busqueda, items, labelKey, sublabelKey]);

	if (!config) return null;

	return (
		<div className={`vd-modal-backdrop ${backdropClassName}`.trim()} onClick={onCerrar}>
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
							<input
								className="vd-modal-search"
								type="search"
								value={busqueda}
								onChange={(event) => setBusqueda(event.target.value)}
								placeholder="Buscar doctor..."
							/>
							<div className="vd-modal-list">
								{itemsFiltrados.map((item) => {
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
								{itemsFiltrados.length === 0 && (
									<div
										style={{
											padding: "1rem",
											color: "#8ab",
											textAlign: "center",
											fontSize: "0.88rem",
										}}>
										{items.length === 0 ? "Sin resultados" : "No se encontraron coincidencias"}
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
