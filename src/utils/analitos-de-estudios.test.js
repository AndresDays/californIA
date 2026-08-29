import { cargarAnalitosDeEstudios, referenciaDeAnalito } from "./analitos-de-estudios";

// Doble de Supabase que cuenta las peticiones: lo que se está probando aquí no
// es sólo el resultado, sino que deje de haber una consulta por estudio y otra
// por analito.
const crearSupabase = ({ relaciones = [], analitos = [], errorEn = null } = {}) => {
	const llamadas = [];
	const from = (tabla) => {
		const consulta = {
			select: () => consulta,
			in: (columna, valores) => {
				llamadas.push({ tabla, columna, valores });
				if (errorEn === tabla) {
					return Promise.resolve({ data: null, error: new Error("falla de red") });
				}
				const filas =
					tabla === "estudio_analitos"
						? relaciones.filter((fila) => valores.includes(fila.clave_estudio))
						: analitos.filter((fila) => valores.includes(fila.id_analito));
				return Promise.resolve({ data: filas, error: null });
			},
		};
		return consulta;
	};
	return { supabase: { from }, llamadas };
};

const ANALITOS = [
	{ id_analito: 1, clave: "HB", descripcion: "Hemoglobina", unidad: "g/dL", vr_bajo: "12", vr_alto: "16", tipo_resultado: "Numerico" },
	{ id_analito: 2, clave: "PLT", descripcion: "Plaquetas", unidad: "10^3", vr_bajo: "150", vr_alto: null, tipo_resultado: "Numerico" },
	{ id_analito: 3, clave: "OBS", descripcion: "Observaciones", tipo_resultado: "Subtitulo", vr_bajo: "1", vr_alto: "2" },
];

const RELACIONES = [
	{ id_estudio_analito: 11, clave_estudio: "BH", id_analito: 2, orden: 2 },
	{ id_estudio_analito: 10, clave_estudio: "BH", id_analito: 1, orden: 1 },
	{ id_estudio_analito: 12, clave_estudio: "QS", id_analito: 3, orden: 1 },
];

describe("referenciaDeAnalito", () => {
	it("arma el rango cuando hay los dos extremos", () => {
		expect(referenciaDeAnalito(ANALITOS[0])).toBe("12 - 16");
	});

	it("deja el minimo cuando solo hay valor bajo", () => {
		expect(referenciaDeAnalito(ANALITOS[1])).toBe(">150");
	});

	it("cae al texto libre cuando no hay valores de referencia", () => {
		expect(referenciaDeAnalito({ referencia: "Negativo" })).toBe("Negativo");
	});

	it("no da referencia a un subtitulo, que es un encabezado y no un valor", () => {
		expect(referenciaDeAnalito(ANALITOS[2])).toBe("");
	});
});

describe("cargarAnalitosDeEstudios", () => {
	it("resuelve toda la orden en dos consultas, sin una por estudio ni por analito", async () => {
		const { supabase, llamadas } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });
		const estudios = [
			{ id_estudio_venta: 1, clave_estudio: "BH" },
			{ id_estudio_venta: 2, clave_estudio: "QS" },
			{ id_estudio_venta: 3, clave_estudio: "BH" },
		];

		await cargarAnalitosDeEstudios(supabase, estudios);

		expect(llamadas).toHaveLength(2);
		expect(llamadas[0]).toMatchObject({ tabla: "estudio_analitos", columna: "clave_estudio" });
		// La clave repetida se pide una sola vez.
		expect(llamadas[0].valores).toEqual(["BH", "QS"]);
		expect(llamadas[1]).toMatchObject({ tabla: "analitos", columna: "id_analito" });
	});

	it("respeta el orden de los analitos dentro del estudio", async () => {
		const { supabase } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });

		const [estudio] = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 1, clave_estudio: "BH" },
		]);

		expect(estudio.analitos.map((analito) => analito.clave)).toEqual(["HB", "PLT"]);
		expect(estudio.analitos[0]).toMatchObject({
			id_estudio_analito: 10,
			unidades: "g/dL",
			referencia: "12 - 16",
			tipo_resultado: "Numerico",
		});
	});

	it("coloca en cada analito el resultado ya capturado", async () => {
		const { supabase } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });

		const [estudio] = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 1, clave_estudio: "BH", resultados: JSON.stringify({ HB: "14.2" }) },
		]);

		expect(estudio.analitos[0].resultado).toBe("14.2");
		expect(estudio.analitos[1].resultado).toBe("");
	});

	it("un JSON de resultados corrupto deja los analitos en blanco, no tira la orden", async () => {
		const { supabase } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });

		const [estudio] = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 1, clave_estudio: "BH", resultados: "{roto" },
		]);

		expect(estudio.analitos).toHaveLength(2);
		expect(estudio.analitos.every((analito) => analito.resultado === "")).toBe(true);
	});

	it("los estudios sin analitos configurados salen con la lista vacia", async () => {
		const { supabase } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });

		const [estudio] = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 9, clave_estudio: "RX" },
		]);

		expect(estudio.analitos).toEqual([]);
		expect(estudio.id_estudio_venta).toBe(9);
	});

	it("conserva los estudios de imagen, que no traen clave", async () => {
		const { supabase, llamadas } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS });

		const resultado = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 5, tipo_origen: "radiologia" },
		]);

		expect(llamadas).toHaveLength(0);
		expect(resultado[0]).toMatchObject({ id_estudio_venta: 5, analitos: [] });
	});

	it("descarta la relacion cuyo analito ya no existe en el catalogo", async () => {
		const { supabase } = crearSupabase({
			relaciones: [...RELACIONES, { id_estudio_analito: 13, clave_estudio: "BH", id_analito: 99, orden: 3 }],
			analitos: ANALITOS,
		});

		const [estudio] = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 1, clave_estudio: "BH" },
		]);

		expect(estudio.analitos.map((analito) => analito.id_analito)).toEqual([1, 2]);
	});

	it("si la consulta falla la orden se abre sin analitos en lugar de romperse", async () => {
		const { supabase } = crearSupabase({ relaciones: RELACIONES, analitos: ANALITOS, errorEn: "analitos" });
		jest.spyOn(console, "error").mockImplementation(() => {});

		const resultado = await cargarAnalitosDeEstudios(supabase, [
			{ id_estudio_venta: 1, clave_estudio: "BH" },
		]);

		expect(resultado).toEqual([{ id_estudio_venta: 1, clave_estudio: "BH", analitos: [] }]);
		console.error.mockRestore();
	});

	it("trocea el .in() para no pasarse del limite de la URL", async () => {
		const { supabase, llamadas } = crearSupabase({ relaciones: [], analitos: [] });
		const estudios = Array.from({ length: 250 }, (_, i) => ({
			id_estudio_venta: i,
			clave_estudio: `EST-${i}`,
		}));

		await cargarAnalitosDeEstudios(supabase, estudios);

		const lotes = llamadas.filter((llamada) => llamada.tabla === "estudio_analitos");
		expect(lotes.map((lote) => lote.valores.length)).toEqual([100, 100, 50]);
	});

	it("una lista vacia no consulta nada", async () => {
		const { supabase, llamadas } = crearSupabase({});
		expect(await cargarAnalitosDeEstudios(supabase, [])).toEqual([]);
		expect(llamadas).toHaveLength(0);
	});
});
