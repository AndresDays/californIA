import { readFileSync } from "fs";
import { join } from "path";

const leer = (archivo) => readFileSync(join(process.cwd(), "src/pages/radiologia/pages", archivo), "utf8");

describe("layout de reporte externo", () => {
	it("mantiene la geometría del visor sin importar sus estilos contextuales", () => {
		const componente = leer("./ReporteRadiologia.jsx");
		const estilos = leer("./ReporteRadiologia.css");

		expect(componente).not.toContain('import "./VisorDicom.css"');
		expect(componente).not.toContain('vd-rr-');
		expect(estilos).toMatch(/\.rr-page\s*\{[\s\S]*?width:\s*min\(100%,\s*794px\);[\s\S]*?min-height:\s*1123px;/);
		expect(estilos).toMatch(/\.rr-contenido\s*\{[\s\S]*?padding:\s*135px\s+64px\s+64px;[\s\S]*?min-height:\s*1123px;/);
		expect(estilos).toMatch(/\.rr-editor\s*\{[\s\S]*?min-height:\s*400px;/);
		expect(estilos).toMatch(/@media print\s*\{[\s\S]*?\.rr-page\s*\{[\s\S]*?width:\s*210mm;[\s\S]*?height:\s*297mm;/);
	});
});
