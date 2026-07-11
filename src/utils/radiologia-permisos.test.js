import {
	esDoctorExterno,
	obtenerRestriccionDoctorExterno,
	puedeAsignarRadiologia,
	puedeEditarReporteRadiologia,
	puedeInterpretarRadiologia,
	puedeVerReporteRadiologia,
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

	test("doctor externo no radiologo solo puede ver reporte", () => {
		const doctorExterno = { rol: "doctor_externo" };

		expect(puedeInterpretarRadiologia(doctorExterno)).toBe(false);
		expect(puedeEditarReporteRadiologia(doctorExterno)).toBe(false);
		expect(puedeVerReporteRadiologia(doctorExterno)).toBe(true);
	});

	test("doctor externo radiologo puede interpretar y editar reporte", () => {
		const doctorExternoRadiologo = { rol: "doctor_externo", es_radiologo: true };

		expect(puedeInterpretarRadiologia(doctorExternoRadiologo)).toBe(true);
		expect(puedeEditarReporteRadiologia(doctorExternoRadiologo)).toBe(true);
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

	test("permite asignar doctores externos desde radiologia", () => {
		expect(esDoctorAsignableRadiologia({ tipo_doctor: "particular" })).toBe(true);
		expect(esDoctorAsignableRadiologia({ tipo_doctor: "institucion", institucion: "IMSS" })).toBe(true);
		expect(esDoctorAsignableRadiologia({ nombre: "Sin tipo" })).toBe(true);
		expect(esDoctorAsignableRadiologia({ nombre: "Radiologo externo", es_radiologo: true })).toBe(true);
		expect(esDoctorAsignableRadiologia({ nombre: "Inactivo", activo: false })).toBe(false);
	});
});
