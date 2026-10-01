import { useState } from "react";
import { useClasificarVisita } from "../../../hooks/use-clasificar-visita";
import { componerCaptura, desglosarCaptura, ETIQUETAS_CAPTURA } from "../../../utils/desglose-captura";
import "../visitadora.css";

// Los valores que más se repiten en su informe; la lista no cierra la puerta a
// escribir el convenio con sus propias palabras.
export const CONVENIOS_SUGERIDOS = ["MIXTO", "PUNTOS", "N/A", "PENDIENTE", "Descuento para Pacientes"];

// La captura de lo que pasó en la visita es la misma en la agenda y en el
// informe: de corrido, como se la va dictando el médico, o campo por campo.
// La libre es la de la calle; la de campos, la de revisar sentada.
export const useCapturaVisita = (visita) => {
	const [modo, setModo] = useState("libre");
	const [capturaLibre, setCapturaLibre] = useState(
		() => visita?.captura_libre ?? (visita ? componerCaptura(visita) : ""),
	);
	// Lo que devolvió la IA, cuando se le pidió acomodar el dictado. Mientras no
	// se pida, manda el reparto por palabras, que es instantáneo y no cuesta.
	const [desgloseIa, setDesgloseIa] = useState(null);
	const [avisoReparto, setAvisoReparto] = useState("");
	return {
		modo, setModo, capturaLibre, setCapturaLibre,
		desgloseIa, setDesgloseIa, avisoReparto, setAvisoReparto,
	};
};

// Las columnas del informe que salen de la captura, y si hay algo que guardar.
export const contenidoDeCaptura = (captura, campos) => {
	// En la captura libre las columnas del informe salen de desglosar el
	// texto; en la de campos, de lo que se escribió en cada uno.
	const libre = captura.modo === "libre";
	const contenido = libre
		? (captura.desgloseIa ?? desglosarCaptura(captura.capturaLibre))
		: {
			actividades: campos.actividades,
			comentarios_medico: campos.comentarios_medico,
			observaciones: campos.observaciones,
			seguimiento: campos.seguimiento,
			tipo_convenio: campos.tipo_convenio,
		};
	// Capturando de corrido basta con que haya algo escrito: si ella marcó
	// todo como observaciones, obligar a llenar actividades sería estorbar.
	// Campo por campo sí se pide actividades, que es la columna del informe
	// que nunca va vacía.
	const hayContenido = libre
		? Object.values(contenido).some((valor) => String(valor || "").trim())
		: Boolean(String(contenido.actividades || "").trim());
	return {
		contenido,
		hayContenido,
		// Se guarda lo que escribió tal cual, para poder reabrirlo y seguir
		// corrigiendo sin rearmar el texto a mano.
		captura_libre: libre ? captura.capturaLibre : null,
	};
};

const CapturaVisita = ({ captura, campos, setCampos, ids }) => {
	const clasificar = useClasificarVisita();
	const {
		modo, setModo, capturaLibre, setCapturaLibre,
		desgloseIa, setDesgloseIa, avisoReparto, setAvisoReparto,
	} = captura;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const largo = (id, etiqueta, clave, filas = 2) => (
		<>
			<label htmlFor={id}>{etiqueta}</label>
			<textarea id={id} rows={filas} value={campos[clave] ?? ""} onChange={cambiar(clave)} />
		</>
	);

	return (
		<>
			<div className="visitadora-pestanas" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={modo === "libre"}
					onClick={() => setModo("libre")}>
					Escribir de corrido
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={modo === "campos"}
					onClick={() => {
						// Al pasar a campos se reparte lo ya escrito, para no
						// empezar de cero.
						if (capturaLibre.trim()) {
							setCampos((previos) => ({ ...previos, ...(desgloseIa ?? desglosarCaptura(capturaLibre)) }));
						}
						setModo("campos");
					}}>
					Campo por campo
				</button>
			</div>

			{modo === "libre" ? (
				<>
					<label htmlFor={ids.libre}>Lo que pasó en la visita</label>
					<textarea
						id={ids.libre}
						rows={10}
						placeholder={
							"Se presentaron los servicios de laboratorio e imagen y se dejaron órdenes. " +
							"Mostró interés y pidió precios de resonancia. " +
							"Recibe representantes los miércoles. Dar seguimiento en 15 días."
						}
						value={capturaLibre}
						onChange={(evento) => {
							setCapturaLibre(evento.target.value);
							// Al seguir escribiendo, lo que acomodó la IA ya no
							// corresponde al texto: se descarta para no guardar un
							// reparto viejo.
							setDesgloseIa(null);
							setAvisoReparto("");
						}}
					/>
					<p className="visitadora-ficha-dato">
						Escríbelo como te lo vayan diciendo, sin cuidar la redacción. Abajo ves en qué
						columna del informe queda cada frase; «Acomodar con IA» además lo redacta como va
						en el informe. Si algo cayó mal, corrígelo en «Campo por campo».
					</p>

					{/* La vista previa es lo que hace confiable el reparto: se ve
					    dónde quedó cada frase antes de guardar, no después en el
					    informe. */}
					{capturaLibre.trim() && (
						<div className="visitadora-historial">
							<p className="visitadora-historial-titulo">
								Así va a quedar en el informe{desgloseIa ? " (acomodado con IA)" : ""}
							</p>
							{ETIQUETAS_CAPTURA.map(({ campo, etiqueta }) => (
								<p key={campo} className="visitadora-ficha-dato">
									<strong>{etiqueta}:</strong>{" "}
									{(desgloseIa ?? desglosarCaptura(capturaLibre))[campo] || "—"}
								</p>
							))}
							<div className="visitadora-modal-acciones">
								<button
									type="button"
									onClick={async () => {
										const resultado = await clasificar.mutateAsync(capturaLibre);
										setDesgloseIa(resultado.desglose);
										setAvisoReparto(
											resultado.fuente === "ia"
												? ""
												: `No se pudo acomodar con IA (${resultado.motivo}); se repartió aquí mismo.`,
										);
									}}
									disabled={clasificar.isPending}>
									{clasificar.isPending ? "Acomodando…" : "Acomodar con IA"}
								</button>
							</div>
							{avisoReparto && <p className="visitadora-ficha-dato">{avisoReparto}</p>}
						</div>
					)}

					{/* Las etiquetas quedan para cuando el reparto no acierte: se
					    escribe "Seguimiento:" al principio del renglón y manda eso. */}
					<details className="visitadora-etiquetas-detalle">
						<summary>¿Algo quedó en la columna equivocada?</summary>
						<p className="visitadora-ficha-dato">
							Empieza el renglón con la columna y dos puntos y se respeta tal cual.
						</p>
						<div className="visitadora-etiquetas-captura">
							{ETIQUETAS_CAPTURA.map(({ campo, etiqueta }) => (
								<button
									key={campo}
									type="button"
									onClick={() =>
										setCapturaLibre((texto) =>
											`${texto.replace(/\s*$/, "")}${texto.trim() ? "\n" : ""}${etiqueta}: `,
										)
									}>
									+ {etiqueta}
								</button>
							))}
						</div>
					</details>
				</>
			) : (
				<>
					{largo(ids.actividades, "Actividades", "actividades", 3)}
					{largo(ids.comentarios, "Comentarios del médico", "comentarios_medico")}
					{largo(ids.observaciones, "Observaciones", "observaciones")}
					{largo(ids.seguimiento, "Seguimiento", "seguimiento")}

					<label htmlFor={ids.convenio}>Convenio</label>
					<input
						id={ids.convenio}
						type="text"
						list={`${ids.convenio}-sugeridos`}
						value={campos.tipo_convenio ?? ""}
						onChange={cambiar("tipo_convenio")}
					/>
				</>
			)}
			<datalist id={`${ids.convenio}-sugeridos`}>
				{CONVENIOS_SUGERIDOS.map((valor) => (
					<option key={valor} value={valor} />
				))}
			</datalist>
		</>
	);
};

export default CapturaVisita;
