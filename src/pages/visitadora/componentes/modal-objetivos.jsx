import { useState } from "react";
import {
	useEliminarObjetivoPeriodo,
	useGuardarObjetivoPeriodo,
} from "../../../hooks/use-objetivos-periodo";
import { lunesDeLaSemana, sumarDias } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

// Los objetivos de la semana se escribían uno por uno en cada cita. Aquí se
// ponen una vez, para un día o para el rango completo, y las visitas que se
// programen en esos días nacen con ellos.
const ModalObjetivos = ({ isOpen, objetivos = [], rango, idEmpleado, onClose, onAviso, onError }) => {
	const [campos, setCampos] = useState(() => ({
		alcance: "semana",
		desde: rango?.desde ?? "",
		hasta: rango?.hasta ?? "",
		texto: "",
	}));
	const guardar = useGuardarObjetivoPeriodo();
	const eliminar = useEliminarObjetivoPeriodo();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	// Elegir "día" deja un solo día; "semana", de lunes a domingo del día que se
	// tenga puesto. Siempre se puede ajustar a mano después.
	const cambiarAlcance = (evento) => {
		const alcance = evento.target.value;
		setCampos((previos) => {
			if (alcance === "dia") return { ...previos, alcance, hasta: previos.desde };
			const lunes = lunesDeLaSemana(previos.desde || rango?.desde);
			return { ...previos, alcance, desde: lunes, hasta: sumarDias(lunes, 6) };
		});
	};

	const agregar = async (evento) => {
		evento.preventDefault();
		if (!campos.texto.trim() || !campos.desde || !campos.hasta) {
			onError?.("El objetivo necesita texto y fechas.");
			return;
		}
		try {
			await guardar.mutateAsync({
				desde: campos.desde,
				hasta: campos.alcance === "dia" ? campos.desde : campos.hasta,
				texto: campos.texto.trim(),
				id_empleado: idEmpleado ?? null,
			});
			setCampos((previos) => ({ ...previos, texto: "" }));
			onAviso?.("Objetivo agregado.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar el objetivo.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal ancho">
				<h2>Objetivos del periodo</h2>
				<p className="visitadora-modal-sujeto">
					Las visitas que programes en estos días salen con estos objetivos ya puestos.
				</p>

				<form onSubmit={agregar}>
					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="objetivo-alcance">Aplica a</label>
							<select id="objetivo-alcance" value={campos.alcance} onChange={cambiarAlcance}>
								<option value="dia">Un día</option>
								<option value="semana">Una semana</option>
							</select>
						</div>
						<div>
							<label htmlFor="objetivo-desde">Desde</label>
							<input id="objetivo-desde" type="date" value={campos.desde} onChange={cambiar("desde")} />
						</div>
						{campos.alcance === "semana" && (
							<div>
								<label htmlFor="objetivo-hasta">Hasta</label>
								<input id="objetivo-hasta" type="date" value={campos.hasta} onChange={cambiar("hasta")} />
							</div>
						)}
					</div>

					<label htmlFor="objetivo-texto">Objetivo</label>
					<textarea
						id="objetivo-texto"
						rows={3}
						placeholder="Levantar pedido de órdenes, presentar el paquete de laboratorio…"
						value={campos.texto}
						onChange={cambiar("texto")}
					/>

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cerrar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={guardar.isPending}>
							{guardar.isPending ? "Guardando…" : "Agregar objetivo"}
						</button>
					</div>
				</form>

				<div className="visitadora-historial">
					<p className="visitadora-historial-titulo">En este periodo</p>
					{objetivos.length === 0 ? (
						<p className="visitadora-ficha-dato">Todavía no hay objetivos para estos días.</p>
					) : (
						<ul>
							{objetivos.map((objetivo) => (
								<li key={objetivo.id_objetivo}>
									<strong>
										{objetivo.desde === objetivo.hasta
											? objetivo.desde
											: `${objetivo.desde} al ${objetivo.hasta}`}
									</strong>
									: {objetivo.texto}{" "}
									<button
										type="button"
										className="visitadora-enlace peligro"
										onClick={async () => {
											try {
												await eliminar.mutateAsync(objetivo.id_objetivo);
												onAviso?.("Objetivo eliminado.");
											} catch (fallo) {
												onError?.(fallo.message || "No se pudo eliminar.");
											}
										}}>
										Quitar
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};

export default ModalObjetivos;
