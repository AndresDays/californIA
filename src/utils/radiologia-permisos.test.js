import {
	esDoctorExterno,
	obtenerRestriccionDoctorExterno,
	puedeAsignarRadiologia,
	puedeEditarReporteRadiologia,
	puedeInterpretarRadiologia,
	puedeSubirImagenRadiologia,
	esDoctorAsignableRadiologia,
} from "./radiologia-permisos";

describe("radiologia-permisos", () => {
	test("detecta doctores externos por rol normalizado", () => {
		expect(esDoctorExterno("doctor_externo")).toBe(true);
		expect(esDoctorExterno("Médico Externo")).toBe(true);
		expect(esDoctorExterno("medico")).toBe(false);
	});

	test("limita el dashboard del doctor externo al doctor ligado a su cuenta", () => {
		const restriccion = obtenerRestriccionDoctorExterno({
			rol: "doctor_externo",
			id_doctor: 42,
		});

		expect(restriccion).toEqual({ columna: "id_doctor", valor: 42 });
	});

	test("no permite interpretar ni editar reporte a doctores externos", () => {
		const doctorExterno = { rol: "doctor_externo" };

		expect(puedeInterpretarRadiologia(doctorExterno)).toBe(false);
		expect(puedeEditarReporteRadiologia(doctorExterno)).toBe(false);
	});

	test("permite herramientas de visualizacion pero no subida de imagen a doctores externos", () => {
		expect(puedeSubirImagenRadiologia({ rol: "doctor_externo" })).toBe(false);
		expect(puedeSubirImagenRadiologia({ rol: "tecnico_radiologia" })).toBe(true);
	});

	test("admin y radiologo pueden asignar responsables aunque el rol venga con texto de UI", () => {
		expect(puedeAsignarRadiologia({ rol: "Administrador" })).toBe(true);
		expect(puedeAsignarRadiologia({ rol: "Radiólogo - Director" })).toBe(true);
		expect(puedeAsignarRadiologia({ rol: "Radiologo" })).toBe(true);
	});

	test("solo doctores particulares o instituciones son asignables desde radiologia", () => {
		expect(esDoctorAsignableRadiologia({ tipo_doctor: "particular" })).toBe(true);
		expect(esDoctorAsignableRadiologia({ tipo_doctor: "institucion", institucion: "IMSS" })).toBe(true);
		expect(esDoctorAsignableRadiologia({ tipo_doctor: "interno" })).toBe(false);
		expect(esDoctorAsignableRadiologia({ nombre: "Sin tipo" })).toBe(false);
	});
});
