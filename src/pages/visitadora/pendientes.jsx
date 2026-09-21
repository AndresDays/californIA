import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import { useCompletarTarea, useTareasSeguimiento } from "../../hooks/use-tareas-seguimiento";
import { cumpleanosProximos, etiquetaTipoTarea } from "../../utils/crm-visitadora";
import { hoyEnMexico, sumarDias } from "../../utils/semanas-visitadora";
import ModalTarea from "./componentes/modal-tarea";
import "./visitadora.css";

const FILTROS = [
	{ id: "hoy", etiqueta: "Hoy y vencidos" },
	{ id: "semana", etiqueta: "Esta semana" },
	{ id: "todos", etiqueta: "Todos" },
	{ id: "hechas", etiqueta: "Hechos" },
];

const Pendientes = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const hoy = hoyEnMexico();
	const [filtro, setFiltro] = useState("hoy");
	const [modalAbierto, setModalAbierto] = useState(false);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const { medicos } = useDirectorioMedicos();
	const { data: tareas = [], isLoading, error } = useTareasSeguimiento({});
	const completarTarea = useCompletarTarea();

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	const visibles = useMemo(() => {
		const finSemana = sumarDias(hoy, 7);
		return tareas
			.filter((tarea) => {
				if (filtro === "hechas") return tarea.estado === "hecha";
				if (tarea.estado !== "pendiente") return false;
				if (filtro === "hoy") return tarea.fecha_objetivo <= hoy;
				if (filtro === "semana") return tarea.fecha_objetivo <= finSemana;
				return true;
			})
			.sort((uno, otro) => uno.fecha_objetivo.localeCompare(otro.fecha_objetivo));
	}, [tareas, filtro, hoy]);

	// Los cumpleaños no se capturan como pendientes: salen solos de la fecha de
	// nacimiento del directorio, con dos semanas de anticipación.
	const cumpleanos = useMemo(() => cumpleanosProximos(medicos, 15, hoy), [medicos, hoy]);

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Pendientes y seguimientos</h1>
					<div className="visitadora-acciones">
						{FILTROS.map((opcion) => (
							<button
								key={opcion.id}
								type="button"
								className={filtro === opcion.id ? "visitadora-boton-primario" : ""}
								onClick={() => setFiltro(opcion.id)}>
								{opcion.etiqueta}
							</button>
						))}
						<button type="button" className="visitadora-boton-primario" onClick={() => setModalAbierto(true)}>
							+ Nuevo pendiente
						</button>
					</div>
				</div>

				{error && <p className="visitadora-error">No se pudieron cargar los pendientes: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}

				{cumpleanos.length > 0 && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">Cumpleaños próximos</p>
						<ul>
							{cumpleanos.map(({ medico, faltan }) => (
								<li key={medico.id_doctor}>
									{faltan === 0 ? "🎂 Hoy cumple años " : `En ${faltan} días · `}
									<button
										type="button"
										className="visitadora-enlace"
										onClick={() => navegar(`/visitadora/medico/${medico.id_doctor}`)}>
										{medico.nombre_completo}
									</button>
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="visitadora-lista">
					{!isLoading && visibles.length === 0 && (
						<p className="visitadora-vacio">No tienes pendientes en este filtro.</p>
					)}
					{visibles.map((tarea) => (
						<div key={tarea.id_tarea} className="visitadora-ficha-medico">
							<span className="visitadora-ficha-nombre">{etiquetaTipoTarea(tarea.tipo)}</span>
							{tarea.medico_nombre &&
								(tarea.id_doctor ? (
									<button
										type="button"
										className="visitadora-enlace"
										onClick={() => navegar(`/visitadora/medico/${tarea.id_doctor}`)}>
										{tarea.medico_nombre}
									</button>
								) : (
									<span className="visitadora-ficha-dato">
										{tarea.medico_nombre}{" "}
										<span className="visitadora-pastilla suelto">sin expediente</span>
									</span>
								))}
							{tarea.descripcion && <span className="visitadora-ficha-dato">{tarea.descripcion}</span>}
							<span className="visitadora-pastillas">
								<span className={`visitadora-pastilla ${tarea.fecha_objetivo < hoy && tarea.estado === "pendiente" ? "vencido" : "pendiente"}`}>
									{tarea.fecha_objetivo < hoy && tarea.estado === "pendiente"
										? `Vencido · ${tarea.fecha_objetivo}`
										: tarea.fecha_objetivo}
								</span>
							</span>
							{tarea.estado === "pendiente" && (
								<button
									type="button"
									className="visitadora-enlace"
									onClick={async () => {
										try {
											await completarTarea.mutateAsync({ idTarea: tarea.id_tarea });
											avisar("Pendiente marcado como hecho.");
										} catch (fallo) {
											avisar(fallo.message || "No se pudo actualizar.", "error");
										}
									}}>
									✓ Marcar como hecho
								</button>
							)}
						</div>
					))}
				</div>

				{modalAbierto && (
					<ModalTarea
						isOpen
						medicos={medicos}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModalAbierto(false)}
						onGuardado={(mensaje) => {
							setModalAbierto(false);
							avisar(mensaje);
						}}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
			</div>
		</PageLayout>
	);
};

export default Pendientes;
