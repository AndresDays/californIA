import { esSucursalMascota } from "./datos-quimico";
import fs from "fs";
import { PNG } from "pngjs";

describe("datos del quimico", () => {
	test("identifica Mascota por su id de sucursal", () => {
		expect(esSucursalMascota({ id_sucursal: 3 })).toBe(true);
	});

	test("no confunde Principal ni Ixtapa con Mascota", () => {
		expect(esSucursalMascota({ id_sucursal: 1 })).toBe(false);
		expect(esSucursalMascota({ id_sucursal: 2 })).toBe(false);
	});

	test.each([
		"datos-quimico-general-transparente.png",
		"datos-quimico-mascota-transparente.png",
	])("conserva transparencia real en %s", (archivo) => {
		const png = PNG.sync.read(fs.readFileSync(`src/assets/${archivo}`));
		const hayPixelesTransparentes = png.data.some((valor, indice) => indice % 4 === 3 && valor === 0);
		expect(hayPixelesTransparentes).toBe(true);
	});
});
