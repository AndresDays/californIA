// La edad y la fecha de nacimiento se calculaban a mano en cada pantalla que
// las imprime, y cada copia decidía distinto qué hacer sin fecha. Aquí queda
// una sola versión para los tickets.

export const calcularEdadPaciente = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const nacimiento = new Date(fechaNacimiento);
	if (Number.isNaN(nacimiento.getTime())) return "";
	const hoy = new Date();
	let edad = hoy.getFullYear() - nacimiento.getFullYear();
	const mes = hoy.getMonth() - nacimiento.getMonth();
	if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
	return edad >= 0 ? `${edad} años` : "";
};

export const formatearFechaNacimiento = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const fecha = new Date(fechaNacimiento);
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
