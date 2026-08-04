import fs from "node:fs";
import path from "node:path";

test("la semilla de Veterinaria asigna todos los estudios a CDC", () => {
	const seed = fs.readFileSync(
		path.resolve("supabase/migrations/20260511128000_seed_veterinaria_estudios_imagen.sql"),
		"utf8",
	);

	expect(seed).not.toMatch(/'CDI', 'veterinaria'/);
	expect(seed).toMatch(/'CDC', 'veterinaria'/);
});

test("la migración vincula el tipo Veterinaria a Central Diagnóstica California", () => {
	const migration = fs.readFileSync(
		path.resolve("supabase/migrations/20260803170000_mover_veterinaria_a_cdc.sql"),
		"utf8",
	);

	expect(migration).toMatch(/empresa_tipos_estudio/);
	expect(migration).toMatch(/set id_empresa = empresa.id_empresa/);
	expect(migration).toMatch(/Veterinaria/);
	expect(migration).toMatch(/CENTRAL DIAGNOSTICA CALIFORNIA/);
});

test("el modal de paciente ofrece opciones de sexo inclusivas", () => {
	const modal = fs.readFileSync(
		path.resolve("src/pages/laboratorio/componentes/modal-agregar-paciente.jsx"),
		"utf8",
	);

	expect(modal).toMatch(/value="otro"/);
	expect(modal).toMatch(/value="prefiero_no_decirlo"/);
});
