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

	test("radiologo clinico puede subir e interpretar sin asignar responsables", () => {
		const radiologoClinico = { rol: "radiologo_clinico" };
		expect(puedeSubirImagenRadiologia(radiologoClinico)).toBe(true);
		expect(puedeInterpretarRadiologia(radiologoClinico)).toBe(true);
		expect(puedeAsignarRadiologia(radiologoClinico)).toBe(false);
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

// El cliente de convenio ve radiología como el médico externo, pero acotado por
// su convenio: los estudios traen el cliente de la orden con que se capturaron.
describe("cliente de convenio en radiologia", () => {
	const cliente = { rol: "cliente_imagen", id_cliente: 7 };

	test("solo ve los estudios de su convenio", () => {
		expect(obtenerRestriccionDoctorExterno(cliente)).toEqual({
			columna: "id_cliente",
			valor: 7,
		});
	});

	// Sin convenio en la sesión no se ve nada: la restricción con valor nulo es
	// lo que el dashboard usa para no listar ningún estudio.
	test("sin convenio no ve ningun estudio", () => {
		expect(obtenerRestriccionDoctorExterno({ rol: "cliente_imagen" })).toEqual({
			columna: "id_cliente",
			valor: null,
		});
	});

	test("no interpreta, no asigna y no sube imagenes", () => {
		expect(puedeInterpretarRadiologia(cliente)).toBe(false);
		expect(puedeAsignarRadiologia(cliente)).toBe(false);
		expect(puedeSubirImagenRadiologia(cliente)).toBe(false);
	});

	test("si puede leer el reporte del estudio", () => {
		expect(puedeVerReporteRadiologia(cliente)).toBe(true);
	});
});
