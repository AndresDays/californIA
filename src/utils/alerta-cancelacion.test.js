import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const rutaMigracion = resolve(
	process.cwd(),
	"supabase/migrations/20260903120000_alerta_cancelacion_solicitud.sql",
);
const rutaFuncion = resolve(
	process.cwd(),
	"supabase/functions/alertas-correo/index.ts",
);

const migracion = existsSync(rutaMigracion) ? readFileSync(rutaMigracion, "utf8") : "";
const funcion = existsSync(rutaFuncion) ? readFileSync(rutaFuncion, "utf8") : "";

// El cuerpo de la función que resuelve a quién se le avisa, aislado del resto
// de la migración: comprobar los roles contra el archivo entero daría por bueno
// un rol que apareciera en cualquier otro lugar.
const cuerpoDestinatarios =
	/create or replace function public\.destinatarios_alerta_direccion[\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(
		migracion,
	)?.[1] || "";

describe("aviso de solicitud cancelada", () => {
	test("existen la migración y la función de borde", () => {
		expect(existsSync(rutaMigracion)).toBe(true);
		expect(existsSync(rutaFuncion)).toBe(true);
	});

	// El aviso tiene que salir de la base y no de la pantalla: una cancelación
	// hecha desde cualquier otro lugar, o con el navegador a punto de perder la
	// red, sigue avisando.
	test("el disparador vive en ventas y sólo actúa al pasar a cancelado", () => {
		expect(migracion).toContain("after update on public.ventas");
		expect(migracion).toContain("new.estado is distinct from old.estado");
		expect(migracion).toContain("lower(coalesce(new.estado, '')) = 'cancelado'");
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
		expect(migracion).toContain("coalesce(e.activo, true) = true");
	});

	// Un renglón por persona: si fuera uno solo para el grupo, que
	// administración lo marcara leído apagaría el aviso de dirección, porque
	// `notificaciones.read_at` es una sola columna compartida.
	test("cada destinatario recibe su propia notificación", () => {
		expect(migracion).toContain("usuario_destino");
		expect(migracion).toContain("v_destinatario.auth_uuid");
		expect(migracion).toContain("'usuario'");
	});

	test("quien cancela no se avisa a sí mismo", () => {
		expect(migracion).toContain("continue when v_actor is not null");
	});

	// El motivo lo teclea una persona: si no se escapa, un `<` suelto rompe el
	// cuerpo del correo.
	test("el motivo se escapa antes de entrar al HTML", () => {
		expect(migracion).toMatch(/replace\(replace\(v_motivo, '&', '&amp;'\), '<', '&lt;'\)/);
	});

	// La tabla lleva correos del personal y sólo la toca la función de borde con
	// la llave de servicio: con RLS encendida y sin políticas, nadie más entra.
	test("la bandeja de correo queda cerrada a la aplicación", () => {
		expect(migracion).toContain("alter table public.notificaciones_correo enable row level security");
		expect(migracion).not.toContain("create policy notificaciones_correo");
	});

	test("el aviso lleva al folio cancelado", () => {
		expect(migracion).toContain("'/editar-solicitud'");
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
