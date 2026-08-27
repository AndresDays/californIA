import {
	PRECIO_POR_DEFECTO,
	buscarPrecioEstudioCliente,
	resolverPrecioEstudioCliente,
} from "./precio-estudio-cliente";

// Imita lo que hace Supabase con ilike: compara sin distinguir mayúsculas.
const supabaseFalso = (filas) => {
	const llamadas = [];
	const consulta = (filtros = {}) => ({
		select: () => consulta(filtros),
		ilike: (columna, valor) => consulta({ ...filtros, [columna]: valor }),
		limit: () => {
			llamadas.push(filtros);
			const coincide = (fila) =>
				Object.entries(filtros).every(
					(entrada) =>
						String(fila[entrada[0]] ?? "").toLowerCase() ===
						String(entrada[1] ?? "").toLowerCase(),
				);
			return Promise.resolve({ data: filas.filter(coincide), error: null });
		},
	});
	return { from: () => consulta(), llamadas };
};

const PRECIOS = [
	{ clave: "RM-RODILLA", descripcion: "RM RODILLA SIMPLE", cliente: "Medisim", precio: 2450 },
];

describe("buscarPrecioEstudioCliente", () => {
	test("encuentra el precio pactado del cliente", async () => {
		await expect(
			buscarPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "RM-RODILLA",
				cliente: "Medisim",
			}),
		).resolves.toBe(2450);
	});

	// El cliente puede estar dado de alta como MEDISIM y su tarifario como
	// Medisim: con la comparación exacta se cobraba el precio por defecto.
	test("no distingue mayúsculas ni espacios de sobra en el cliente", async () => {
		await expect(
			buscarPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "RM-RODILLA",
				cliente: "  MEDISIM ",
			}),
		).resolves.toBe(2450);
	});

	// La búsqueda ofrece el estudio si cruza por clave o por descripción, así
	// que el precio se resuelve igual de las dos formas.
	test("cae a la descripción cuando la clave no cruza", async () => {
		await expect(
			buscarPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "RM-RODILLA-OTRA-NOMENCLATURA",
				descripcion: "RM RODILLA SIMPLE",
				cliente: "Medisim",
			}),
		).resolves.toBe(2450);
	});

	// Un tarifario con la clave repetida hacía fallar la consulta que esperaba
	// exactamente un renglón, y el estudio terminaba en el precio por defecto.
	test("una clave repetida no deja al estudio sin precio", async () => {
		const repetidos = [...PRECIOS, { ...PRECIOS[0], precio: 2500 }];

		await expect(
			buscarPrecioEstudioCliente(supabaseFalso(repetidos), {
				clave: "RM-RODILLA",
				cliente: "Medisim",
			}),
		).resolves.toBe(2450);
	});

	test("devuelve null cuando el cliente no tiene ese estudio pactado", async () => {
		await expect(
			buscarPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "TAC-CRANEO",
				cliente: "Medisim",
			}),
		).resolves.toBeNull();
	});

	test("sin cliente no se consulta nada", async () => {
		const supabase = supabaseFalso(PRECIOS);
		await expect(
			buscarPrecioEstudioCliente(supabase, { clave: "RM-RODILLA", cliente: "" }),
		).resolves.toBeNull();
		expect(supabase.llamadas).toHaveLength(0);
	});
});

describe("resolverPrecioEstudioCliente", () => {
	test("usa el precio por defecto sólo cuando no hay precio pactado", async () => {
		await expect(
			resolverPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "TAC-CRANEO",
				cliente: "Medisim",
			}),
		).resolves.toBe(PRECIO_POR_DEFECTO);

		await expect(
			resolverPrecioEstudioCliente(supabaseFalso(PRECIOS), {
				clave: "RM-RODILLA",
				cliente: "medisim",
			}),
		).resolves.toBe(2450);
	});
});
