import { useDraggable, useDroppable } from "@dnd-kit/core";

// Piezas de arrastrar y soltar del calendario de citas, sobre @dnd-kit/core.
// La tarjeta de una cita se arrastra a otra hora de su columna -cambia la
// hora- o a otra columna -cambia el tipo de estudio y pide elegir cuál-.

export const idCelda = (tipoId, indiceBloque) => `celda|${tipoId}|${indiceBloque}`;

// Cada hueco de la rejilla recibe tarjetas. La celda combinada de una cita
// larga abarca varios renglones: `renglones` dice cuántos, para saber en cuál
// de ellos se soltó.
export const CeldaSoltable = ({ tipo, indiceBloque, renglones, className = "", children, ...props }) => {
	const { setNodeRef, isOver } = useDroppable({
		id: idCelda(tipo.id, indiceBloque),
		data: { tipo, indiceBloque, renglones },
	});
	return (
		<div ref={setNodeRef} className={`${className}${isOver ? " soltar-aqui" : ""}`} {...props}>
			{children}
		</div>
	);
};

// La tarjeta se arrastra desde cualquier parte; un clic sin mover sigue
// abriendo sus acciones porque el arrastre empieza hasta recorrer unos pixeles
// (ver los sensores del calendario).
export const TarjetaArrastrable = ({ cita, deshabilitada, className = "", children, ...props }) => {
	const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
		id: `cita-${cita.id_cita}`,
		data: { cita },
		disabled: deshabilitada,
	});
	return (
		<button
			type="button"
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			className={`${className}${isDragging ? " arrastrando" : ""}`}
			{...props}
		>
			{children}
		</button>
	);
};

// En qué renglón empieza la cita al soltarla. Se toma el renglón bajo el
// puntero y se le resta en qué parte de la tarjeta se agarró: una cita de tres
// horas tomada de abajo y soltada a las 12 empieza a las 10:30, no a las 12. El
// resultado no deja que la cita se salga de la rejilla.
export const renglonDestino = ({
	indiceCelda,
	renglonesCelda = 1,
	punteroY,
	celdaTop,
	celdaAlto,
	agarreY,
	tarjetaTop,
	tarjetaAlto,
	renglonesCita = 1,
	totalRenglones,
}) => {
	const altoRenglon = celdaAlto / Math.max(1, renglonesCelda);
	const renglonEnCelda = Number.isFinite(punteroY) && altoRenglon > 0
		? Math.min(renglonesCelda - 1, Math.max(0, Math.floor((punteroY - celdaTop) / altoRenglon)))
		: 0;
	const altoRenglonTarjeta = tarjetaAlto / Math.max(1, renglonesCita);
	const renglonAgarre = Number.isFinite(agarreY) && altoRenglonTarjeta > 0
		? Math.min(renglonesCita - 1, Math.max(0, Math.floor((agarreY - tarjetaTop) / altoRenglonTarjeta)))
		: 0;
	const destino = indiceCelda + renglonEnCelda - renglonAgarre;
	return Math.min(Math.max(0, totalRenglones - renglonesCita), Math.max(0, destino));
};

// La coordenada vertical del puntero al empezar, sea ratón o dedo.
export const coordenadaY = (evento) =>
	evento?.touches?.[0]?.clientY ?? evento?.changedTouches?.[0]?.clientY ?? evento?.clientY;
