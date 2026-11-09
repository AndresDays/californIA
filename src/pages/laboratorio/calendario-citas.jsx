import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
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
import MiniCalendarioMes from "./componentes/mini-calendario-mes";
import { supabase } from "../../lib/supabase-client";
import { CITA_ESTADOS } from "../../utils/cita-lifecycle";
import { DURACION_CORTA, DURACION_LARGA, duracionDeCita, moverFechaEstudio } from "../../utils/duracion-cita";
import "./calendario-citas.css";

// `tipoEstudio` es lo que se le pone a la cita nueva abierta desde esa columna:
// el clic en el hueco ya dijo de qué es el estudio, así que el modal no vuelve
// a preguntarlo. "Otros" no nombra ningún tipo y por eso no propone ninguno.
// Laboratorio y Rayos X no llevan columna: no se agendan por horario, y una
// cita de esos estudios que sí se agende cae en "Otros" en vez de perderse.
const TIPOS_ESTUDIO_CALENDARIO = [
	{ id: "ultrasonido", tipoEstudio: "Ultrasonido", label: "Ultrasonido", aliases: ["ultrasonido", "ultrasonidos", "usg", "eco", "ecocardiograma"] },
	{ id: "tac", tipoEstudio: "Tomografia", label: "TAC", aliases: ["tac", "tomografia", "tomografias"] },
	{ id: "resonancia", tipoEstudio: "Resonancia", label: "Resonancia", aliases: ["resonancia", "resonancias", "rm", "irm"] },
	{ id: "mastografia", tipoEstudio: "Mastografia", label: "Mastografia", aliases: ["mastografia", "mastografias", "mamografia", "mamario"] },
	{ id: "densitometria", tipoEstudio: "Densitometria", label: "Densitometria", aliases: ["densitometria", "densitometria", "densi"] },
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

// Dónde va la línea de "ahora": en qué bloque de media hora cae y a qué altura
// dentro de él. Fuera del horario de la agenda no se dibuja.
const posicionHoraActual = (ahora) => {
	const minutos = ahora.getHours() * 60 + ahora.getMinutes();
	const desdeInicio = minutos - (BLOQUES_CALENDARIO[0].hora * 60 + BLOQUES_CALENDARIO[0].minuto);
	const indice = Math.floor(desdeInicio / 30);
	if (desdeInicio < 0 || indice >= BLOQUES_CALENDARIO.length) return null;
	return {
		bloque: BLOQUES_CALENDARIO[indice].valor,
		porcentaje: ((desdeInicio % 30) / 30) * 100,
		etiqueta: ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
	};
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

// En la tarjeta va el estudio concreto: la columna ya dice de qué tipo es, y
// repetir "Lab" en cada tarjeta no decía nada de lo que el paciente viene a
// hacerse.
const obtenerEstudioDeLaTarjeta = (cita) =>
	cita?.tipo_estudio?.trim() || cita?.tipos_estudio?.nombre || "Sin estudio";

const buscarTipoPorTexto = (texto) => {
	const normalizado = normalizar(texto);
	if (!normalizado) return null;
	return (
		TIPOS_ESTUDIO_CALENDARIO.find((tipo) =>
			tipo.aliases.some((alias) => normalizado.includes(alias)),
		) || null
	);
};

// Manda el tipo del catálogo; si la cita no lo trae -o no casa con ninguna
// columna- se resuelve con el estudio escrito, que es lo que pasa con las citas
// agendadas por teléfono.
const obtenerTipoCalendario = (cita) =>
	buscarTipoPorTexto(cita?.tipos_estudio?.nombre) ||
	buscarTipoPorTexto(cita?.tipo_estudio) ||
	TIPOS_ESTUDIO_CALENDARIO[TIPOS_ESTUDIO_CALENDARIO.length - 1];

const obtenerHoraCita = (cita) => {
	const fecha = new Date(cita.fecha_estudio);
	return Number.isNaN(fecha.getTime()) ? null : `${String(fecha.getHours()).padStart(2, "0")}:${fecha.getMinutes() < 30 ? "00" : "30"}`;
};

// La cita cancelada se queda en la agenda tachada, para que se vea qué se
// canceló; sólo ya cancelada se puede eliminar. La realizada se marca como
// hecha. Ninguna de las dos cuenta como cita por atender.
const esCancelada = (cita) => cita?.estado === CITA_ESTADOS.CANCELADA;
const esRealizada = (cita) => cita?.estado === CITA_ESTADOS.REALIZADA;

const obtenerNombrePaciente = (cita) =>
	cita?.pacientes?.nombre || cita?.nombre_paciente || "Sin paciente";

const indiceDeBloque = (valor) => BLOQUES_CALENDARIO.findIndex((bloque) => bloque.valor === valor);

const formatearHoraTarjeta = (cita) =>
	new Date(cita.fecha_estudio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

// A qué hora se desocupa el horario: la de inicio más lo que dura la cita.
const horaFinDeCita = (cita) => {
	const fin = moverFechaEstudio(cita.fecha_estudio, duracionDeCita(cita));
	return fin ? formatearHoraTarjeta({ fecha_estudio: fin }) : "";
};

// Lo que queda de la cita al jalar una de sus orillas `pasos` bloques de media
// hora. La orilla de abajo mueve el final; la de arriba mueve el inicio y deja
// el final donde estaba. La cita no baja de media hora ni pasa de una, y no se
// sale de la rejilla. Devuelve null si el jalón no cambia nada.
const ajusteDeOrilla = (cita, borde, pasos) => {
	const duracion = duracionDeCita(cita);
	const signo = borde === "abajo" ? 1 : -1;
	const nuevaDuracion = Math.min(DURACION_LARGA, Math.max(DURACION_CORTA, duracion + signo * pasos * 30));
	if (nuevaDuracion === duracion) return null;
	const fechaEstudio = borde === "arriba"
		? moverFechaEstudio(cita.fecha_estudio, duracion - nuevaDuracion)
		: cita.fecha_estudio;
	if (!fechaEstudio) return null;
	const inicio = indiceDeBloque(obtenerHoraCita({ fecha_estudio: fechaEstudio }));
	const ultimo = inicio + nuevaDuracion / 30 - 1;
	if (inicio < 0 || ultimo >= BLOQUES_CALENDARIO.length) return null;
	return { fecha_estudio: fechaEstudio, duracion_minutos: nuevaDuracion };
};

const CalendarioCitas = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaLocalHoy());
	const [horarioNuevaCita, setHorarioNuevaCita] = useState(null);
	const [citaActiva, setCitaActiva] = useState(null);
	// "cancelar" o "eliminar" mientras se pide confirmación.
	const [confirmando, setConfirmando] = useState(null);
	const [errorAccion, setErrorAccion] = useState("");
	const [editandoCita, setEditandoCita] = useState(false);
	const [sucursalCalendario, setSucursalCalendario] = useState("");
	const [mesAbierto, setMesAbierto] = useState(false);
	const botonMesRef = useRef(null);
	const cerrarMes = useCallback(() => setMesAbierto(false), []);
	const seleccionarDiaDelMes = (fecha) => {
		setFechaSeleccionada(fecha);
		setMesAbierto(false);
	};

	// La línea de la hora actual va bajando sola: se recalcula cada medio minuto.
	const [ahora, setAhora] = useState(() => new Date());
	useEffect(() => {
		const intervalo = setInterval(() => setAhora(new Date()), 30000);
		return () => clearInterval(intervalo);
	}, []);
	const lineaAhoraRef = useRef(null);
	const hoy = obtenerFechaLocalHoy();
	const lineaAhora = fechaSeleccionada === hoy ? posicionHoraActual(ahora) : null;
	const rolNormalizado = normalizar(empleadoData?.rol);
	const puedeCambiarSucursal = ["admin", "administrador", "radiologo", "desarrollador"].includes(rolNormalizado);
	useEffect(() => setSucursalCalendario(empleadoData?.id_sucursal ? String(empleadoData.id_sucursal) : ""), [empleadoData?.id_sucursal]);
	const { data: sucursales = [] } = useSucursales();
	const { data: citasConsultadas = [], isLoading, error } = useCalendarioCitas(fechaSeleccionada, sucursalCalendario);

	// Mientras se jala la orilla de una cita -y hasta que la base confirma el
	// cambio- la tarjeta se pinta ya con la duración nueva.
	const [ajustes, setAjustes] = useState({});
	const [errorCalendario, setErrorCalendario] = useState("");
	const arrastreRef = useRef(null);
	const citasDelDia = useMemo(
		() => citasConsultadas.map((cita) => (ajustes[cita.id_cita] ? { ...cita, ...ajustes[cita.id_cita] } : cita)),
		[citasConsultadas, ajustes],
	);

	// Buscar al paciente a ojo en una rejilla de 26 renglones por seis columnas
	// no es práctico: el buscador acota la agenda del día al paciente capturado,
	// sin tocar la fecha ni la sucursal consultadas.
	const [busquedaPaciente, setBusquedaPaciente] = useState("");
	const citas = useMemo(() => {
		const termino = normalizar(busquedaPaciente).trim();
		if (!termino) return citasDelDia;
		return citasDelDia.filter((cita) =>
			normalizar(obtenerNombrePaciente(cita)).includes(termino),
		);
	}, [citasDelDia, busquedaPaciente]);

	// Con la agenda filtrada, dar con el renglón entre 26 horarios y seis
	// columnas sigue costando: se dice de una vez a qué hora y en qué estudio
	// quedó cada coincidencia, y su tarjeta se resalta.
	const coincidencias = useMemo(() => {
		if (!busquedaPaciente.trim()) return [];
		return citas
			.map((cita) => ({
				id: cita.id_cita,
				paciente: obtenerNombrePaciente(cita),
				estudio: obtenerTipoCalendario(cita).label,
				hora: new Date(cita.fecha_estudio).toLocaleTimeString("es-MX", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			}))
			.sort((una, otra) => una.hora.localeCompare(otra.hora));
	}, [citas, busquedaPaciente]);

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

	// La cita de una hora ocupa también el bloque de media hora que sigue, y se
	// pinta como una sola celda que abarca los dos renglones: partida en dos por
	// la línea entre medias horas se veía como dos citas. Si dentro del tramo
	// combinado empieza otra cita larga, el tramo crece hasta cubrirla. La
	// cancelada no aparta nada.
	// Por columna: renglón donde empieza cada tramo -> cuántos renglones abarca,
	// y los renglones que quedan dentro de un tramo y ya no se dibujan solos.
	const tramosPorTipo = useMemo(() => {
		const tramos = new Map();
		TIPOS_ESTUDIO_CALENDARIO.forEach((tipo) => {
			const porHora = citasPorTipoYHora.get(tipo.id);
			const finDeRenglon = BLOQUES_CALENDARIO.map((bloque, indice) =>
				(porHora.get(bloque.valor) || []).reduce(
					(fin, cita) => (esCancelada(cita) ? fin : Math.max(fin, indice + duracionDeCita(cita) / 30 - 1)),
					indice,
				),
			);
			const inicios = new Map();
			const cubiertos = new Set();
			for (let indice = 0; indice < BLOQUES_CALENDARIO.length; indice += 1) {
				let fin = finDeRenglon[indice];
				for (let siguiente = indice + 1; siguiente <= fin && siguiente < BLOQUES_CALENDARIO.length; siguiente += 1) {
					fin = Math.max(fin, finDeRenglon[siguiente]);
					cubiertos.add(siguiente);
				}
				fin = Math.min(fin, BLOQUES_CALENDARIO.length - 1);
				inicios.set(indice, fin - indice + 1);
				indice = fin;
			}
			tramos.set(tipo.id, { inicios, cubiertos });
		});
		return tramos;
	}, [citasPorTipoYHora]);

	const guardarAjuste = async (idCita, ajuste) => {
		const { error: errorAjuste } = await supabase
			.from("citas")
			.update({ ...ajuste, updated_at: new Date().toISOString() })
			.eq("id_cita", idCita);
		if (errorAjuste) {
			setErrorCalendario("No se pudo cambiar la duración de la cita. Intenta de nuevo.");
		} else {
			setErrorCalendario("");
			await queryClient.invalidateQueries({ queryKey: ["citas"] });
		}
		setAjustes(({ [idCita]: _, ...resto }) => resto);
	};

	// Jalar la orilla de arriba o de abajo de una cita la alarga a una hora o la
	// regresa a media. Cada media hora de la rejilla que recorre el puntero es un
	// paso; al soltar se guarda.
	const empezarArrastre = (event, cita, borde) => {
		event.preventDefault();
		event.stopPropagation();
		const original = citasConsultadas.find((consultada) => consultada.id_cita === cita.id_cita) || cita;
		const altoBloque = event.currentTarget.closest(".cal-slot")?.offsetHeight || 52;
		arrastreRef.current = { original, borde, inicioY: event.clientY, altoBloque, ajuste: null };

		const mover = (movimiento) => {
			const arrastre = arrastreRef.current;
			if (!arrastre) return;
			const recorrido = Math.round((movimiento.clientY - arrastre.inicioY) / arrastre.altoBloque);
			if (!Number.isFinite(recorrido)) return;
			const pasos = Math.max(-1, Math.min(1, recorrido));
			arrastre.ajuste = ajusteDeOrilla(arrastre.original, arrastre.borde, pasos);
			setAjustes(({ [arrastre.original.id_cita]: _, ...resto }) =>
				arrastre.ajuste ? { ...resto, [arrastre.original.id_cita]: arrastre.ajuste } : resto,
			);
		};
		const soltar = () => {
			window.removeEventListener("pointermove", mover);
			window.removeEventListener("pointerup", soltar);
			window.removeEventListener("pointercancel", soltar);
			const arrastre = arrastreRef.current;
			arrastreRef.current = null;
			if (arrastre?.ajuste) guardarAjuste(arrastre.original.id_cita, arrastre.ajuste);
		};
		window.addEventListener("pointermove", mover);
		window.addEventListener("pointerup", soltar);
		window.addEventListener("pointercancel", soltar);
	};

	const orillaArrastrable = (cita, borde) => (
		<span
			className={`cal-resize cal-resize-${borde}`}
			role="presentation"
			title={borde === "arriba" ? "Arrastra para mover el inicio de la cita" : "Arrastra para mover el final de la cita"}
			data-testid={`cal-resize-${borde}-${cita.id_cita}`}
			onPointerDown={(event) => empezarArrastre(event, cita, borde)}
		/>
	);

	// Al abrir el día de hoy la agenda se coloca en la hora actual, con un par de
	// renglones arriba para ver la cita que acaba de pasar.
	const hayLineaAhora = Boolean(lineaAhora);
	useEffect(() => {
		const celda = lineaAhoraRef.current;
		const tablero = celda?.closest(".cal-board");
		if (!celda || !tablero) return;
		const encabezado = tablero.querySelector(".cal-corner")?.offsetHeight || 0;
		const alturaEnTablero = celda.getBoundingClientRect().top - tablero.getBoundingClientRect().top + tablero.scrollTop;
		tablero.scrollTop = Math.max(0, alturaEnTablero - encabezado - celda.offsetHeight * 2);
	}, [fechaSeleccionada, hayLineaAhora, isLoading]);

	const abrirNuevaCita = (horaInicial, tipoEstudioInicial = "") =>
		setHorarioNuevaCita({ fechaInicial: fechaSeleccionada, horaInicial, tipoEstudioInicial });
	const abrirAcciones = (cita) => {
		setCitaActiva(cita);
		setConfirmando(null);
		setErrorAccion("");
	};
	const cerrarAcciones = () => {
		setCitaActiva(null);
		setConfirmando(null);
		setErrorAccion("");
	};
	const terminarAccion = (errorSupabase) => {
		if (errorSupabase) {
			setErrorAccion("No se pudo guardar el cambio. Intenta de nuevo.");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["citas"] });
		cerrarAcciones();
	};
	const cambiarEstadoCita = async (estado) => {
		if (!citaActiva) return;
		const { error: errorEstado } = await supabase
			.from("citas")
			.update({ estado, updated_at: new Date().toISOString() })
			.eq("id_cita", citaActiva.id_cita);
		terminarAccion(errorEstado);
	};
	const eliminarCita = async () => {
		if (!esCancelada(citaActiva)) return;
		const { error: errorEliminar } = await supabase.from("citas").delete().eq("id_cita", citaActiva.id_cita);
		terminarAccion(errorEliminar);
	};

	const citasVigentes = useMemo(() => citas.filter((cita) => !esCancelada(cita)), [citas]);
	const totalCitas = citasVigentes.length;
	const conteoPorTipo = useMemo(() => {
		const conteos = new Map(TIPOS_ESTUDIO_CALENDARIO.map((tipo) => [tipo.id, 0]));
		citasVigentes.forEach((cita) => {
			const tipo = obtenerTipoCalendario(cita);
			conteos.set(tipo.id, (conteos.get(tipo.id) || 0) + 1);
		});
		return conteos;
	}, [citasVigentes]);

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
							<input
								type="search"
								className="cal-search"
								aria-label="Buscar cita por paciente"
								placeholder="Buscar paciente del dia..."
								value={busquedaPaciente}
								onChange={(event) => setBusquedaPaciente(event.target.value)}
							/>
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
							<div className="cal-fecha-picker">
								<button
									type="button"
									ref={botonMesRef}
									className="cal-fecha-boton"
									aria-label="Elegir fecha en el calendario del mes"
									aria-expanded={mesAbierto}
									onClick={() => setMesAbierto((abierto) => !abierto)}
								>
									<CalendarMonthIcon fontSize="small" />
									<strong>{formatearFechaTitulo(fechaSeleccionada)}</strong>
								</button>
								{mesAbierto && (
									<MiniCalendarioMes
										fechaSeleccionada={fechaSeleccionada}
										hoy={hoy}
										onSeleccionar={seleccionarDiaDelMes}
										onCerrar={cerrarMes}
										anclaRef={botonMesRef}
									/>
								)}
							</div>
						</div>
					</div>

					{!sucursalCalendario && <div className="cal-state error">El usuario no tiene una sucursal asignada.</div>}
					{Boolean(busquedaPaciente.trim()) && citas.length === 0 && !isLoading && (
						<div className="cal-state">No hay citas de ese paciente en el dia seleccionado.</div>
					)}
					{coincidencias.length > 0 && (
						<div className="cal-state found" role="status">
							{coincidencias.length === 1 ? "Cita encontrada: " : `${coincidencias.length} citas encontradas: `}
							{coincidencias
								.map((cita) => `${cita.paciente} a las ${cita.hora} en ${cita.estudio}`)
								.join(" · ")}
						</div>
					)}
					{errorCalendario && <div className="cal-state error" role="alert">{errorCalendario}</div>}
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

								{BLOQUES_CALENDARIO.map((bloque, indiceBloque) => (
									<div className="cal-row-fragment" role="row" key={bloque.valor}>
										<div className="cal-hour" role="rowheader" style={{ gridRow: indiceBloque + 2, gridColumn: 1 }} ref={lineaAhora?.bloque === bloque.valor ? lineaAhoraRef : undefined}>
											{formatearHora(bloque)}
											{lineaAhora?.bloque === bloque.valor && (
												<div className="cal-ahora-linea con-hora" style={{ top: `${lineaAhora.porcentaje}%` }} data-testid="cal-ahora" title={`Hora actual ${lineaAhora.etiqueta}`} />
											)}
										</div>
										{TIPOS_ESTUDIO_CALENDARIO.map((tipo, indiceTipo) => {
											const tramo = tramosPorTipo.get(tipo.id);
											if (tramo.cubiertos.has(indiceBloque)) return null;
											const renglones = tramo.inicios.get(indiceBloque) || 1;
											const bloquesDelTramo = BLOQUES_CALENDARIO.slice(indiceBloque, indiceBloque + renglones);
											const citasHora = bloquesDelTramo.flatMap((enTramo) => citasPorTipoYHora.get(tipo.id)?.get(enTramo.valor) || []);
											// La línea de "ahora" cae en la altura proporcional del tramo.
											const renglonAhora = bloquesDelTramo.findIndex((enTramo) => enTramo.valor === lineaAhora?.bloque);
											const clasesTarjeta = (cita) => `cal-card tipo-${tipo.id}${coincidencias.some((encontrada) => encontrada.id === cita.id_cita) ? " encontrada" : ""}${esCancelada(cita) ? " cancelada" : ""}${esRealizada(cita) ? " realizada" : ""}${ajustes[cita.id_cita] ? " ajustando" : ""}`;
											return (
												<div
													key={`${tipo.id}-${bloque.valor}`}
													className={`cal-slot${renglones > 1 ? " combinada" : ""}`}
													role="cell"
													aria-rowspan={renglones > 1 ? renglones : undefined}
													data-testid={`cal-slot-${tipo.id}-${bloque.valor}`}
													style={{ gridRow: `${indiceBloque + 2} / span ${renglones}`, gridColumn: indiceTipo + 2 }}
												>
													{renglonAhora >= 0 && (
														<div className="cal-ahora-linea" style={{ top: `${((renglonAhora + lineaAhora.porcentaje / 100) / renglones) * 100}%` }} aria-hidden="true" />
													)}
													{citasHora.map((cita) => {
														const larga = duracionDeCita(cita) > DURACION_CORTA;
														return (
															<div className={`cal-card-wrap tipo-${tipo.id}${larga ? " larga" : ""}`} key={cita.id_cita}>
																{!esCancelada(cita) && orillaArrastrable(cita, "arriba")}
																<button type="button" className={clasesTarjeta(cita)} aria-label={`Abrir acciones de cita de ${obtenerNombrePaciente(cita)}`} onClick={() => abrirAcciones(cita)}>
																	<div className="cal-card-time">
																		{formatearHoraTarjeta(cita)}
																		{larga && ` – ${horaFinDeCita(cita)}`}
																	</div>
																	<strong>{obtenerEstudioDeLaTarjeta(cita)}</strong>
																	<span>{obtenerNombrePaciente(cita)}</span>
																	{esRealizada(cita) ? (
																		<small className="cal-card-realizada">✓ Realizada</small>
																	) : (
																		cita.estado && <small>{cita.estado}</small>
																	)}
																</button>
																{!esCancelada(cita) && orillaArrastrable(cita, "abajo")}
															</div>
														);
													})}
													{/* Un horario con sólo citas canceladas sigue libre; el tramo
													    combinado de una cita larga, no. */}
													{renglones === 1 && citasHora.every(esCancelada) && (
														<button type="button" className="cal-empty-slot" aria-label={`Crear cita de ${tipo.label} el ${fechaSeleccionada} a las ${bloque.valor}`} onClick={() => abrirNuevaCita(bloque.valor, tipo.tipoEstudio)} />
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
			<NuevaCitaModal isOpen={Boolean(horarioNuevaCita)} fechaInicial={horarioNuevaCita?.fechaInicial} horaInicial={horarioNuevaCita?.horaInicial} tipoEstudioInicial={horarioNuevaCita?.tipoEstudioInicial} onClose={() => setHorarioNuevaCita(null)} onCitaCreada={() => setHorarioNuevaCita(null)} />
			{citaActiva && (
				<div className="modal-overlay" onClick={cerrarAcciones}>
					<div className="modal-content-cita cal-action-modal" role="dialog" aria-label="Acciones de cita" onClick={(event) => event.stopPropagation()}>
						<div className="modal-header-cita">
							<h2 className="modal-title-cita">Acciones de cita</h2>
							<button className="modal-close-btn" onClick={cerrarAcciones}>✕</button>
						</div>
						<div className="cal-action-body">
							{errorAccion && <p className="cal-action-error" role="alert">{errorAccion}</p>}
							{confirmando === "cancelar" && (
								<>
									<p className="cal-cancel-question">¿Seguro que deseas cancelar esta cita? Quedará tachada en la agenda.</p>
									<div className="modal-footer-cita">
										<button type="button" className="btn-cancel-cita" onClick={() => setConfirmando(null)}>Volver</button>
										<button type="button" className="btn-submit-cita" onClick={() => cambiarEstadoCita(CITA_ESTADOS.CANCELADA)}>Confirmar cancelación</button>
									</div>
								</>
							)}
							{confirmando === "eliminar" && (
								<>
									<p className="cal-cancel-question">¿Eliminar esta cita de la agenda? Ya no se podrá recuperar.</p>
									<div className="modal-footer-cita">
										<button type="button" className="btn-cancel-cita" onClick={() => setConfirmando(null)}>Volver</button>
										<button type="button" className="btn-submit-cita cal-btn-eliminar" onClick={eliminarCita}>Confirmar eliminación</button>
									</div>
								</>
							)}
							{!confirmando && esCancelada(citaActiva) && (
								<div className="modal-footer-cita">
									<button type="button" className="btn-cancel-cita" onClick={() => cambiarEstadoCita(CITA_ESTADOS.PENDIENTE)}>Restaurar cita</button>
									<button type="button" className="btn-submit-cita cal-btn-eliminar" onClick={() => setConfirmando("eliminar")}>Eliminar</button>
								</div>
							)}
							{!confirmando && esRealizada(citaActiva) && (
								<div className="modal-footer-cita">
									<button type="button" className="btn-cancel-cita" onClick={() => cambiarEstadoCita(CITA_ESTADOS.PENDIENTE)}>Desmarcar realizada</button>
									<button type="button" className="btn-cancel-cita" onClick={() => setEditandoCita(true)}>Editar cita</button>
								</div>
							)}
							{!confirmando && !esCancelada(citaActiva) && !esRealizada(citaActiva) && (
								<div className="modal-footer-cita">
									<button type="button" className="btn-cancel-cita" onClick={() => setEditandoCita(true)}>Editar cita</button>
									<button type="button" className="btn-cancel-cita" onClick={() => setConfirmando("cancelar")}>Cancelar cita</button>
									<button type="button" className="btn-cancel-cita cal-btn-realizada" onClick={() => cambiarEstadoCita(CITA_ESTADOS.REALIZADA)}>Realizada</button>
									<button type="button" className="btn-submit-cita" onClick={() => navigate(`/nuevo-paciente?citaId=${citaActiva.id_cita}`, { state: { citaId: citaActiva.id_cita } })}>Pasar a estudio</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			<EditarCitaModal isOpen={editandoCita} cita={citaActiva} onClose={() => setEditandoCita(false)} onCitaActualizada={() => { queryClient.invalidateQueries({ queryKey: ["citas"] }); setEditandoCita(false); setCitaActiva(null); }} />
		</PageLayout>
	);
};

export default CalendarioCitas;
