// El conteo que ella quiere leer: cuántos pacientes distintos le mandó cada
// médico en el periodo, cuántas órdenes generaron y cuánto facturaron.
import * as XLSX from "xlsx";

const numero = (valor) => {
	const convertido = Number(valor);
	return Number.isFinite(convertido) ? convertido : 0;
};

const esVentaActiva = (venta) =>
	String(venta?.estado ?? "activo").trim().toLowerCase() === "activo";

// Un paciente que volvió tres veces en el mes es un paciente, no tres: por eso
// se cuentan pacientes distintos y las órdenes van en su propia columna. La
// venta sin `id_paciente` (captura rápida de mostrador) cuenta como paciente
// propio, porque alguien fue a hacerse el estudio.
export const construirReferidos = ({ ventas = [], medicos = [] } = {}) => {
	const porDoctor = new Map();
	for (const venta of ventas) {
		if (!venta?.id_doctor || !esVentaActiva(venta)) continue;
		const clave = String(venta.id_doctor);
		if (!porDoctor.has(clave)) {
			porDoctor.set(clave, { pacientes: new Set(), sueltas: 0, ordenes: 0, facturado: 0 });
		}
		const fila = porDoctor.get(clave);
		if (venta.id_paciente) fila.pacientes.add(String(venta.id_paciente));
		else fila.sueltas += 1;
		fila.ordenes += 1;
		fila.facturado += numero(venta.total);
	}

	const datosMedico = new Map(medicos.map((medico) => [String(medico.id_doctor), medico]));

	return [...porDoctor.entries()]
		.map(([idDoctor, fila]) => {
			const medico = datosMedico.get(idDoctor);
			return {
				id_doctor: Number(idDoctor),
				nombre: medico?.nombre_completo ?? `Médico ${idDoctor}`,
				especialidad: medico?.especialidad ?? "",
				zona: medico?.zona ?? "",
				tipo_convenio: medico?.tipo_convenio ?? "",
				pacientes: fila.pacientes.size + fila.sueltas,
				ordenes: fila.ordenes,
				facturado: Math.round(fila.facturado * 100) / 100,
			};
		})
		.sort((uno, otro) => otro.pacientes - uno.pacientes || otro.facturado - uno.facturado);
};

export const totalesReferidos = (filas = []) =>
	filas.reduce(
		(suma, fila) => ({
			medicos: suma.medicos + 1,
			pacientes: suma.pacientes + fila.pacientes,
			ordenes: suma.ordenes + fila.ordenes,
			facturado: Math.round((suma.facturado + fila.facturado) * 100) / 100,
		}),
		{ medicos: 0, pacientes: 0, ordenes: 0, facturado: 0 },
	);

const COLUMNAS = ["Médico", "Especialidad", "Zona", "Convenio", "Pacientes", "Órdenes", "Facturado"];

export const exportarReferidosExcel = (filas, { desde, hasta } = {}, nombreArchivo = "Pacientes_referidos") => {
	const hoja = XLSX.utils.aoa_to_sheet([
		["PACIENTES REFERIDOS POR MÉDICO"],
		[`Del ${desde} al ${hasta}`],
		[],
		COLUMNAS,
		...filas.map((fila) => [
			fila.nombre,
			fila.especialidad,
			fila.zona,
			fila.tipo_convenio,
			fila.pacientes,
			fila.ordenes,
			fila.facturado,
		]),
	]);
	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, "Referidos");
	XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
};
