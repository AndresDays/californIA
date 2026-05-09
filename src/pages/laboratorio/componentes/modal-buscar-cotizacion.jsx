import { useState } from "react";
import { supabase } from "../../../lib/supabase-client";
import "./modal-buscar-cotizacion.css";

const ModalBuscarCotizacion = ({
	isOpen,
	onClose,
	onSeleccionar,
	onNotificar = () => {},
}) => {
	const [numeroCotizacion, setNumeroCotizacion] = useState("");
	const [buscando, setBuscando] = useState(false);

	const buscarYCargar = async () => {
		if (!numeroCotizacion.trim()) {
			onNotificar("Por favor ingrese el número de cotización", "advertencia");
			return;
		}

		setBuscando(true);
		try {
			const { data, error } = await supabase
				.from("cotizaciones")
				.select(
					`
          id_cotizacion,
          numero_cotizacion,
          nombre_paciente,
          estudios,
          total,
          descuento,
          descuento_porcentaje,
          fecha_cotizacion,
          id_cliente,
          condiciones_paciente,
          clientes (
            nombre
          )
        `
				)
				.eq("id_cotizacion", parseInt(numeroCotizacion))
				.single();

			if (error) {
				onNotificar("No se encontró la cotización con ese número", "advertencia");
				return;
			}

			onSeleccionar(data);
			setNumeroCotizacion("");
			onClose();
		} catch (error) {
			console.error("Error al buscar cotización:", error);
			onNotificar("Error al buscar la cotización", "error");
		} finally {
			setBuscando(false);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter") {
			buscarYCargar();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="modal-overlay-simple" onClick={onClose}>
			<div className="modal-content-simple" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header-simple">
					<h2>Buscar Cotización</h2>
					<button className="modal-close-simple" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="modal-body-simple">
					<div className="input-group-simple">
						<label>Número de Cotización</label>
						<input
							type="number"
							placeholder="Ingresa el número de cotización..."
							value={numeroCotizacion}
							onChange={(e) => setNumeroCotizacion(e.target.value)}
							onKeyPress={handleKeyPress}
							className="input-cotizacion-simple"
							autoFocus
						/>
						<small className="input-hint">
							Ingresa solo el número (ej: 5, 123, etc.)
						</small>
					</div>
				</div>

				<div className="modal-footer-simple">
					<button className="btn-modal-simple btn-salir" onClick={onClose}>
						Salir
					</button>
					<button
						className="btn-modal-simple btn-cargar"
						onClick={buscarYCargar}
						disabled={buscando}>
						{buscando ? "Buscando..." : "Cargar Cotización"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ModalBuscarCotizacion;
