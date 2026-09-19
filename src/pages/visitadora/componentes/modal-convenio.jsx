import { useState } from "react";
import { useConvertirProspecto } from "../../../hooks/use-directorio-medicos";
import { TIPOS_CONVENIO } from "../../../utils/crm-visitadora";
import { hoyEnMexico } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

// Abrir un convenio cierra el anterior y deja al médico como activo: es el
// mismo movimiento cuando se concreta un prospecto y cuando se le cambian las
// condiciones a uno de siempre.
const ModalConvenio = ({ isOpen, medico, idEmpleado, onClose, onGuardado, onError }) => {
	const [campos, setCampos] = useState(() => ({
		tipo: medico?.convenio?.tipo ?? "mixto",
		condiciones: medico?.convenio?.condiciones ?? "",
		usa_ordenes_clinica: medico?.convenio?.usa_ordenes_clinica ?? false,
		maneja_puntos: medico?.convenio?.maneja_puntos ?? false,
		vigente_desde: hoyEnMexico(),
	}));
	const convertir = useConvertirProspecto();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({
			...previos,
			[campo]: evento.target.type === "checkbox" ? evento.target.checked : evento.target.value,
		}));

	const guardar = async (evento) => {
		evento.preventDefault();
		try {
			await convertir.mutateAsync({
				idDoctor: medico.id_doctor,
				idEmpleado,
				convenio: {
					tipo: campos.tipo,
					condiciones: campos.condiciones || null,
					usa_ordenes_clinica: campos.usa_ordenes_clinica,
					maneja_puntos: campos.maneja_puntos,
					vigente_desde: campos.vigente_desde,
				},
			});
			onGuardado?.("Convenio registrado. El médico quedó como activo.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar el convenio.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal">
				<h2>Convenio</h2>
				<p className="visitadora-modal-sujeto">{medico?.nombre_completo}</p>
				<form onSubmit={guardar}>
					<label htmlFor="convenio-tipo">Tipo de convenio</label>
					<select id="convenio-tipo" value={campos.tipo} onChange={cambiar("tipo")}>
						{TIPOS_CONVENIO.map((tipo) => (
							<option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>
						))}
					</select>

					<label htmlFor="convenio-condiciones">Beneficios o condiciones</label>
					<textarea
						id="convenio-condiciones"
						rows={4}
						value={campos.condiciones}
						onChange={cambiar("condiciones")}
					/>

					<label htmlFor="convenio-desde">Vigente desde</label>
					<input
						id="convenio-desde"
						type="date"
						value={campos.vigente_desde}
						onChange={cambiar("vigente_desde")}
						required
					/>

					<label htmlFor="convenio-ordenes">
						<input
							id="convenio-ordenes"
							type="checkbox"
							checked={campos.usa_ordenes_clinica}
							onChange={cambiar("usa_ordenes_clinica")}
						/>{" "}
						Usa órdenes de Clínica California
					</label>
					<label htmlFor="convenio-puntos">
						<input
							id="convenio-puntos"
							type="checkbox"
							checked={campos.maneja_puntos}
							onChange={cambiar("maneja_puntos")}
						/>{" "}
						Maneja puntos
					</label>

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={convertir.isPending}>
							{convertir.isPending ? "Guardando…" : "Guardar convenio"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalConvenio;
