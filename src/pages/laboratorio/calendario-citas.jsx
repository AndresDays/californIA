import { useMemo, useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import IconButton from "@mui/material/IconButton";
import calendarioIcono from "../../assets/calendarioIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { useCalendarioCitas } from "../../hooks/use-citas";
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

const HORAS_CALENDARIO = Array.from({ length: 13 }, (_, index) => index + 7);

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

const formatearHora = (hora) => {
	const periodo = hora >= 12 ? "PM" : "AM";
	const hora12 = hora % 12 || 12;
	return `${hora12} ${periodo}`;
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
	return Number.isNaN(fecha.getTime()) ? null : fecha.getHours();
};

const obtenerNombrePaciente = (cita) =>
	cita?.pacientes?.nombre || cita?.nombre_paciente || "Sin paciente";

const getPrimerNombre = (nombreCompleto, user) =>
	nombreCompleto || user?.email?.split("@")[0] || "Usuario";

const formatRol = (rol) => {
	const roles = {
		admin: "Administrador",
		administrador: "Administrador",
		radiologo: "Radiologo",
		doctor: "Medico",
		medico: "Medico",
		tecnico_radiologia: "Tecnico en Radiologia",
		tecnico: "Tecnico",
		quimico: "Quimico",
		recepcionista: "Recepcionista",
		desarrollador: "Desarrollador",
	};
	return roles[rol] || rol || "Usuario";
};

const CalendarioCitas = () => {
	const { user, empleadoData } = useAuth();
	const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaLocalHoy());
	const { data: citas = [], isLoading, error } = useCalendarioCitas(fechaSeleccionada);

	const citasPorTipoYHora = useMemo(() => {
		const grupos = new Map();

		TIPOS_ESTUDIO_CALENDARIO.forEach((tipo) => {
			grupos.set(tipo.id, new Map());
			HORAS_CALENDARIO.forEach((hora) => grupos.get(tipo.id).set(hora, []));
		});

		citas.forEach((cita) => {
			const hora = obtenerHoraCita(cita);
			if (hora === null) return;

			const tipo = obtenerTipoCalendario(cita);
			const horaVisible = HORAS_CALENDARIO.includes(hora) ? hora : HORAS_CALENDARIO[0];
			grupos.get(tipo.id).get(horaVisible).push(cita);
		});

		return grupos;
	}, [citas]);

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
			getPrimerNombre={(nombre) => getPrimerNombre(nombre, user)}
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

								{HORAS_CALENDARIO.map((hora) => (
									<div className="cal-row-fragment" role="row" key={hora}>
										<div className="cal-hour" role="rowheader">{formatearHora(hora)}</div>
										{TIPOS_ESTUDIO_CALENDARIO.map((tipo) => {
											const citasHora = citasPorTipoYHora.get(tipo.id)?.get(hora) || [];
											return (
												<div key={`${tipo.id}-${hora}`} className="cal-slot" role="cell">
													{citasHora.length === 0 ? (
														<span className="cal-empty-slot" aria-hidden="true" />
													) : (
														citasHora.map((cita) => (
															<article className={`cal-card tipo-${tipo.id}`} key={cita.id_cita}>
																<div className="cal-card-time">
																	{new Date(cita.fecha_estudio).toLocaleTimeString("es-MX", {
																		hour: "2-digit",
																		minute: "2-digit",
																	})}
																</div>
																<strong>{obtenerTextoEstudio(cita)}</strong>
																<span>{obtenerNombrePaciente(cita)}</span>
																{cita.estado && <small>{cita.estado}</small>}
															</article>
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
		</PageLayout>
	);
};

export default CalendarioCitas;
