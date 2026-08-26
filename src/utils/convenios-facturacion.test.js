import { cargarReglasConvenio } from "./convenios-facturacion";

const supabaseFalso = (respuesta) => ({
	from: () => ({
		select: () => ({
			eq: () => Promise.resolve(respuesta),
		}),
	}),
});

test("sin cliente no consulta reglas", async () => {
	await expect(cargarReglasConvenio(supabaseFalso({}), null)).resolves.toEqual([]);
});

test("normaliza las reglas del convenio", async () => {
	const supabase = supabaseFalso({
		data: [
			{ modalidad: "Resonancia", criterio: null, empresa: "cdc" },
			{ modalidad: "*", criterio: "", empresa: "CDI" },
			{ modalidad: "ultrasonido", criterio: "DOPPLER", empresa: "CDC" },
		],
		error: null,
	});

	await expect(cargarReglasConvenio(supabase, 3)).resolves.toEqual([
		{ modalidad: "resonancia", criterio: "", empresa: "CDC" },
		{ modalidad: "*", criterio: "", empresa: "CDI" },
		{ modalidad: "ultrasonido", criterio: "doppler", empresa: "CDC" },
	]);
});

// Sin la migración aplicada la captura no se detiene: se factura con la empresa
// del catálogo, como el particular.
test("una base sin la tabla no truena ni avisa", async () => {
	const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
	const supabase = supabaseFalso({
		data: null,
		error: { message: "Could not find the table 'public.convenios_facturacion' in the schema cache" },
	});

	await expect(cargarReglasConvenio(supabase, 3)).resolves.toEqual([]);
	expect(aviso).not.toHaveBeenCalled();
	aviso.mockRestore();
});

test("otro error sí se avisa", async () => {
	const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
	const supabase = supabaseFalso({ data: null, error: { message: "sin conexion" } });

	await expect(cargarReglasConvenio(supabase, 3)).resolves.toEqual([]);
	expect(aviso).toHaveBeenCalled();
	aviso.mockRestore();
});
