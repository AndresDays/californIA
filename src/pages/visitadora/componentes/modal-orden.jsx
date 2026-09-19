import { useState } from "react";
import { useGuardarEntregaOrdenes } from "../../../hooks/use-ordenes-medicas";
import { hoyEnMexico, sumarDias } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

const ModalOrden = ({ isOpen, medico, medicos = [], idEmpleado, onClose, onGuardado, onError }) => {
	const [campos, setCampos] = useState(() => ({
		id_doctor: medico?.id_doctor ?? "",
		fecha_entrega: hoyEnMexico(),
		cantidad: "25",
		tipo_orden: "",
		folios: "",
		// Un talonario suele durar un par de meses: la fecha se propone y se
		// ajusta, para que el recordatorio de renovación exista desde el inicio.
		fecha_renovacion: sumarDias(hoyEnMexico(), 60),
		observaciones: "",
	}));
	const guardarEntrega = useGuardarEntregaOrdenes();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const guardar = async (evento) => {
		evento.preventDefault();
		const idDoctor = medico?.id_doctor ?? campos.id_doctor;
		if (!idDoctor) {
			onError?.("Elige a qué médico se le entregaron las órdenes.");
			return;
		}
		try {
			await guardarEntrega.mutateAsync({
				id_doctor: Number(idDoctor),
				fecha_entrega: campos.fecha_entrega,
				cantidad: Number(campos.cantidad) || 0,
				tipo_orden: campos.tipo_orden || null,
				folios: campos.folios || null,
				fecha_renovacion: campos.fecha_renovacion || null,
				observaciones: campos.observaciones || null,
				id_empleado: idEmpleado ?? null,
			});
			onGuardado?.("Entrega registrada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo registrar la entrega.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal">
				<h2>Entrega de órdenes</h2>
				{medico && <p className="visitadora-modal-sujeto">{medico.nombre_completo}</p>}
				<form onSubmit={guardar}>
					{!medico && (
						<>
							<label htmlFor="orden-medico">Médico</label>
							<select id="orden-medico" value={campos.id_doctor} onChange={cambiar("id_doctor")} required>
								<option value="">Elige un médico</option>
								{medicos.map((candidato) => (
									<option key={candidato.id_doctor} value={candidato.id_doctor}>
										{candidato.nombre_completo}
									</option>
								))}
							</select>
						</>
					)}

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="orden-fecha">Fecha de entrega</label>
							<input id="orden-fecha" type="date" value={campos.fecha_entrega} onChange={cambiar("fecha_entrega")} required />
						</div>
						<div>
							<label htmlFor="orden-cantidad">Cantidad</label>
							<input id="orden-cantidad" type="number" min="0" value={campos.cantidad} onChange={cambiar("cantidad")} />
						</div>
						<div>
							<label htmlFor="orden-tipo">Tipo de orden</label>
							<input id="orden-tipo" type="text" value={campos.tipo_orden} onChange={cambiar("tipo_orden")} />
						</div>
						<div>
							<label htmlFor="orden-renovacion">Renovar el</label>
							<input id="orden-renovacion" type="date" value={campos.fecha_renovacion} onChange={cambiar("fecha_renovacion")} />
						</div>
					</div>

					<label htmlFor="orden-folios">Folios</label>
					<input id="orden-folios" type="text" value={campos.folios} onChange={cambiar("folios")} />

					<label htmlFor="orden-observaciones">Observaciones</label>
					<textarea id="orden-observaciones" rows={2} value={campos.observaciones} onChange={cambiar("observaciones")} />

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={guardarEntrega.isPending}>
							{guardarEntrega.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalOrden;
