// El informe y la programación se navegan por semana de trabajo, que aquí
// empieza en lunes. Todo se calcula en UTC a mediodía para que un cambio de
// horario de verano no recorra la semana un día.
const MEDIODIA = "T12:00:00Z";
const DIA_MS = 86400000;

const aFecha = (iso) => new Date(`${String(iso).slice(0, 10)}${MEDIODIA}`);

const aTexto = (fecha) => fecha.toISOString().slice(0, 10);

export const MESES = [
	"enero", "febrero", "marzo", "abril", "mayo", "junio",
	"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// getUTCDay da 0 para domingo; se convierte a 1..7 con lunes en 1 para que
// restar sea directo.
export const diaDeLaSemana = (iso) => {
	const dia = aFecha(iso).getUTCDay();
	return dia === 0 ? 7 : dia;
};

export const lunesDeLaSemana = (iso) => {
	const fecha = aFecha(iso);
	return aTexto(new Date(fecha.getTime() - (diaDeLaSemana(iso) - 1) * DIA_MS));
};

export const sumarDias = (iso, dias) => aTexto(new Date(aFecha(iso).getTime() + dias * DIA_MS));

export const semanaDesplazada = (lunes, semanas) => lunesDeLaSemana(sumarDias(lunes, semanas * 7));

// La semana laboral que ella reporta es de lunes a viernes; el fin de semana no
// se programa.
export const rangoSemanaLaboral = (lunes) => ({
	desde: lunesDeLaSemana(lunes),
	hasta: sumarDias(lunesDeLaSemana(lunes), 4),
});

export const etiquetaSemana = (lunes) => {
	const { desde, hasta } = rangoSemanaLaboral(lunes);
	const inicio = aFecha(desde);
	const fin = aFecha(hasta);
	const mesInicio = MESES[inicio.getUTCMonth()];
	const mesFin = MESES[fin.getUTCMonth()];
	if (mesInicio === mesFin) {
		return `Del ${inicio.getUTCDate()} al ${fin.getUTCDate()} de ${mesFin}`;
	}
	return `Del ${inicio.getUTCDate()} de ${mesInicio} al ${fin.getUTCDate()} de ${mesFin}`;
};

export const hoyEnMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export const periodoDeHoy = () => hoyEnMexico().slice(0, 7);

export const periodoDesplazado = (periodo, meses) => {
	const [anio, mes] = String(periodo).split("-").map(Number);
	const fecha = new Date(Date.UTC(anio, mes - 1 + meses, 1));
	return fecha.toISOString().slice(0, 7);
};

export const etiquetaPeriodo = (periodo) => {
	const [anio, mes] = String(periodo).split("-").map(Number);
	const nombre = MESES[mes - 1] ?? "";
	return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
};
