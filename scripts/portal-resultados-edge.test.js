import fs from "fs";
import path from "path";

const edgePath = path.resolve(
	process.cwd(),
	"supabase/functions/portal-resultados/index.ts",
);

describe("portal-resultados Edge Function contract", () => {
	test("autoriza con el RPC seguro antes de firmar rutas deterministas y nunca devuelve paths", () => {
		const edge = fs.readFileSync(edgePath, "utf8");
		const rpcSeguro = edge.indexOf('portal.rpc("buscar_resultados_portal_seguro"');
		const retornoNoAutorizado = edge.indexOf("if (!resultado?.autorizado) return responder(resultado);");
		const firmaStorage = edge.indexOf(".createSignedUrl(path, URL_EXPIRY_SECONDS)");

		expect(rpcSeguro).toBeGreaterThan(-1);
		expect(retornoNoAutorizado).toBeGreaterThan(rpcSeguro);
		expect(firmaStorage).toBeGreaterThan(retornoNoAutorizado);
		expect(edge).toMatch(/const URL_EXPIRY_SECONDS = 60;/);
		expect(edge).toMatch(/\^\[0-9\]\+\\\/cultivo\\\.pdf\$/);
		expect(edge).toContain("archivo_cultivo_path: _path");
		expect(edge).toContain("return responder(sinPaths({ ...resultado, estudios }));");
	});
});
