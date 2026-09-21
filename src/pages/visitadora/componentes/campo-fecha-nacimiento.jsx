import { useState } from "react";
import { diasDelMes } from "../../../utils/dias-del-mes";
import { MESES } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

// El cumpleaños del médico se capturaba con el calendario del navegador, que
// para una fecha de hace cincuenta años obliga a retroceder mes por mes. Tres
// listas —día, mes y año— se llenan de un vistazo, y es lo único que se pide:
// nadie escribe la fecha de nacimiento de un médico mirando un calendario.
const ANIO_MAS_VIEJO = 1930;

const partesDeFecha = (valor) => {
	const texto = String(valor || "").slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return { anio: "", mes: "", dia: "" };
	const [anio, mes, dia] = texto.split("-");
	return { anio, mes, dia };
};

const CampoFechaNacimiento = ({ id, etiqueta = "Fecha de nacimiento", valor, onChange }) => {
	// Las partes viven aquí: mientras la fecha está a medias, hacia afuera vale
	// vacío, y si eso fuera lo único que se recuerda, elegir el día borraría el
	// mes recién elegido y nunca se podría completar.
	const [partes, setPartes] = useState(() => partesDeFecha(valor));
	const { anio, mes, dia } = partes;
	const anioActual = new Date().getUTCFullYear();
	const anios = Array.from({ length: anioActual - ANIO_MAS_VIEJO + 1 }, (_, i) => anioActual - i);
	const tope = diasDelMes(anio, mes);

	const cambiar = (parte) => (evento) => {
		const nuevas = { anio, mes, dia, [parte]: evento.target.value };
		// Al cambiar de mes, un día que ya no existe se recorta al último: pasar
		// del 31 de marzo a febrero no debe dejar una fecha imposible.
		const limite = diasDelMes(nuevas.anio, nuevas.mes);
		if (Number(nuevas.dia) > limite) nuevas.dia = String(limite).padStart(2, "0");
		setPartes(nuevas);
		// La fecha sólo vale cuando están las tres partes; a medias se devuelve
		// vacía para no guardar un cumpleaños inventado.
		onChange(nuevas.anio && nuevas.mes && nuevas.dia ? `${nuevas.anio}-${nuevas.mes}-${nuevas.dia}` : "");
	};

	return (
		<fieldset className="visitadora-fecha-partes">
			<legend>{etiqueta}</legend>
			<select id={`${id}-dia`} aria-label="Día" value={dia} onChange={cambiar("dia")}>
				<option value="">Día</option>
				{Array.from({ length: tope }, (_, i) => String(i + 1).padStart(2, "0")).map((valorDia) => (
					<option key={valorDia} value={valorDia}>{Number(valorDia)}</option>
				))}
			</select>
			<select id={`${id}-mes`} aria-label="Mes" value={mes} onChange={cambiar("mes")}>
				<option value="">Mes</option>
				{MESES.map((nombre, indice) => {
					const valorMes = String(indice + 1).padStart(2, "0");
					return (
						<option key={valorMes} value={valorMes}>
							{nombre.charAt(0).toUpperCase() + nombre.slice(1)}
						</option>
					);
				})}
			</select>
			<select id={`${id}-anio`} aria-label="Año" value={anio} onChange={cambiar("anio")}>
				<option value="">Año</option>
				{anios.map((valorAnio) => (
					<option key={valorAnio} value={String(valorAnio)}>{valorAnio}</option>
				))}
			</select>
		</fieldset>
	);
};

export default CampoFechaNacimiento;
