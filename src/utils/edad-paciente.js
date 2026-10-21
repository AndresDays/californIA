// La edad y la fecha de nacimiento se calculaban a mano en cada pantalla que
// las imprime, y cada copia decidía distinto qué hacer sin fecha. Aquí queda
// una sola versión para los tickets.

// Una fecha de nacimiento es un día del calendario, no un instante: leída con
// new Date("1994-10-24") queda a medianoche UTC, que en México todavía es el
// 23, y el ticket salía con un día menos. Se toma el año, el mes y el día tal
// como vienen y se arma la fecha en hora local.
export const leerFechaCalendario = (valor) => {
	if (!valor) return new Date(Number.NaN);
	if (valor instanceof Date) return valor;
	const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (coincidencia) {
		const [, anio, mes, dia] = coincidencia;
		return new Date(Number(anio), Number(mes) - 1, Number(dia));
	}
	return new Date(valor);
};

export const calcularEdadPaciente = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const nacimiento = leerFechaCalendario(fechaNacimiento);
	if (Number.isNaN(nacimiento.getTime())) return "";
	const hoy = new Date();
	let edad = hoy.getFullYear() - nacimiento.getFullYear();
	const mes = hoy.getMonth() - nacimiento.getMonth();
	if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
	return edad >= 0 ? `${edad} años` : "";
};

export const formatearFechaNacimiento = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const fecha = leerFechaCalendario(fechaNacimiento);
	if (Number.isNaN(fecha.getTime())) return "";
	return fecha.toLocaleDateString("es-MX", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

// Un teléfono de puros ceros es lo que se teclea cuando el paciente no dio
// ninguno: imprimirlo en el ticket es peor que dejar el renglón fuera, porque
// parece un dato bueno y con él no se llega al portal de resultados.
export const telefonoUtilizable = (telefono) => {
	const digitos = String(telefono ?? "").replace(/\D/g, "");
	if (digitos.length < 10) return "";
	if (/^0+$/.test(digitos)) return "";
	return String(telefono);
};
