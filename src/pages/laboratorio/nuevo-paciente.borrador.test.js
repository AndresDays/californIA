import { readFileSync } from "fs";

// El alta de nuevo paciente es una pantalla grande con muchas dependencias; en
// lugar de montarla, se verifica que sus campos usen el borrador persistente,
// que es lo que evita perder la captura al cambiar de pestaña o de app.
const fuente = readFileSync(require.resolve("./nuevo-paciente.jsx"), "utf8");

describe("nuevo-paciente: borrador de la captura", () => {
	test.each([
		"nombreCompleto",
		"edad",
		"sexo",
		"telefono",
		"correo",
		"rfc",
		"doctorBusqueda",
		"doctorSeleccionado",
		"pacienteSeleccionado",
		"observaciones",
	])("el campo %s se guarda mientras se captura", (campo) => {
		expect(fuente).toContain(`useCampoPersistente(\`\${BORRADOR}${campo}\``);
	});

	// El cobro es parte de la captura: volver a la pestaña no debe dejar la
	// solicitud sin forma de pago, descuento ni el pago ya recibido.
	test.each([
		"formaPago",
		"descuentoPercent",
		"pagoRecibido",
		"agregarASalaEspera",
		"destinoTurno",
		"destinoTurnoManual",
		"prioridadTurno",
		"tarjetaUltimos4",
		"codigoAprobacion",
	])("el dato de pago %s se guarda mientras se captura", (campo) => {
		expect(fuente).toContain(`useCampoPersistente(\`\${BORRADOR}${campo}\``);
	});

	test("la forma de pago vuelve a efectivo al registrar la solicitud", () => {
		expect(fuente).toContain('setFormaPago("efectivo")');
	});

	test("el borrador se limpia al registrar la solicitud", () => {
		expect(fuente).toContain("limpiarBorradorPersistente(BORRADOR)");
	});

	test("el modal de alta se reabre si el navegador descarta la página", () => {
		expect(fuente).toContain('useModalPersistente("modal-paciente:abierto:nuevo-paciente")');
	});

	test("al registrar la solicitud tampoco queda pendiente el alta de los modales", () => {
		expect(fuente).toContain('limpiarBorradorPersistente("modal-paciente:")');
		expect(fuente).toContain('limpiarBorradorPersistente("modal-doctor:")');
	});
});
