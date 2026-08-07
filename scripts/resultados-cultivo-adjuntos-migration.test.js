import fs from "fs";
import path from "path";

const migrationPath = path.resolve(
	process.cwd(),
	"supabase/migrations/20260806120000_resultados_cultivo_adjuntos.sql",
);
const integrationCheckPath = path.resolve(
	process.cwd(),
	"scripts/verify-resultados-cultivo-adjuntos-integration.sh",
);

describe("resultados cultivo adjuntos migration", () => {
	test("persists one PDF per cultivo study and exposes it through the authorized portal RPC", () => {
		const migration = fs.readFileSync(migrationPath, "utf8");

		expect(migration).toMatch(/create table if not exists public\.resultados_cultivo_adjuntos/i);
		expect(migration).toMatch(/id_estudio_venta integer not null unique/i);
		expect(migration).toMatch(/on delete cascade/i);
		expect(migration).toMatch(/archivo_path = id_estudio_venta::text \|\| '\/cultivo\.pdf'/i);
		expect(migration).not.toMatch(/archivo_url text not null/i);
		expect(migration).toMatch(/drop column if exists archivo_url/i);
		expect(migration).toMatch(/mime_type = 'application\/pdf'/i);
		expect(migration).toMatch(/size_bytes <= 25 \* 1024 \* 1024/i);
		expect(migration).toMatch(/'resultados-cultivo-adjuntos'/i);
		expect(migration).toMatch(/false,\s*25 \* 1024 \* 1024,\s*array\['application\/pdf'\]/i);
		expect(migration).toMatch(/public = false/i);
		expect(migration).toMatch(/es_usuario_resultados_cultivo_activo/i);
		expect(migration).toMatch(/'quimico', 'tecnico', 'administrador', 'admin', 'desarrollador'/i);
		expect(migration).toMatch(/for (?:select|insert|update|delete)/i);
		expect(migration).toMatch(/id_estudio_venta::text \|\| '\/cultivo\.pdf' = storage\.objects\.name/i);
		expect(migration).toMatch(/archivo_cultivo_path/i);
		expect(migration).not.toMatch(/archivo_cultivo_url/i);
		expect(migration).toMatch(/revoke all on function public\.buscar_resultados_portal\(text, text\) from anon, authenticated/i);
		expect(migration).not.toMatch(/grant execute on function public\.buscar_resultados_portal\(text, text\) to anon, authenticated/i);
		expect(migration).toMatch(/rca\.archivo_path = ev\.id_estudio_venta::text \|\| '\/cultivo\.pdf'/i);
		expect(migration).toMatch(/lower\(coalesce\(ev\.descripcion_estudio, ''\)\) like '%cultivo%'/i);
		expect(migration).toMatch(/coalesce\(btrim\(ev\.resultados\), ''\) not in \('', '\{\}'\)\s*or/i);
		expect(fs.readFileSync(integrationCheckPath, "utf8")).toContain("PARTIAL STORAGE SMOKE TEST");
	});
});
