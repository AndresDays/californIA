import {
	cargarPreciosCliente,
	resolverClavesConPrecio,
} from "./precios-cliente";

const supabaseFalso = (paginas) => {
	const llamadas = [];
	const clientesConsultados = [];
	return {
		llamadas,
		clientesConsultados,
		from: () => ({
			select: () => ({
				ilike: (_columna, valor) => {
					clientesConsultados.push(valor);
					return {
					range: (desde, hasta) => {
						llamadas.push([desde, hasta]);
						const pagina = paginas.shift();
						return Promise.resolve(
							pagina?.error
								? { data: null, error: pagina.error }
								: { data: pagina || [], error: null },
						);
					},
					};
				},
			}),
		}),
	};
};

describe("cargarPreciosCliente", () => {
	// El cliente puede estar dado de alta como MEDISIM y su tarifario guardado
	// como Medisim: con la comparación exacta no cruzaba ninguna clave, así que
	// la búsqueda ofrecía todo el catálogo y nada traía su precio pactado.
	test("busca el tarifario sin distinguir mayúsculas", async () => {
		const supabase = supabaseFalso([[{ clave: "RM-RODILLA", descripcion: "RM RODILLA" }]]);

		const precios = await cargarPreciosCliente(supabase, "MEDISIM");

		expect(supabase.clientesConsultados).toEqual(["MEDISIM"]);
		expect(precios.claves.has("RM-RODILLA")).toBe(true);
	});

	test("sin cliente no filtra", async () => {
		await expect(cargarPreciosCliente(supabaseFalso([]), "")).resolves.toBeNull();
	});

	test("regresa claves y descripciones normalizadas", async () => {
		const supabase = supabaseFalso([
			[
				{ clave: "us-01", descripcion: "U.S. Abdomen" },
				{ clave: " US-02 ", descripcion: "" },
			],
		]);

		const precios = await cargarPreciosCliente(supabase, "IMSS");

		expect(precios.claves).toEqual(new Set(["US-01", "US-02"]));
		expect(precios.descripciones).toEqual(new Set(["u.s. abdomen"]));
	});

	test("pagina hasta traer toda la lista de precios", async () => {
		const primeraPagina = Array.from({ length: 1000 }, (_, i) => ({ clave: `C${i}` }));
		const supabase = supabaseFalso([primeraPagina, [{ clave: "ULTIMA" }]]);

		const precios = await cargarPreciosCliente(supabase, "ISSSTE");

		expect(precios.claves.size).toBe(1001);
		expect(supabase.llamadas).toEqual([
			[0, 999],
			[1000, 1999],
		]);
	});

	test("un cliente sin precios registrados no filtra", async () => {
		await expect(
			cargarPreciosCliente(supabaseFalso([[]]), "PARTICULAR"),
		).resolves.toBeNull();
	});

	test("si la consulta falla no filtra", async () => {
		jest.spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			cargarPreciosCliente(supabaseFalso([{ error: { message: "sin conexion" } }]), "IMSS"),
		).resolves.toBeNull();
		console.warn.mockRestore();
	});
});

describe("resolverClavesConPrecio", () => {
	const catalogo = [
		{ clave: "US-ABDOMEN", descripcion: "U.S. ABDOMEN COMPLETO" },
		{ clave: "US-RENAL", descripcion: "U.S. RENAL" },
	];

	test("sin lista de precios no filtra", () => {
		expect(resolverClavesConPrecio(null, catalogo)).toBeNull();
	});

	test("resuelve las claves del catálogo que tienen precio", () => {
		const precios = { claves: new Set(["US-ABDOMEN"]), descripciones: new Set() };

		expect(resolverClavesConPrecio(precios, catalogo)).toEqual(
			new Set(["US-ABDOMEN"]),
		);
	});

	test("cruza por descripción cuando la clave del tarifario no coincide", () => {
		const precios = {
			claves: new Set(["0001"]),
			descripciones: new Set(["u.s. renal"]),
		};

		expect(resolverClavesConPrecio(precios, catalogo)).toEqual(new Set(["US-RENAL"]));
	});

	// El caso que dejaba la búsqueda en blanco: un tarifario capturado con otra
	// nomenclatura no debe esconder el catálogo entero.
	test("si la lista de precios no cruza con el catálogo no filtra", () => {
		const precios = {
			claves: new Set(["XYZ-1", "XYZ-2"]),
			descripciones: new Set(["algo mas"]),
		};

		expect(resolverClavesConPrecio(precios, catalogo)).toBeNull();
	});
});
