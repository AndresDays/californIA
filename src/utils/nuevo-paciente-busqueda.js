const limpiarValores = (valores) =>
	valores
		.map((valor) => (valor === null || valor === undefined ? "" : String(valor).trim()))
		.filter(Boolean);

export const formatearPacienteBusqueda = (paciente) =>
	limpiarValores([
		paciente?.telefono,
		paciente?.edad ? `${paciente.edad} años` : "",
		paciente?.sexo,
	]);

export const formatearDoctorBusqueda = (doctor) => ({
	nombre: doctor?.nombre ? `Dr. ${doctor.nombre}` : "Doctor",
	detalles: limpiarValores([doctor?.telefono, doctor?.email]),
});
