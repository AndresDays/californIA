import { objetivosDeFecha, textoDeObjetivos } from "./use-objetivos-periodo";

const objetivos = [
	{ id_objetivo: "o1", desde: "2026-09-21", hasta: "2026-09-27", texto: "Levantar pedido de órdenes" },
	{ id_objetivo: "o2", desde: "2026-09-23", hasta: "2026-09-23", texto: "Presentar el paquete nuevo" },
	{ id_objetivo: "o3", desde: "2026-09-28", hasta: "2026-10-02", texto: "Cobranza" },
];

// El de la semana aplica a cada día de esa semana; el del día, sólo a ése.
test("una fecha toma los objetivos de su semana y los de ese día", () => {
	expect(objetivosDeFecha(objetivos, "2026-09-23").map((fila) => fila.id_objetivo)).toEqual(["o1", "o2"]);
	expect(objetivosDeFecha(objetivos, "2026-09-22").map((fila) => fila.id_objetivo)).toEqual(["o1"]);
});

test("fuera del rango no aplica ninguno", () => {
	expect(objetivosDeFecha(objetivos, "2026-10-05")).toEqual([]);
});

test("sin fecha no inventa objetivos", () => {
	expect(objetivosDeFecha(objetivos, "")).toEqual([]);
	expect(objetivosDeFecha([], "2026-09-23")).toEqual([]);
});

test("el texto se arma en renglones", () => {
	expect(textoDeObjetivos(objetivosDeFecha(objetivos, "2026-09-23"))).toBe(
		"Levantar pedido de órdenes\nPresentar el paquete nuevo",
	);
});

test("los objetivos vacíos no dejan renglones sueltos", () => {
	expect(textoDeObjetivos([{ texto: "  " }, { texto: "Uno" }])).toBe("Uno");
});
