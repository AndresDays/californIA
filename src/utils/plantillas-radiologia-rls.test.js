import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
	process.cwd(),
	"supabase/migrations/20260807130000_plantillas_radiologia_compartidas.sql",
);

describe("políticas de plantillas compartidas de radiología", () => {
	test("permite leer las compartidas y restringe la publicación a roles autorizados", () => {
		expect(existsSync(migrationPath)).toBe(true);

		const migration = readFileSync(migrationPath, "utf8");
		expect(migration).toContain("es_publicador_plantillas_radiologia");
		expect(migration).toContain("visibilidad = 'organizacion'");
		expect(migration).toContain("'radiologo_director'");
		expect(migration).toContain("'administrador'");
		expect(migration).toContain("plantillas_radiologia_insert_publicadores");
		expect(migration).toContain("d.es_radiologo = true");
	});
});
