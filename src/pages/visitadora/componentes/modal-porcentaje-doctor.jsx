import { useState } from "react";
import { useFijarPorcentajeDoctor } from "../../../hooks/use-comisiones-medicos";
import "../visitadora.css";

// El porcentaje no se sobrescribe: cada cambio agrega un renglón con su fecha de
// vigencia. Por eso el modal muestra el historial — para que quede claro que los
// meses anteriores se quedan como estaban.
const ModalPorcentajeDoctor = ({
	isOpen,
	doctor,
	periodo,
	historial = [],
	onClose,
	onGuardado,
	onError,
}) => {
	const [porcentaje, setPorcentaje] = useState(() =>
		doctor?.porcentaje == null ? "" : String(doctor.porcentaje),
	);
	// Por omisión aplica desde el primer día del mes que se está viendo, que es
	// lo que la persona espera al capturarlo desde ese mes.
	const [vigenteDesde, setVigenteDesde] = useState(`${periodo}-01`);
	const [notas, setNotas] = useState("");
	const fijarPorcentaje = useFijarPorcentajeDoctor();

	if (!isOpen || !doctor) return null;

	const historialDelDoctor = historial
		.filter((registro) => registro.id_doctor === doctor.idDoctor)
		.sort((a, b) => String(b.vigente_desde).localeCompare(String(a.vigente_desde)));

	const guardar = async (evento) => {
		evento.preventDefault();
		const valor = Number(porcentaje);
		if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
			onError?.("El porcentaje debe estar entre 0 y 100.");
			return;
		}
		try {
			await fijarPorcentaje.mutateAsync({
				idDoctor: doctor.idDoctor,
				porcentaje: valor,
				vigenteDesde,
				notas,
			});
			onGuardado?.(`${doctor.nombre} queda al ${valor} % desde el ${vigenteDesde}.`);
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar el porcentaje.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal">
				<h2>Porcentaje de comisión</h2>
				<p className="visitadora-modal-sujeto">{doctor.nombre}</p>

				<form onSubmit={guardar}>
					<label htmlFor="porcentaje-comision">Porcentaje</label>
					<input
						id="porcentaje-comision"
						type="number"
						min="0"
						max="100"
						step="0.5"
						value={porcentaje}
						onChange={(evento) => setPorcentaje(evento.target.value)}
						required
					/>

					<label htmlFor="vigente-desde">Aplica desde</label>
					<input
						id="vigente-desde"
						type="date"
						value={vigenteDesde}
						onChange={(evento) => setVigenteDesde(evento.target.value)}
						required
					/>

					<label htmlFor="notas-comision">Notas</label>
					<textarea
						id="notas-comision"
						rows={2}
						value={notas}
						placeholder="Ej. 20 % en resonancia magnética de corazón"
						onChange={(evento) => setNotas(evento.target.value)}
					/>

					{historialDelDoctor.length > 0 && (
						<div className="visitadora-historial">
							<span className="visitadora-historial-titulo">Porcentajes anteriores</span>
							<ul>
								{historialDelDoctor.map((registro) => (
									<li key={registro.id_comision}>
										{registro.porcentaje} % desde el {registro.vigente_desde}
										{registro.notas ? ` — ${registro.notas}` : ""}
									</li>
								))}
							</ul>
							<p className="visitadora-nota">
								Los meses ya calculados con estos porcentajes no cambian.
							</p>
						</div>
					)}

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>
							Cancelar
						</button>
						<button
							type="submit"
							className="visitadora-boton-primario"
							disabled={fijarPorcentaje.isPending}>
							{fijarPorcentaje.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalPorcentajeDoctor;
