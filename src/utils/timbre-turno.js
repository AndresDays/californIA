// Timbre de dos tonos ("din-don") que suena en la sala de espera cada que
// aparece un turno en pantalla. Se genera con Web Audio para no cargar un
// archivo de sonido.
//
// Los navegadores no dejan sonar audio hasta que alguien toca la página: la
// pantalla de la sala muestra un botón para activarlo la primera vez.

let contexto = null;

const obtenerContexto = () => {
	const Contexto = globalThis.AudioContext || globalThis.webkitAudioContext;
	if (!Contexto) return null;
	contexto ||= new Contexto();
	return contexto;
};

export const sonidoBloqueado = () => {
	const ctx = obtenerContexto();
	return Boolean(ctx) && ctx.state !== "running";
};

export const activarSonido = async () => {
	const ctx = obtenerContexto();
	if (!ctx) return false;
	try {
		if (ctx.state !== "running") await ctx.resume();
	} catch {
		return false;
	}
	return ctx.state === "running";
};

const tono = (ctx, frecuencia, inicio, duracion) => {
	const oscilador = ctx.createOscillator();
	const volumen = ctx.createGain();
	oscilador.type = "sine";
	oscilador.frequency.setValueAtTime(frecuencia, inicio);
	// Ataque corto y caída larga, como una campana.
	volumen.gain.setValueAtTime(0.0001, inicio);
	volumen.gain.exponentialRampToValueAtTime(0.5, inicio + 0.02);
	volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
	oscilador.connect(volumen);
	volumen.connect(ctx.destination);
	oscilador.start(inicio);
	oscilador.stop(inicio + duracion + 0.05);
};

export const tocarTimbreTurno = () => {
	const ctx = obtenerContexto();
	if (!ctx || ctx.state !== "running") return false;
	const ahora = ctx.currentTime;
	tono(ctx, 880, ahora, 0.7);
	tono(ctx, 660, ahora + 0.45, 1.1);
	return true;
};

// Sólo para pruebas.
export const reiniciarTimbreTurno = () => {
	contexto = null;
};
