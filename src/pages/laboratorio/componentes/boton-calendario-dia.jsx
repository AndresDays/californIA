import { useCallback, useRef, useState } from "react";
import MiniCalendarioMes from "./mini-calendario-mes";
import "./boton-calendario-dia.css";

const fechaLocalHoy = () => {
	const hoy = new Date();
	return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
};

// El ícono de calendario que acompaña a un filtro: al picarlo abre el mes y
// deja elegir un día. `fecha` es el día elegido (AAAA-MM-DD) o vacío.
const BotonCalendarioDia = ({ fecha, onSeleccionar, icono, etiqueta = "Elegir día", alinear = "izquierda" }) => {
	const [abierto, setAbierto] = useState(false);
	const botonRef = useRef(null);
	const cerrar = useCallback(() => setAbierto(false), []);
	const hoy = fechaLocalHoy();

	return (
		<div className="boton-calendario-dia">
			<button
				type="button"
				ref={botonRef}
				className={`boton-calendario-dia-icono${fecha ? " activo" : ""}`}
				aria-label={etiqueta}
				aria-expanded={abierto}
				title={etiqueta}
				onClick={() => setAbierto((valor) => !valor)}
			>
				<img src={icono} alt="" />
			</button>
			{abierto && (
				<MiniCalendarioMes
					fechaSeleccionada={fecha || hoy}
					hoy={hoy}
					onSeleccionar={(dia) => {
						onSeleccionar(dia);
						setAbierto(false);
					}}
					onCerrar={cerrar}
					anclaRef={botonRef}
					className={alinear === "izquierda" ? "mini-cal-izquierda" : ""}
				/>
			)}
		</div>
	);
};

export default BotonCalendarioDia;
