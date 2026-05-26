import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-client";
import {
	obtenerNombrePrivado,
	obtenerRangoDiaLocalISO,
	TURNO_ESTADOS,
} from "../utils/turnos-pacientes";
import logoCalifornIA from "../assets/logoCalifornIA.png";
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
		const reloj = setInterval(() => setHora(new Date()), 1000);

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

		if (!error) setTurnos(data || []);
	};

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

			<section className={`sala-current ${turnoActual ? "has-call" : ""}`}>
				{turnoActual ? (
					<>
						<p className="sala-kicker">Es turno de</p>
						<div className="sala-turn-code">{turnoActual.codigo_turno}</div>
						<h1>{obtenerNombrePrivado(turnoActual.nombre_paciente)}</h1>
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
