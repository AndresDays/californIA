import { formatearFechaNacimiento, leerFechaCalendario } from "./edad-paciente";

// La fecha de nacimiento es un día del calendario: leída como instante UTC,
// en México salía un día antes (24/10/1994 se imprimía 23/10/1994). El error
// sólo aparece fuera de UTC: con TZ=America/Mexico_City estas pruebas fallan
// con la lectura anterior.
describe("fecha de nacimiento como día del calendario", () => {
	test("el ticket imprime el mismo día que se capturó", () => {
		expect(formatearFechaNacimiento("1994-10-24")).toBe("24/10/1994");
	});

	test("leerFechaCalendario respeta año, mes y día", () => {
		const fecha = leerFechaCalendario("1994-10-24");
		expect([fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]).toEqual([1994, 10, 24]);
	});
});
