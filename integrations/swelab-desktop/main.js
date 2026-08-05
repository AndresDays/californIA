const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { crearLotesPendientes } = require("./lib/import-batches.cjs");
const { resolverRutaLector } = require("./lib/reader-path.cjs");

const powershell32 = "C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe";
const dataDir = path.join(process.env.ProgramData || app.getPath("appData"), "CalifornIA", "swelab-agent");
const configPath = path.join(dataDir, "config.json");
const statePath = path.join(dataDir, "state.json");
const logPath = path.join(dataDir, "swelab-agent.log");
let tray;
let ventana;
let ejecutando = false;

function asegurarDirectorio() {
	fs.mkdirSync(dataDir, { recursive: true });
}

function escribirLog(mensaje) {
	asegurarDirectorio();
	fs.appendFileSync(logPath, `${new Date().toISOString()} ${mensaje}\n`);
}

function actualizarEstado(mensaje) {
	tray?.setToolTip(`CalifornIA Swelab: ${mensaje}`);
	if (ventana && !ventana.isDestroyed()) {
		ventana.webContents.executeJavaScript(`document.getElementById('estado').textContent = ${JSON.stringify(mensaje)}`).catch(() => {});
	}
}

function leerJson(ruta, valorPredeterminado) {
	try {
		return JSON.parse(fs.readFileSync(ruta, "utf8"));
	} catch {
		return valorPredeterminado;
	}
}

function leerConfiguracion() {
	const config = leerJson(configPath, null);
	if (!config?.endpoint || !config?.secret) {
		throw new Error(`Configura endpoint y secret en ${configPath}`);
	}
	return config;
}

function leerEstado() {
	return {
		existe: fs.existsSync(statePath),
		idsConfirmados: new Set((leerJson(statePath, { idsConfirmados: [] }).idsConfirmados || []).map(Number).filter(Number.isFinite)),
	};
}

function guardarEstado(idsConfirmados) {
	const ids = [...idsConfirmados].slice(-20000);
	fs.writeFileSync(statePath, JSON.stringify({ idsConfirmados: ids, actualizadoEn: new Date().toISOString() }, null, 2));
}

function leerAccess() {
	return new Promise((resolve, reject) => {
		const lector = resolverRutaLector({
			empaquetada: app.isPackaged,
			recursos: process.resourcesPath,
			directorio: __dirname,
		});
		execFile(powershell32, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", lector], { windowsHide: true, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) return reject(new Error(stderr || error.message));
			const salida = stdout.trim();
			if (!salida) return resolve([]);
			try {
				const datos = JSON.parse(salida);
				resolve(Array.isArray(datos) ? datos : [datos]);
			} catch {
				reject(new Error("La lectura de Access no devolvió JSON válido"));
			}
		});
	});
}

async function enviarLote(config, lote) {
	const respuesta = await fetch(config.endpoint, {
		method: "POST",
		headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" },
		body: JSON.stringify(lote),
	});
	const cuerpo = await respuesta.text();
	let datos;
	try { datos = JSON.parse(cuerpo); } catch { datos = { error: cuerpo }; }
	if (!respuesta.ok || datos.estado !== "guardado") {
		throw new Error(datos.error || `HTTP ${respuesta.status}`);
	}
}

async function poll() {
	if (ejecutando) return;
	ejecutando = true;
	try {
		const config = leerConfiguracion();
		const filas = await leerAccess();
		const estado = leerEstado();
		const idsConfirmados = estado.idsConfirmados;
		const importarFolio = String(config.importarFolio || "").trim();

		if (!estado.existe) {
			filas.forEach((fila) => idsConfirmados.add(Number(fila.Id)));
			if (importarFolio) {
				filas.filter((fila) => String(fila.Folio) === importarFolio).forEach((fila) => idsConfirmados.delete(Number(fila.Id)));
			}
			guardarEstado(idsConfirmados);
			if (!importarFolio) {
				escribirLog(`Línea base creada con ${idsConfirmados.size} resultados existentes.`);
				actualizarEstado("línea base creada; esperando resultados nuevos");
				return;
			}
		}

		const lotes = crearLotesPendientes(filas, idsConfirmados)
			.filter((lote) => !importarFolio || lote.folio === importarFolio);
		let enviados = 0;
		for (const lote of lotes) {
			await enviarLote(config, lote);
			lote.resultados.forEach(({ id }) => idsConfirmados.add(id));
			guardarEstado(idsConfirmados);
			enviados += 1;
		}
		actualizarEstado(`conectado${enviados ? ` (${enviados} lote(s) enviado(s))` : ""}`);
		if (enviados) escribirLog(`Se confirmaron ${enviados} lote(s).`);
	} catch (error) {
		const mensaje = error instanceof Error ? error.message : String(error);
		escribirLog(`ERROR ${mensaje}`);
		actualizarEstado("requiere atención; revisa el log");
	} finally {
		ejecutando = false;
	}
}

function crearTray() {
	try {
		tray = new Tray(nativeImage.createEmpty());
		tray.setToolTip("CalifornIA Swelab: iniciando");
		tray.setContextMenu(Menu.buildFromTemplate([
			{ label: "Leer ahora", click: () => void poll() },
			{ label: "Abrir datos y configuración", click: () => { asegurarDirectorio(); shell.openPath(dataDir); } },
			{ type: "separator" },
			{ label: "Salir", click: () => app.quit() },
		]));
	} catch (error) {
		escribirLog(`ERROR No se pudo crear la bandeja: ${error.message}`);
	}
}

function crearVentana() {
	ventana = new BrowserWindow({ width: 460, height: 260, resizable: false });
	ventana.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
		<!doctype html><html><body style="font-family:Segoe UI,sans-serif;padding:28px;color:#1f2937">
		<h2>CalifornIA Swelab</h2><p>Estado: <strong id="estado">iniciando</strong></p>
		<p>La configuración y el registro están en:<br><code>${dataDir}</code></p>
		<button onclick="location.reload()">Actualizar vista</button>
		</body></html>` )}`);
}

app.whenReady().then(() => {
	asegurarDirectorio();
	escribirLog(`Agente iniciado desde ${process.execPath}`);
	crearVentana();
	crearTray();
	if (app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR) {
		app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
	}
	actualizarEstado("leyendo Access");
	void poll();
	setInterval(() => void poll(), 30000);
});

process.on("uncaughtException", (error) => escribirLog(`ERROR no controlado: ${error.message}`));
