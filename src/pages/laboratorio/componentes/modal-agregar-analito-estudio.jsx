import { useState } from "react";
import "./modal-agregar-analito-estudio.css";

const ModalAgregarAnalitoEstudio = ({
	isOpen,
	onClose,
	onGuardar,
	analitosDisponibles,
}) => {
	const [busqueda, setBusqueda] = useState("");
	const [analitosSeleccionados, setAnalitosSeleccionados] = useState([]);

	if (!isOpen) return null;

	const analitosFiltrados = analitosDisponibles.filter(
		(analito) =>
			analito.clave.toLowerCase().includes(busqueda.toLowerCase()) ||
			analito.descripcion.toLowerCase().includes(busqueda.toLowerCase()),
	);

	const toggleAnalito = (analito) => {
		const yaSeleccionado = analitosSeleccionados.find(
			(a) => a.id_analito === analito.id_analito,
		);

		if (yaSeleccionado) {
			setAnalitosSeleccionados(
				analitosSeleccionados.filter((a) => a.id_analito !== analito.id_analito),
			);
		} else {
			setAnalitosSeleccionados([...analitosSeleccionados, analito]);
		}
	};

	const estaSeleccionado = (idAnalito) => {
		return analitosSeleccionados.some((a) => a.id_analito === idAnalito);
	};

	const getOrdenSeleccionado = (idAnalito) => {
		const index = analitosSeleccionados.findIndex((a) => a.id_analito === idAnalito);
		return index >= 0 ? index + 1 : null;
	};

	const moverArriba = (index) => {
		if (index === 0) return;
		const nuevosAnalitos = [...analitosSeleccionados];
		[nuevosAnalitos[index - 1], nuevosAnalitos[index]] = [
			nuevosAnalitos[index],
			nuevosAnalitos[index - 1],
		];
		setAnalitosSeleccionados(nuevosAnalitos);
	};

	const moverAbajo = (index) => {
		if (index === analitosSeleccionados.length - 1) return;
		const nuevosAnalitos = [...analitosSeleccionados];
		[nuevosAnalitos[index], nuevosAnalitos[index + 1]] = [
			nuevosAnalitos[index + 1],
			nuevosAnalitos[index],
		];
		setAnalitosSeleccionados(nuevosAnalitos);
	};

	const removerSeleccionado = (idAnalito) => {
		setAnalitosSeleccionados(
			analitosSeleccionados.filter((a) => a.id_analito !== idAnalito),
		);
	};

	const handleGuardar = () => {
		if (analitosSeleccionados.length === 0) {
			alert("Por favor selecciona al menos un analito");
			return;
		}

		onGuardar(analitosSeleccionados);

		setBusqueda("");
		setAnalitosSeleccionados([]);
	};

	const handleClose = () => {
		setBusqueda("");
		setAnalitosSeleccionados([]);
		onClose();
	};

	return (
		<div className="modal-overlay-agregar-analito">
			<div className="modal-content-agregar-analito modal-content-multiple">
				<div className="modal-header-agregar-analito">
					<h2>Agregar Analitos al Estudio</h2>
					<button className="btn-close-modal" onClick={handleClose}>
						✖
					</button>
				</div>

				<div className="modal-body-agregar-analito">
					<div className="contenedor-doble-columna">
						<div className="columna-disponibles">
							<div className="form-group-agregar">
								<label>Buscar Analitos Disponibles</label>
								<input
									type="text"
									placeholder="Buscar por clave o descripción..."
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value)}
									className="input-buscar-modal"
									autoFocus
								/>
							</div>

							<div className="lista-analitos-seleccion">
								{analitosFiltrados.slice(0, 20).map((analito) => {
									const seleccionado = estaSeleccionado(analito.id_analito);
									const orden = getOrdenSeleccionado(analito.id_analito);

									return (
										<div
											key={analito.id_analito}
											className={`analito-item ${seleccionado ? "seleccionado" : ""}`}
											onClick={() => toggleAnalito(analito)}>
											<div className="analito-item-contenido">
												<div className="analito-item-clave">{analito.clave}</div>
												<div className="analito-item-descripcion">
													{analito.descripcion}
												</div>
											</div>
											{seleccionado && <div className="orden-badge">{orden}</div>}
										</div>
									);
								})}
								{analitosFiltrados.length === 0 && busqueda.length > 0 && (
									<div className="sin-resultados">
										No se encontraron analitos con "{busqueda}"
									</div>
								)}
								{busqueda.length === 0 && (
									<div className="sin-resultados">
										Escribe para buscar analitos...
									</div>
								)}
							</div>
						</div>

						<div className="columna-seleccionados">
							<div className="header-seleccionados">
								<label>
									Analitos Seleccionados ({analitosSeleccionados.length})
								</label>
								{analitosSeleccionados.length > 0 && (
									<button
										className="btn-limpiar-seleccion"
										onClick={() => setAnalitosSeleccionados([])}>
										Limpiar
									</button>
								)}
							</div>

							<div className="lista-seleccionados">
								{analitosSeleccionados.map((analito, index) => (
									<div key={analito.id_analito} className="item-seleccionado">
										<div className="orden-numero">{index + 1}</div>
										<div className="item-info">
											<div className="item-clave">{analito.clave}</div>
											<div className="item-descripcion">{analito.descripcion}</div>
										</div>
										<div className="item-acciones">
											<button
												className="btn-mover"
												onClick={() => moverArriba(index)}
												disabled={index === 0}
												title="Mover arriba">
												▲
											</button>
											<button
												className="btn-mover"
												onClick={() => moverAbajo(index)}
												disabled={index === analitosSeleccionados.length - 1}
												title="Mover abajo">
												▼
											</button>
											<button
												className="btn-remover"
												onClick={() => removerSeleccionado(analito.id_analito)}
												title="Remover">
												✖
											</button>
										</div>
									</div>
								))}
								{analitosSeleccionados.length === 0 && (
									<div className="sin-resultados">
										Selecciona analitos de la lista de la izquierda
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="modal-footer-agregar-analito">
					<button className="btn-cancelar-modal" onClick={handleClose}>
						Cancelar
					</button>
					<button
						className="btn-guardar-modal"
						onClick={handleGuardar}
						disabled={analitosSeleccionados.length === 0}>
						Agregar{" "}
						{analitosSeleccionados.length > 0 && `(${analitosSeleccionados.length})`}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ModalAgregarAnalitoEstudio;
