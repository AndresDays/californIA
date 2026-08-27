import {
	COLUMNAS_TABLA_VENTAS,
	copiarTextoAlPortapapeles,
	filaTablaVenta,
	tablaVentasComoTexto,
} from "./tabla-reporte-ventas";

const venta = {
	id_venta: 9,
	folio: "B0002",
	fecha_venta: "2026-08-26T18:17:00",
	total: 2450,
	pago_recibido: 2450,
	forma_pago: "efectivo",
	pacientes: { id_paciente: 3, nombre: "Munoz Lomeli Maria", telefono: "+52 3223566142" },
	clientes: { nombre: "Medisim" },
	doctores: { nombre: "Valencia Romano Luis" },
	estudios_venta: [{ clave_estudio: "RM-RODILLA", descripcion_estudio: "RM RODILLA - PIERNA SIMPLE" }],
};

const nombreDoctor = (fila) => fila?.doctores?.nombre || "-";

describe("tabla del reporte de ventas", () => {
	test("las columnas van en el orden en que se leen en caja", () => {
		expect(COLUMNAS_TABLA_VENTAS.slice(0, 8)).toEqual([
			"Folio",
			"Paciente",
			"Estudio",
			"Precio",
			"Forma de pago",
			"Cliente",
			"Doctor",
			"Teléfono",
		]);
	});

	test("el renglón sigue ese mismo orden", () => {
		const fila = filaTablaVenta(venta, { nombreDoctor });

		expect(fila).toHaveLength(COLUMNAS_TABLA_VENTAS.length);
		expect(fila.slice(0, 8)).toEqual([
			"B0002",
			"Munoz Lomeli Maria",
			"RM RODILLA - PIERNA SIMPLE",
			expect.stringContaining("2,450"),
			"efectivo",
			"Medisim",
			"Valencia Romano Luis",
			"+52 3223566142",
		]);
	});

	test("una venta sin paciente, doctor ni estudios no deja el renglón corrido", () => {
		const fila = filaTablaVenta({ id_venta: 1, total: 0 }, { nombreDoctor });

		expect(fila).toHaveLength(COLUMNAS_TABLA_VENTAS.length);
		expect(fila[1]).toBe("Sin paciente");
		expect(fila[2]).toBe("");
		expect(fila[6]).toBe("-");
	});

	// Con tabuladores cada dato cae en su celda al pegar en Excel, y sin
	// encabezado para poder pegar debajo de lo que ya se tenga capturado.
	test("la copia trae solo los renglones, separados por tabuladores", () => {
		const texto = tablaVentasComoTexto([venta, venta], { nombreDoctor });
		const renglones = texto.split("\n");

		expect(renglones).toHaveLength(2);
		expect(texto).not.toContain("Folio\tPaciente");
		expect(renglones[0].split("\t")[0]).toBe("B0002");
		expect(renglones[0].split("\t")).toHaveLength(COLUMNAS_TABLA_VENTAS.length);
	});

	// Varios estudios en un renglón traen comas y espacios: no deben partir la fila.
	test("un dato con saltos de línea no rompe el renglón copiado", () => {
		const texto = tablaVentasComoTexto(
			[{ ...venta, pacientes: { nombre: "Maria\n  Guadalupe" } }],
			{ nombreDoctor },
		);

		expect(texto.split("\n")).toHaveLength(1);
		expect(texto).toContain("Maria Guadalupe");
	});
});

describe("copiarTextoAlPortapapeles", () => {
	afterEach(() => {
		delete navigator.clipboard;
		delete document.execCommand;
	});

	test("usa el portapapeles del navegador cuando está disponible", async () => {
		const writeText = jest.fn().mockResolvedValue();
		navigator.clipboard = { writeText };

		await expect(copiarTextoAlPortapapeles("hola")).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith("hola");
	});

	// Sin contexto seguro el portapapeles no existe o truena; la caja igual copia.
	test("cae al respaldo cuando el portapapeles no está disponible", async () => {
		navigator.clipboard = {
			writeText: jest.fn().mockRejectedValue(new Error("sin permiso")),
		};
		document.execCommand = jest.fn(() => true);

		await expect(copiarTextoAlPortapapeles("hola")).resolves.toBe(true);
		expect(document.execCommand).toHaveBeenCalledWith("copy");
	});

	test("avisa cuando ninguna de las dos formas funciona", async () => {
		document.execCommand = jest.fn(() => false);

		await expect(copiarTextoAlPortapapeles("hola")).resolves.toBe(false);
	});
});
