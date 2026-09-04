import { readFileSync } from "fs";
import { resolve } from "path";
import {
	consultasQueLeenVentas,
	invalidarConsultasDeVentas,
} from "./invalidar-consultas-ventas";

const crearQueryClient = () => {
	const invalidadas = [];
	return {
		invalidadas,
		cliente: {
			invalidateQueries: jest.fn(({ queryKey }) => invalidadas.push(queryKey[0])),
		},
	};
};

describe("invalidarConsultasDeVentas", () => {
	// El caché tiene `staleTime` de minutos: sin avisarle, una orden recién
	// cobrada no aparecía en el reporte de ventas hasta recargar la página.
	test("refresca el reporte de ventas", () => {
		const { invalidadas, cliente } = crearQueryClient();

		invalidarConsultasDeVentas(cliente);

		expect(invalidadas).toContain("reporte-ventas");
	});

	// Todo lo que nace de una venta se queda igual de viejo que el reporte.
	// El corte del período vive en claves propias: una venta nueva y una
	// cancelación lo cambian igual que al reporte.
	test.each([
		"reporte-ventas-canceladas",
		"reporte-ventas-pagos-cancelados",
		"reporte-administrativo",
		"ventas",
		"captura",
		"entrega-resultados",
		"turnos",
		"dashboard-stats",
		"dashboard-estadisticas",
	])("refresca también %s", (clave) => {
		const { invalidadas, cliente } = crearQueryClient();

		invalidarConsultasDeVentas(cliente);

		expect(invalidadas).toContain(clave);
	});

	// Cada clave se invalida por su raíz, sin fechas: el reporte guarda una
	// entrada por rango consultado y hay que alcanzarlas todas, no sólo la que
	// se esté viendo.
	test("invalida por la raíz de la clave, no por un rango concreto", () => {
		const { cliente } = crearQueryClient();

		invalidarConsultasDeVentas(cliente);

		for (const [{ queryKey }] of cliente.invalidateQueries.mock.calls) {
			expect(queryKey).toHaveLength(1);
		}
	});

	test("no invalida catálogos, que no cambian al cobrar", () => {
		const { invalidadas, cliente } = crearQueryClient();

		invalidarConsultasDeVentas(cliente);

		expect(invalidadas).not.toContain("catalogos-reporte");
		expect(invalidadas).not.toContain("catalogos-captura");
		expect(invalidadas).not.toContain("pacientes");
	});

	// Guardar la venta ya funcionó: que falte el cliente de consultas no puede
	// tirar el cobro con una excepción.
	test("sin queryClient no truena", () => {
		expect(invalidarConsultasDeVentas(undefined)).toEqual([]);
		expect(invalidarConsultasDeVentas(null)).toEqual([]);
		expect(invalidarConsultasDeVentas({})).toEqual([]);
	});

	test("la lista de claves se puede consultar", () => {
		expect(consultasQueLeenVentas()).toContain("reporte-ventas");
	});
});

// Las pantallas que mueven ventas no se pueden ejercitar de punta a punta sin
// montar toda la cadena de inserciones -venta, estudios, folio, turno-, asi que
// lo que se fija aqui es que la llamada siga en su sitio. No prueba que el
// refresco ocurra; evita que alguien quite la linea sin darse cuenta y el
// reporte vuelva a quedarse viejo.
describe("las pantallas que mueven ventas avisan al cache", () => {
	const leer = (ruta) => readFileSync(resolve(process.cwd(), ruta), "utf8");

	test.each([
		["nuevo paciente", "src/pages/laboratorio/nuevo-paciente.jsx"],
		["editar solicitud", "src/pages/laboratorio/recepcion/editar-solicitud.jsx"],
	])("%s llama a invalidarConsultasDeVentas", (_pantalla, ruta) => {
		const fuente = leer(ruta);
		expect(fuente).toContain("invalidarConsultasDeVentas");
		expect(fuente).toContain("useQueryClient");
		expect(fuente).toMatch(/invalidarConsultasDeVentas\(queryClient\)/);
	});

	// Cobrar es lo que se reporto: la llamada va despues de registrar las
	// ventas, no antes, o el reporte se pediria sin la orden nueva.
	test("en nuevo paciente el aviso va despues de registrar la venta", () => {
		const fuente = leer("src/pages/laboratorio/nuevo-paciente.jsx");
		const registro = fuente.indexOf("ventasRegistradas.push(await registrarVentaDeParte(parte))");
		const aviso = fuente.indexOf("invalidarConsultasDeVentas(queryClient)");
		expect(registro).toBeGreaterThan(-1);
		expect(aviso).toBeGreaterThan(registro);
	});
});
