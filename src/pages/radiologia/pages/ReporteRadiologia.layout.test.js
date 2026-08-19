import { readFileSync } from "fs";
import { join } from "path";

const leer = (archivo) => readFileSync(join(process.cwd(), "src/pages/radiologia/pages", archivo), "utf8");

describe("layout de reporte externo", () => {
	it("usa la misma geometría del visor para nueva pestaña e impresión", () => {
		const componente = leer("./ReporteRadiologia.jsx");
		const estilos = leer("./ReporteRadiologia.css");

		expect(componente).toContain('import "./VisorDicom.css"');
		expect(componente).toContain('rr-page-wrapper vd-rr-page-wrapper');
		expect(componente).toContain('rr-page vd-rr-page');
		expect(componente).toContain('rr-contenido vd-rr-contenido');
		expect(componente).toContain('rr-editor vd-rr-editor');
		expect(estilos).toMatch(/\.rr-page\s*\{[\s\S]*?width:\s*794px;[\s\S]*?height:\s*1123px;/);
		expect(estilos).toMatch(/\.rr-contenido\s*\{[\s\S]*?height:\s*1123px;/);
	});
});
