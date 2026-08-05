import { resolverRutaLector } from "./reader-path.cjs";
import path from "path";

describe("resolverRutaLector", () => {
	test("usa la copia desempaquetada del script en Windows instalado", () => {
		expect(resolverRutaLector({ empaquetada: true, recursos: "C:\\App\\resources", directorio: "C:\\App\\resources\\app.asar", unir: path.win32.join }))
			.toBe("C:\\App\\resources\\app.asar.unpacked\\read-swelab.ps1");
	});
});
