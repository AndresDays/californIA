// La visitadora ya tiene meses capturados en Excel. En lugar de pedirle que los
// recapture, se leen sus dos formatos tal cual los entrega. La lectura nunca
// escribe directo: regresa las filas y las advertencias para que la pantalla
// muestre una revisión previa y la persona confirme.
import * as XLSX from "xlsx";

// Los encabezados del archivo real, con emoji incluido. Se exportan para que la
// exportación genere exactamente los mismos y los archivos sean intercambiables.
export const ENCABEZADOS_INFORME = [
	"📅 Fecha",
	"👨‍⚕️ Médico / Empresa",
	"🩺 Especialidad / Giro",
	"📍 Ubicación",
	"📝 Actividades",
	"💬 Comentarios del Médico",
	"🔍 Observaciones",
	"✍🏻 Seguimiento",
	"Tipo de convenio",
];

export const ENCABEZADOS_PROGRAMACION = ["Día", "Zona", "Médicos programados", "Objetivos"];

const CAMPOS_INFORME = [
	"fecha",
	"medico_nombre",
	"especialidad",
	"ubicacion",
	"actividades",
	"comentarios_medico",
	"observaciones",
	"seguimiento",
	"tipo_convenio",
];

const DIAS = {
	lunes: 1,
	martes: 2,
	miercoles: 3,
	jueves: 4,
	viernes: 5,
	sabado: 6,
	domingo: 7,
};

// Quita emoji, acentos y espacios de más para que "📅 Fecha" y "fecha " se
// reconozcan igual. Los encabezados vienen escritos a mano y varían.
const normalizarEncabezado = (valor) =>
	String(valor ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-zA-Z0-9\s/]/g, " ")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

const texto = (valor) => String(valor ?? "").trim();

const renglonVacio = (fila = []) => fila.every((celda) => texto(celda) === "");

const aFilas = (hoja) =>
	XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: "", blankrows: true });

// Se busca el renglón de encabezados en lugar de asumir que siempre es el
// tercero: entre un archivo y otro cambia cuántas filas de título trae arriba.
const buscarEncabezados = (filas, requeridos) => {
	for (let indice = 0; indice < Math.min(filas.length, 15); indice += 1) {
		const normalizados = (filas[indice] || []).map(normalizarEncabezado);
		if (requeridos.every((clave) => normalizados.some((celda) => celda.includes(clave)))) {
			return indice;
		}
	}
	return -1;
};

// Excel cuenta los días desde el 1900 y arrastra un error histórico: cree que
// 1900 fue bisiesto, así que los seriales anteriores al 60 van corridos un día.
// Se convierte a mano en lugar de usar XLSX.SSF, que no está expuesto de forma
// confiable en todos los entornos donde corre este código.
const fechaDesdeSerialExcel = (serial) => {
	const dias = Math.floor(serial);
	const baseUTC = dias <= 59 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
	const fecha = new Date(baseUTC + dias * 86400000);
	if (Number.isNaN(fecha.getTime())) return "";
	return fecha.toISOString().slice(0, 10);
};

const fechaDesdeCelda = (valor) => {
	if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
		return valor.toISOString().slice(0, 10);
	}
	// Según cómo se haya leído el libro, la misma celda llega como Date o como
	// el número de serie de Excel. Se aceptan las dos formas.
	if (typeof valor === "number" && Number.isFinite(valor) && valor > 0) {
		return fechaDesdeSerialExcel(valor);
	}
	const crudo = texto(valor);
	if (!crudo) return "";
	if (/^\d{4}-\d{2}-\d{2}/.test(crudo)) return crudo.slice(0, 10);
	const conBarras = crudo.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (conBarras) {
		const [, dia, mes, anio] = conBarras;
		return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
	}
	return "";
};

// Excel convierte un "6" suelto en el serial 6, o sea 1900-01-06. Importar eso
// en silencio metería una visita de hace más de un siglo en el informe.
const fechaSospechosa = (fecha) => Number(String(fecha).slice(0, 4)) < 2000;

export const separarMedicosProgramados = (celda) =>
	String(celda ?? "")
		.split(/\n|\r|\s{2,}/)
		.map((nombre) => nombre.trim())
		.filter(Boolean);

export const leerInformeVisitas = (libro) => {
	const filas = [];
	const advertencias = [];

	for (const nombreHoja of libro?.SheetNames ?? []) {
		const crudas = aFilas(libro.Sheets[nombreHoja]);
		const indiceEncabezados = buscarEncabezados(crudas, ["fecha", "medico"]);

		if (indiceEncabezados === -1) {
			advertencias.push({
				hoja: nombreHoja,
				renglon: null,
				motivo: "No se encontraron los encabezados del informe en esta hoja.",
			});
			continue;
		}

		for (let indice = indiceEncabezados + 1; indice < crudas.length; indice += 1) {
			const cruda = crudas[indice] || [];
			const renglon = indice + 1;
			if (renglonVacio(cruda)) continue;

			const avisar = (motivo) => advertencias.push({ hoja: nombreHoja, renglon, motivo });
			const medico = texto(cruda[1]);
			const fecha = fechaDesdeCelda(cruda[0]);

			if (!medico) {
				avisar("El renglón no trae médico ni empresa.");
				continue;
			}
			if (!fecha) {
				avisar("El renglón no trae fecha.");
				continue;
			}
			if (fechaSospechosa(fecha)) {
				avisar(`La fecha ${fecha} no parece válida. Revísala en el Excel antes de importar.`);
				continue;
			}

			const visita = { hoja: nombreHoja, renglon };
			CAMPOS_INFORME.forEach((campo, columna) => {
				visita[campo] = campo === "fecha" ? fecha : texto(cruda[columna]);
			});
			filas.push(visita);
		}
	}

	return { filas, advertencias };
};

export const leerProgramacionSemanal = (libro) => {
	const filas = [];
	const advertencias = [];

	for (const nombreHoja of libro?.SheetNames ?? []) {
		const crudas = aFilas(libro.Sheets[nombreHoja]);
		const indiceEncabezados = buscarEncabezados(crudas, ["dia", "zona"]);

		if (indiceEncabezados === -1) {
			advertencias.push({
				hoja: nombreHoja,
				renglon: null,
				motivo: "No se encontraron los encabezados de la programación en esta hoja.",
			});
			continue;
		}

		for (let indice = indiceEncabezados + 1; indice < crudas.length; indice += 1) {
			const cruda = crudas[indice] || [];
			const renglon = indice + 1;
			if (renglonVacio(cruda)) continue;

			const dia = DIAS[normalizarEncabezado(cruda[0])];
			if (!dia) {
				advertencias.push({
					hoja: nombreHoja,
					renglon,
					motivo: `No se reconoce el día "${texto(cruda[0])}".`,
				});
				continue;
			}

			filas.push({
				hoja: nombreHoja,
				renglon,
				dia_semana: dia,
				zona: texto(cruda[1]),
				medicos_programados: separarMedicosProgramados(cruda[2]),
				objetivos: texto(cruda[3]),
			});
		}
	}

	return { filas, advertencias };
};
