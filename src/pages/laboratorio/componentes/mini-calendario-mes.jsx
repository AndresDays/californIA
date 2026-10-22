import { useEffect, useRef, useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./mini-calendario-mes.css";

// Para llegar a una fecha lejana había que picar la flecha día por día: el mes
// completo deja saltar directo al día que se busca.
const DIAS_SEMANA = ["D", "L", "M", "X", "J", "V", "S"];

const aFechaIso = (anio, mes, dia) =>
	`${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const leerMes = (fecha) => {
	const [anio, mes] = fecha.split("-").map(Number);
	return { anio, mes: mes - 1 };
};

// Seis semanas fijas: el calendario no cambia de alto al pasar de mes. Los días
// de los meses vecinos se muestran tenues y también se pueden elegir.
const construirSemanas = ({ anio, mes }) => {
	const primerDiaSemana = new Date(anio, mes, 1).getDay();
	return Array.from({ length: 42 }, (_, indice) => {
		const fecha = new Date(anio, mes, 1 - primerDiaSemana + indice);
		return {
			iso: aFechaIso(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
			dia: fecha.getDate(),
			delMes: fecha.getMonth() === mes,
		};
	});
};

// `anclaRef` es el botón que lo abre: un clic ahí lo cierra el propio botón, y
// si también contara como "clic fuera" se cerraría y se volvería a abrir.
const MiniCalendarioMes = ({ fechaSeleccionada, hoy, onSeleccionar, onCerrar, anclaRef }) => {
	const [mesVisible, setMesVisible] = useState(() => leerMes(fechaSeleccionada));
	const contenedorRef = useRef(null);

	useEffect(() => {
		const cerrarAlClicFuera = (event) => {
			if (contenedorRef.current?.contains(event.target)) return;
			if (anclaRef?.current?.contains(event.target)) return;
			onCerrar();
		};
		const cerrarConEscape = (event) => {
			if (event.key === "Escape") onCerrar();
		};
		document.addEventListener("mousedown", cerrarAlClicFuera);
		document.addEventListener("keydown", cerrarConEscape);
		return () => {
			document.removeEventListener("mousedown", cerrarAlClicFuera);
			document.removeEventListener("keydown", cerrarConEscape);
		};
	}, [onCerrar, anclaRef]);

	const moverMes = (delta) =>
		setMesVisible(({ anio, mes }) => {
			const fecha = new Date(anio, mes + delta, 1);
			return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
		});

	const nombreMes = new Date(mesVisible.anio, mesVisible.mes, 1).toLocaleDateString("es-MX", { month: "long" });
	const titulo = `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${mesVisible.anio}`;

	return (
		<div className="mini-cal" role="dialog" aria-label="Elegir fecha" ref={contenedorRef}>
			<div className="mini-cal-header">
				<strong className="mini-cal-titulo">{titulo}</strong>
				<button type="button" className="mini-cal-nav" aria-label="Mes anterior" onClick={() => moverMes(-1)}>
					<ChevronLeftIcon fontSize="small" />
				</button>
				<button type="button" className="mini-cal-nav" aria-label="Mes siguiente" onClick={() => moverMes(1)}>
					<ChevronRightIcon fontSize="small" />
				</button>
			</div>
			<div className="mini-cal-grid" role="grid">
				{DIAS_SEMANA.map((dia) => (
					<span key={dia} className="mini-cal-dia-semana" role="columnheader">
						{dia}
					</span>
				))}
				{construirSemanas(mesVisible).map((celda) => {
					const clases = [
						"mini-cal-dia",
						!celda.delMes && "fuera-de-mes",
						celda.iso === hoy && "hoy",
						celda.iso === fechaSeleccionada && "seleccionado",
					]
						.filter(Boolean)
						.join(" ");
					return (
						<button
							type="button"
							key={celda.iso}
							className={clases}
							aria-label={celda.iso}
							aria-pressed={celda.iso === fechaSeleccionada}
							onClick={() => onSeleccionar(celda.iso)}>
							{celda.dia}
						</button>
					);
				})}
			</div>
			<button type="button" className="mini-cal-hoy" onClick={() => onSeleccionar(hoy)}>
				Ir a hoy
			</button>
		</div>
	);
};

export default MiniCalendarioMes;
