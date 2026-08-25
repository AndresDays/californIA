import { cargarClavesConPrecioCliente } from "./precios-cliente";

const supabaseFalso = (paginas) => {
	const llamadas = [];
	return {
		llamadas,
		from: () => ({
			select: () => ({
				eq: () => ({
					range: (desde, hasta) => {
						llamadas.push([desde, hasta]);
						const pagina = paginas.shift();
						return Promise.resolve(
							pagina?.error
								? { data: null, error: pagina.error }
								: { data: pagina || [], error: null },
						);
					},
				}),
			}),
		}),
	};
};

test("sin cliente no filtra", async () => {
	await expect(cargarClavesConPrecioCliente(supabaseFalso([]), "")).resolves.toBeNull();
});

test("regresa las claves normalizadas del cliente", async () => {
	const supabase = supabaseFalso([[{ clave: "us-01" }, { clave: " US-02 " }, { clave: "" }]]);

	const claves = await cargarClavesConPrecioCliente(supabase, "IMSS");

	expect(claves).toEqual(new Set(["US-01", "US-02"]));
});

test("pagina hasta traer toda la lista de precios", async () => {
	const primeraPagina = Array.from({ length: 1000 }, (_, i) => ({ clave: `C${i}` }));
	const supabase = supabaseFalso([primeraPagina, [{ clave: "ULTIMA" }]]);

	const claves = await cargarClavesConPrecioCliente(supabase, "ISSSTE");

	expect(claves.size).toBe(1001);
	expect(claves.has("ULTIMA")).toBe(true);
	expect(supabase.llamadas).toEqual([
		[0, 999],
		[1000, 1999],
	]);
});

test("un cliente sin precios registrados no filtra", async () => {
	const claves = await cargarClavesConPrecioCliente(supabaseFalso([[]]), "PARTICULAR");
	expect(claves).toBeNull();
});

test("si la consulta falla no filtra", async () => {
	jest.spyOn(console, "warn").mockImplementation(() => {});
	const claves = await cargarClavesConPrecioCliente(
		supabaseFalso([{ error: { message: "sin conexion" } }]),
		"IMSS",
	);
	expect(claves).toBeNull();
	console.warn.mockRestore();
});
