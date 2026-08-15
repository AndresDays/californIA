import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import IconButton from "@mui/material/IconButton";
import { useQueryClient } from "@tanstack/react-query";
import calendarioIcono from "../../assets/calendarioIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useCalendarioCitas } from "../../hooks/use-citas";
import { useSucursales } from "../../hooks/use-sucursales";
import NuevaCitaModal from "../../components/nueva-cita-modal";
import EditarCitaModal from "../../components/editar-cita-modal";
import { supabase } from "../../lib/supabase-client";
import "./calendario-citas.css";

const TIPOS_ESTUDIO_CALENDARIO = [
	{ id: "lab", label: "Lab", aliases: ["lab", "laboratorio", "biometria", "quimica", "perfil", "glucosa"] },
	{ id: "ultrasonido", label: "Ultrasonido", aliases: ["ultrasonido", "ultrasonidos", "usg", "eco", "ecocardiograma"] },
	{ id: "rayos-x", label: "Rayos X", aliases: ["rayos x", "rayos-x", "rx", "radiografia", "radiografias"] },
	{ id: "tac", label: "TAC", aliases: ["tac", "tomografia", "tomografias"] },
	{ id: "resonancia", label: "Resonancia", aliases: ["resonancia", "resonancias", "rm", "irm"] },
	{ id: "mastografia", label: "Mastografia", aliases: ["mastografia", "mastografias", "mamografia", "mamario"] },
	{ id: "densitometria", label: "Densitometria", aliases: ["densitometria", "densitometria", "densi"] },
	{ id: "otros", label: "Otros", aliases: [] },
];

const BLOQUES_CALENDARIO = Array.from({ length: 26 }, (_, indice) => {
	const total = 420 + indice * 30;
	const hora = Math.floor(total / 60);
	const minuto = total % 60;
	return { hora, minuto, valor: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}` };
});

const obtenerFechaLocalHoy = () => {
	const hoy = new Date();
	return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
};

const normalizar = (texto = "") =>
	String(texto)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

const sumarDias = (fecha, dias) => {
	const siguiente = new Date(`${fecha}T12:00:00`);
	siguiente.setDate(siguiente.getDate() + dias);
	return siguiente.toISOString().split("T")[0];
};

const formatearFechaTitulo = (fecha) =>
	new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})
		.replace(/ de /g, " ")
		.replace(/^(\d+\s)(\p{L})/u, (_, dia, letra) => `${dia}${letra.toUpperCase()}`)
		.replace(/ (\d{4})$/, ", $1");

const formatearHora = ({ hora, minuto }) => {
	const periodo = hora >= 12 ? "PM" : "AM";
	return `${hora % 12 || 12}:${String(minuto).padStart(2, "0")} ${periodo}`;
};

const obtenerTextoEstudio = (cita) =>
	cita?.tipos_estudio?.nombre || cita?.tipo_estudio || "Sin estudio";

const obtenerTipoCalendario = (cita) => {
	const texto = normalizar(obtenerTextoEstudio(cita));
	return (
		TIPOS_ESTUDIO_CALENDARIO.find((tipo) =>
			tipo.aliases.some((alias) => texto.includes(alias)),
		) || TIPOS_ESTUDIO_CALENDARIO[TIPOS_ESTUDIO_CALENDARIO.length - 1]
	);
};

const obtenerHoraCita = (cita) => {
	const fecha = new Date(cita.fecha_estudio);
	return Number.isNaN(fecha.getTime()) ? null : `${String(fecha.getHours()).padStart(2, "0")}:${fecha.getMinutes() < 30 ? "00" : "30"}`;
};

const obtenerNombrePaciente = (cita) =>
	cita?.pacientes?.nombre || cita?.nombre_paciente || "Sin paciente";

const CalendarioCitas = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaLocalHoy());
	const [horarioNuevaCita, setHorarioNuevaCita] = useState(null);
	const [citaActiva, setCitaActiva] = useState(null);
	const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
	const [editandoCita, setEditandoCita] = useState(false);
	const [sucursalCalendario, setSucursalCalendario] = useState("");
	const rolNormalizado = normalizar(empleadoData?.rol);
	const puedeCambiarSucursal = ["admin", "administrador", "radiologo", "desarrollador"].includes(rolNormalizado);
	useEffect(() => setSucursalCalendario(empleadoData?.id_sucursal ? String(empleadoData.id_sucursal) : ""), [empleadoData?.id_sucursal]);
	const { data: sucursales = [] } = useSucursales();
	const { data: citas = [], isLoading, error } = useCalendarioCitas(fechaSeleccionada, sucursalCalendario);

	const citasPorTipoYHora = useMemo(() => {
		const grupos = new Map();

		TIPOS_ESTUDIO_CALENDARIO.forEach((tipo) => {
			grupos.set(tipo.id, new Map());
			BLOQUES_CALENDARIO.forEach((bloque) => grupos.get(tipo.id).set(bloque.valor, []));
		});

		citas.forEach((cita) => {
			const hora = obtenerHoraCita(cita);
			if (hora === null) return;

			const tipo = obtenerTipoCalendario(cita);
			if (grupos.get(tipo.id).has(hora)) grupos.get(tipo.id).get(hora).push(cita);
		});

		return grupos;
	}, [citas]);

	const abrirNuevaCita = (horaInicial) => setHorarioNuevaCita({ fechaInicial: fechaSeleccionada, horaInicial });
	const cancelarCita = async () => {
		if (!citaActiva) return;
		const { error: errorCancelacion } = await supabase.from("citas").update({ estado: "cancelada" }).eq("id_cita", citaActiva.id_cita);
		if (!errorCancelacion) {
			queryClient.invalidateQueries({ queryKey: ["citas"] });
			setCitaActiva(null);
			setConfirmandoCancelacion(false);
		}
	};

	const totalCitas = citas.length;
	const conteoPorTipo = useMemo(() => {
		const conteos = new Map(TIPOS_ESTUDIO_CALENDARIO.map((tipo) => [tipo.id, 0]));
		citas.forEach((cita) => {
			const tipo = obtenerTipoCalendario(cita);
			conteos.set(tipo.id, (conteos.get(tipo.id) || 0) + 1);
		});
		return conteos;
	}, [citas]);

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}
		>
			<main className="cal-page">
				<section className="cal-shell">
					<div className="cal-toolbar">
						<div className="cal-title-block">
							<img src={calendarioIcono} alt="" className="cal-title-icon" />
							<div>
								<h1>Calendario de citas</h1>
								<p>{totalCitas} citas programadas por hora y tipo de estudio</p>
							</div>
						</div>

						<div className="cal-controls" aria-label="Controles de calendario">
							{puedeCambiarSucursal && <select className="cal-branch-select" aria-label="Sucursal del calendario" value={sucursalCalendario} onChange={(event) => setSucursalCalendario(event.target.value)}><option value="">Selecciona sucursal</option>{sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre}</option>)}</select>}
							<IconButton
								className="cal-icon-button today"
								aria-label="Hoy"
								onClick={() => setFechaSeleccionada(obtenerFechaLocalHoy())}
								size="small"
							>
								<TodayIcon fontSize="small" />
							</IconButton>
							<IconButton
								className="cal-icon-button"
								aria-label="Dia anterior"
								onClick={() => setFechaSeleccionada((fecha) => sumarDias(fecha, -1))}
								size="small"
							>
								<ChevronLeftIcon fontSize="small" />
							</IconButton>
							<IconButton
								className="cal-icon-button"
								aria-label="Dia siguiente"
								onClick={() => setFechaSeleccionada((fecha) => sumarDias(fecha, 1))}
								size="small"
							>
								<ChevronRightIcon fontSize="small" />
							</IconButton>
							<strong>{formatearFechaTitulo(fechaSeleccionada)}</strong>
						</div>
					</div>

					{!sucursalCalendario && <div className="cal-state error">El usuario no tiene una sucursal asignada.</div>}
					{isLoading && <div className="cal-state">Cargando citas...</div>}
					{error && <div className="cal-state error">No se pudieron cargar las citas.</div>}

					{!isLoading && !error && (
						<div className="cal-board" role="table" aria-label="Agenda diaria por horas">
							<div className="cal-grid">
								<div className="cal-corner" role="columnheader" aria-label="Horas" />
								{TIPOS_ESTUDIO_CALENDARIO.map((tipo) => (
									<div
										key={tipo.id}
										className={`cal-study-header tipo-${tipo.id}`}
										role="columnheader"
										data-testid={`cal-column-${tipo.id}`}
									>
										<span>{tipo.label}</span>
										<small>{conteoPorTipo.get(tipo.id) || 0} citas</small>
									</div>
								))}

								{BLOQUES_CALENDARIO.map((bloque) => (
									<div className="cal-row-fragment" role="row" key={bloque.valor}>
										<div className="cal-hour" role="rowheader">{formatearHora(bloque)}</div>
										{TIPOS_ESTUDIO_CALENDARIO.map((tipo) => {
											const citasHora = citasPorTipoYHora.get(tipo.id)?.get(bloque.valor) || [];
											return (
												<div key={`${tipo.id}-${bloque.valor}`} className="cal-slot" role="cell">
													{citasHora.length === 0 ? (
														<button type="button" className="cal-empty-slot" aria-label={`Crear cita de ${tipo.label} el ${fechaSeleccionada} a las ${bloque.valor}`} onClick={() => abrirNuevaCita(bloque.valor)} />
													) : (
														citasHora.map((cita) => (
															<button type="button" className={`cal-card tipo-${tipo.id}`} key={cita.id_cita} aria-label={`Abrir acciones de cita de ${obtenerNombrePaciente(cita)}`} onClick={() => setCitaActiva(cita)}>
																<div className="cal-card-time">
																	{new Date(cita.fecha_estudio).toLocaleTimeString("es-MX", {
																		hour: "2-digit",
																		minute: "2-digit",
																	})}
																</div>
																<strong>{obtenerTextoEstudio(cita)}</strong>
																<span>{obtenerNombrePaciente(cita)}</span>
																{cita.estado && <small>{cita.estado}</small>}
															</button>
														))
													)}
												</div>
											);
										})}
									</div>
								))}
							</div>
						</div>
					)}
				</section>
			</main>
			<NuevaCitaModal isOpen={Boolean(horarioNuevaCita)} fechaInicial={horarioNuevaCita?.fechaInicial} horaInicial={horarioNuevaCita?.horaInicial} onClose={() => setHorarioNuevaCita(null)} onCitaCreada={() => setHorarioNuevaCita(null)} />
			{citaActiva && <div className="modal-overlay" onClick={() => setCitaActiva(null)}><div className="modal-content-cita cal-action-modal" role="dialog" aria-label="Acciones de cita" onClick={(event) => event.stopPropagation()}><div className="modal-header-cita"><h2 className="modal-title-cita">Acciones de cita</h2><button className="modal-close-btn" onClick={() => setCitaActiva(null)}>✕</button></div><div className="cal-action-body">{confirmandoCancelacion ? <><p className="cal-cancel-question">¿Seguro que deseas cancelar esta cita?</p><div className="modal-footer-cita"><button type="button" className="btn-cancel-cita" onClick={() => setConfirmandoCancelacion(false)}>Volver</button><button type="button" className="btn-submit-cita" onClick={cancelarCita}>Confirmar cancelación</button></div></> : <div className="modal-footer-cita"><button type="button" className="btn-cancel-cita" onClick={() => setEditandoCita(true)}>Editar cita</button><button type="button" className="btn-cancel-cita" onClick={() => setConfirmandoCancelacion(true)}>Cancelar cita</button><button type="button" className="btn-submit-cita" onClick={() => navigate(`/nuevo-paciente?citaId=${citaActiva.id_cita}`, { state: { citaId: citaActiva.id_cita } })}>Pasar a estudio</button></div>}</div></div></div>}
			<EditarCitaModal isOpen={editandoCita} cita={citaActiva} onClose={() => setEditandoCita(false)} onCitaActualizada={() => { queryClient.invalidateQueries({ queryKey: ["citas"] }); setEditandoCita(false); setCitaActiva(null); }} />
		</PageLayout>
	);
};

export default CalendarioCitas;
