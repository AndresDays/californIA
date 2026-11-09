import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase-client";
import {
	obtenerNombreTurno,
	obtenerRangoDiaLocalISO,
	TURNO_ESTADOS,
} from "../utils/turnos-pacientes";
import { activarSonido, sonidoBloqueado, tocarTimbreTurno } from "../utils/timbre-turno";
import logoCalifornIA from "../assets/logoCalifornIA.png";
import {
	SEGUNDOS_POR_PROMOCION,
	SEGUNDOS_TURNO_EN_PANTALLA,
	fechaLocalIso,
	promocionesVisibles,
	urlPromocion,
} from "../utils/promociones-sala";
import "./sala-espera.css";

const hoyLocal = () => {
	const ahora = new Date();
	return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

const formatHora = (fecha) =>
	fecha
		? new Date(fecha).toLocaleTimeString("es-MX", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "";

const SalaEspera = () => {
	const [turnos, setTurnos] = useState([]);
	const [turnosCargados, setTurnosCargados] = useState(false);
	const [hora, setHora] = useState(new Date());

	const llamadosActivos = useMemo(
		() =>
			turnos
				.filter((turno) =>
					[TURNO_ESTADOS.LLAMADO, TURNO_ESTADOS.EN_ATENCION].includes(turno.estado),
				)
				.sort((a, b) => new Date(b.llamado_en || 0) - new Date(a.llamado_en || 0)),
		[turnos],
	);
	const turnoActual = llamadosActivos[0] || null;

	// Suena el timbre cada que aparece un turno en pantalla, también cuando se
	// vuelve a llamar al mismo (cambia la hora del llamado). Al abrir la
	// pantalla no suena por el turno que ya estaba.
	const [sonidoPendiente, setSonidoPendiente] = useState(() => sonidoBloqueado());
	const llamadoMostradoRef = useRef(undefined);
	const llaveLlamado = turnoActual ? `${turnoActual.id_turno}:${turnoActual.llamado_en || ""}` : null;
	// Hasta cuándo se queda el turno en pantalla antes de volver a las
	// promociones (milisegundos del reloj de la TV).
	const [turnoVisibleHasta, setTurnoVisibleHasta] = useState(0);
	useEffect(() => {
		if (!turnosCargados) return;
		const anterior = llamadoMostradoRef.current;
		llamadoMostradoRef.current = llaveLlamado;
		if (!llaveLlamado || llaveLlamado === anterior) return;
		if (anterior === undefined) {
			// Al abrir la pantalla, el turno que ya estaba sólo se muestra si se
			// acaba de llamar; uno de hace una hora no tapa las promociones.
			const llamadoEn = new Date(turnoActual?.llamado_en || 0).getTime();
			if (Number.isFinite(llamadoEn)) setTurnoVisibleHasta(llamadoEn + SEGUNDOS_TURNO_EN_PANTALLA * 1000);
			return;
		}
		setTurnoVisibleHasta(Date.now() + SEGUNDOS_TURNO_EN_PANTALLA * 1000);
		tocarTimbreTurno();
	}, [llaveLlamado, turnosCargados]);

	// Promociones: mientras no hay un llamado reciente la pantalla las pasa en
	// ciclo. Sin promociones vigentes se queda la pantalla de turnos de siempre.
	const [promociones, setPromociones] = useState([]);
	const [indicePromocion, setIndicePromocion] = useState(0);
	const [, setTick] = useState(0);
	const turnoEnPantalla = Date.now() < turnoVisibleHasta;
	const mostrarPromociones = promociones.length > 0 && !turnoEnPantalla;

	// Al vencer el tiempo del turno se vuelve a pintar para regresar a las
	// promociones.
	useEffect(() => {
		const restante = turnoVisibleHasta - Date.now();
		if (restante <= 0) return undefined;
		const temporizador = setTimeout(() => setTick((valor) => valor + 1), restante + 50);
		return () => clearTimeout(temporizador);
	}, [turnoVisibleHasta]);

	useEffect(() => {
		if (!mostrarPromociones || promociones.length < 2) return undefined;
		const intervalo = setInterval(
			() => setIndicePromocion((indice) => (indice + 1) % promociones.length),
			SEGUNDOS_POR_PROMOCION * 1000,
		);
		return () => clearInterval(intervalo);
	}, [mostrarPromociones, promociones.length]);

	useEffect(() => {
		const cargarPromociones = async () => {
			let respuesta;
			try {
				respuesta = await supabase
					.from("promociones_sala")
					.select("id_promocion, titulo, storage_path, orden, activa, vigente_desde, vigente_hasta")
					.eq("activa", true)
					.order("orden", { ascending: true });
			} catch {
				respuesta = { error: true };
			}
			const { data, error } = respuesta || {};
			// Si la tabla aún no existe o falla la consulta, la pantalla sigue con
			// los turnos como siempre.
			if (error) return;
			const visibles = promocionesVisibles(data || [], fechaLocalIso()).map((promocion) => ({
				...promocion,
				url: urlPromocion(supabase, promocion.storage_path),
			}));
			setPromociones(visibles);
			setIndicePromocion((indice) => (visibles.length ? indice % visibles.length : 0));
		};
		cargarPromociones();
		// Se recargan al cambiar algo en Configuración y cada media hora, para que
		// la promoción que empieza o termina hoy entre o salga sola.
		const recarga = setInterval(cargarPromociones, 30 * 60 * 1000);
		const canal = supabase
			.channel("promociones-sala")
			.on("postgres_changes", { event: "*", schema: "public", table: "promociones_sala" }, () =>
				cargarPromociones(),
			)
			.subscribe();
		return () => {
			clearInterval(recarga);
			supabase.removeChannel(canal);
		};
	}, []);

	// Cualquier toque o tecla en la pantalla habilita el sonido.
	useEffect(() => {
		if (!sonidoPendiente) return undefined;
		const habilitar = async () => {
			if (await activarSonido()) setSonidoPendiente(false);
		};
		window.addEventListener("pointerdown", habilitar);
		window.addEventListener("keydown", habilitar);
		return () => {
			window.removeEventListener("pointerdown", habilitar);
			window.removeEventListener("keydown", habilitar);
		};
	}, [sonidoPendiente]);
	const ultimos = useMemo(
		() =>
			turnos
				.filter((turno) => turno.id_turno !== turnoActual?.id_turno)
				.sort((a, b) => new Date(b.llamado_en || b.updated_at || 0) - new Date(a.llamado_en || a.updated_at || 0))
				.slice(0, 5),
		[turnos, turnoActual],
	);

	useEffect(() => {
		cargarTurnos();
		// La pantalla sólo muestra fecha y hh:mm, así que no hace falta despertarla
		// cada segundo: es una TV encendida 24/7 y eran ~86,400 renders al día para
		// pintar el mismo texto. Se revisa cada 20 s y se conserva el estado
		// anterior si el minuto no cambió, con lo que React ni siquiera re-renderiza.
		const reloj = setInterval(() => {
			setHora((anterior) => {
				const ahora = new Date();
				const mismoMinuto =
					ahora.getMinutes() === anterior.getMinutes() &&
					ahora.getHours() === anterior.getHours() &&
					ahora.getDate() === anterior.getDate();
				return mismoMinuto ? anterior : ahora;
			});
		}, 20000);

		const channel = supabase
			.channel("turnos-pacientes-sala")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "turnos_pacientes" },
				() => cargarTurnos(),
			)
			.subscribe();

		return () => {
			clearInterval(reloj);
			supabase.removeChannel(channel);
		};
	}, []);

	const cargarTurnos = async () => {
		const fecha = hoyLocal();
		const rango = obtenerRangoDiaLocalISO(fecha);
		const { data, error } = await supabase
			.from("turnos_pacientes")
			.select("*")
			.gte("fecha_programada", rango.inicio)
			.lte("fecha_programada", rango.fin)
			.in("estado", [TURNO_ESTADOS.LLAMADO, TURNO_ESTADOS.EN_ATENCION, TURNO_ESTADOS.ATENDIDO])
			.order("llamado_en", { ascending: false })
			.limit(8);

		if (!error) {
			setTurnos(data || []);
			setTurnosCargados(true);
		}
	};

	const botonSonido = sonidoPendiente && (
		<button
			type="button"
			className="sala-activar-sonido"
			onClick={async () => {
				if (await activarSonido()) {
					setSonidoPendiente(false);
					tocarTimbreTurno();
				}
			}}>
			🔔 Activar sonido de turnos
		</button>
	);

	if (mostrarPromociones) {
		return (
			<main className="sala-promociones" aria-label="Promociones">
				{promociones.map((promocion, indice) => (
					<img
						key={promocion.id_promocion}
						src={promocion.url}
						alt={promocion.titulo || "Promoción"}
						className={`sala-promocion${indice === indicePromocion ? " activa" : ""}`}
						aria-hidden={indice !== indicePromocion}
					/>
				))}
				<div className="sala-promociones-reloj">{formatHora(hora)}</div>
				{botonSonido}
			</main>
		);
	}

	return (
		<main className="sala-espera-page">
			<header className="sala-espera-topbar">
				<img src={logoCalifornIA} alt="CalifornIA" />
				<div>
					<strong>Sala de espera</strong>
					<span>
						{hora.toLocaleDateString("es-MX", {
							weekday: "long",
							day: "2-digit",
							month: "long",
						})}{" "}
						- {formatHora(hora)}
					</span>
				</div>
			</header>

			{botonSonido}

			<section className={`sala-current ${turnoActual ? "has-call" : ""}`}>
				{turnoActual ? (
					<>
						<p className="sala-kicker">Es turno de</p>
						<div className="sala-turn-code">{turnoActual.codigo_turno}</div>
						<h1>{obtenerNombreTurno(turnoActual.nombre_paciente)}</h1>
						<p className="sala-destination">Pase a {turnoActual.destino || "recepcion"}</p>
					</>
				) : (
					<>
						<p className="sala-kicker">Gracias por esperar</p>
						<h1>En breve le llamaremos</h1>
						<p className="sala-destination">Permanezca atento a la pantalla</p>
					</>
				)}
			</section>

			<section className="sala-recent">
				<h2>Ultimos llamados</h2>
				<div className="sala-recent-grid">
					{ultimos.length === 0 ? (
						<div className="sala-empty">No hay llamados recientes</div>
					) : (
						ultimos.map((turno) => (
							<div className="sala-recent-item" key={turno.id_turno}>
								<strong>{turno.codigo_turno}</strong>
								<span>{turno.destino || "Recepcion"}</span>
							</div>
						))
					)}
				</div>
			</section>
		</main>
	);
};

export default SalaEspera;
