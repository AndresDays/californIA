import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const directorioMigraciones = resolve(process.cwd(), "supabase/migrations");
const rutaFuncion = resolve(
	process.cwd(),
	"supabase/functions/alertas-correo/index.ts",
);

const funcion = existsSync(rutaFuncion) ? readFileSync(rutaFuncion, "utf8") : "";

// Una función de la base se puede redefinir en una migración posterior, y de
// hecho `avisar_solicitud_cancelada` ya se redefinió una vez. Lo que vale es la
// última definición, así que las pruebas se leen contra esa y no contra el
// archivo donde nació: si mañana se vuelve a redefinir, se comprueba la nueva
// sin tener que acordarse de cambiar aquí la ruta.
const ultimaDefinicion = (nombreFuncion) => {
	const patron = new RegExp(
		`create or replace function public\\.${nombreFuncion}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`,
	);
	let ultimo = { archivo: "", cuerpo: "", texto: "" };
	for (const archivo of readdirSync(directorioMigraciones).sort()) {
		if (!archivo.endsWith(".sql")) continue;
		const texto = readFileSync(resolve(directorioMigraciones, archivo), "utf8");
		const encontrado = patron.exec(texto);
		if (encontrado) ultimo = { archivo, cuerpo: encontrado[1], texto };
	}
	return ultimo;
};

const disparador = ultimaDefinicion("avisar_solicitud_cancelada");
const destinatarios = ultimaDefinicion("destinatarios_alerta_direccion");

const cuerpoDisparador = disparador.cuerpo;
const cuerpoDestinatarios = destinatarios.cuerpo;

// Todas las migraciones juntas: el `create trigger` y la tabla se crean una
// sola vez y no tienen por qué estar en la misma migración que la última
// definición de la función.
const migracionTabla = readdirSync(directorioMigraciones)
	.sort()
	.filter((archivo) => archivo.endsWith(".sql"))
	.map((archivo) => readFileSync(resolve(directorioMigraciones, archivo), "utf8"))
	.join("\n");

describe("aviso de solicitud cancelada", () => {
	test("existen el disparador y la función de borde", () => {
		expect(disparador.archivo).not.toBe("");
		expect(destinatarios.archivo).not.toBe("");
		expect(existsSync(rutaFuncion)).toBe(true);
	});

	// El aviso tiene que salir de la base y no de la pantalla: una cancelación
	// hecha desde cualquier otro lugar, o con el navegador a punto de perder la
	// red, sigue avisando.
	test("el disparador vive en ventas y sólo actúa al pasar a cancelado", () => {
		expect(migracionTabla).toContain("after update on public.ventas");
		expect(migracionTabla).toContain("new.estado is distinct from old.estado");
		expect(migracionTabla).toContain("lower(coalesce(new.estado, '')) = 'cancelado'");
	});

	// `radiologo` es el Radiólogo - Director; el radiólogo de a pie se guarda
	// como `radiologo_clinico` y no debe recibir el aviso.
	test.each([
		"admin",
		"administrador",
		"desarrollador",
		"radiologo",
		"radiologo_director",
	])("%s está entre los destinatarios", (rol) => {
		expect(cuerpoDestinatarios).toContain(`'${rol}'`);
	});

	test("el radiólogo clínico no recibe el aviso", () => {
		// Sólo dentro de la función: el archivo sí lo nombra en el comentario que
		// explica por qué `radiologo` no alcanza a los radiólogos clínicos.
		expect(cuerpoDestinatarios).not.toContain("radiologo_clinico");
	});

	test("sólo se avisa a personal activo", () => {
		expect(cuerpoDestinatarios).toContain("coalesce(e.activo, true) = true");
	});

	// Un renglón por persona: si fuera uno solo para el grupo, que
	// administración lo marcara leído apagaría el aviso de dirección, porque
	// `notificaciones.read_at` es una sola columna compartida.
	test("cada destinatario recibe su propia notificación", () => {
		expect(cuerpoDisparador).toContain("usuario_destino");
		expect(cuerpoDisparador).toContain("v_destinatario.auth_uuid");
		expect(cuerpoDisparador).toContain("'usuario'");
	});

	// La campana distingue por aquí cuál aviso abre el detalle de la orden
	// cancelada. Con `venta` a secas se confundiría con los avisos de captura y
	// de venta nueva, que también lo usan.
	test("el aviso se marca como cancelación para que la campana lo reconozca", () => {
		expect(cuerpoDisparador).toContain("'venta_cancelada'");
	});

	test("quien cancela no se avisa a sí mismo", () => {
		expect(cuerpoDisparador).toContain("continue when v_actor is not null");
	});

	// El motivo lo teclea una persona: si no se escapa, un `<` suelto rompe el
	// cuerpo del correo.
	test("el motivo se escapa antes de entrar al HTML", () => {
		expect(cuerpoDisparador).toMatch(
			/replace\(replace\(v_motivo, '&', '&amp;'\), '<', '&lt;'\)/,
		);
	});

	// La tabla lleva correos del personal y sólo la toca la función de borde con
	// la llave de servicio: con RLS encendida y sin políticas, nadie más entra.
	test("la bandeja de correo queda cerrada a la aplicación", () => {
		expect(migracionTabla).toContain(
			"alter table public.notificaciones_correo enable row level security",
		);
		expect(migracionTabla).not.toContain("create policy notificaciones_correo");
	});

	// Respaldo por si un aviso llegara sin id de venta: el clic sigue llevando a
	// alguna parte en vez de no hacer nada.
	test("el aviso conserva una ruta de respaldo", () => {
		expect(cuerpoDisparador).toContain("'/editar-solicitud'");
	});
});

describe("función de borde que manda los correos", () => {
	test("exige el secreto del cron y sólo acepta POST", () => {
		expect(funcion).toContain("ALERTAS_CRON_SECRET");
		expect(funcion).toContain("esSecretoBearerValido");
		expect(funcion).toContain('req.method !== "POST"');
	});

	// Un correo que falla se reintenta, pero no eternamente: una dirección mal
	// escrita fallaría en cada corrida hasta el fin de los tiempos.
	test("reintenta un número acotado de veces y guarda el motivo del fallo", () => {
		expect(funcion).toContain("MAXIMO_INTENTOS");
		expect(funcion).toMatch(/intentos >= MAXIMO_INTENTOS/);
		expect(funcion).toContain('estado: agotado ? "error" : "pendiente"');
	});

	// El texto se redacta en la base para que el correo y la campana no puedan
	// decir cosas distintas: aquí sólo se envía lo que ya viene escrito.
	test("no redacta el mensaje, sólo manda lo que trae el renglón", () => {
		expect(funcion).toContain("cuerpo_texto");
		expect(funcion).toContain("cuerpo_html");
		expect(funcion).not.toContain("Solicitud cancelada");
	});
});
