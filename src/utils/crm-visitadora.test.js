import {
	cumpleHoy,
	cumpleanosProximos,
	coincideBusqueda,
	diasParaCumpleanos,
	distanciaKm,
	enlaceMapa,
	enlaceWhatsApp,
	etiquetaConvenio,
	medicosCercanos,
	proximaVisitaSugerida,
	proximoCumpleanos,
	visitaVencida,
} from "./crm-visitadora";

describe("cumpleaños", () => {
	test("proyecta el cumpleaños sobre el año en curso", () => {
		expect(proximoCumpleanos("1978-12-24", "2026-09-19")).toBe("2026-12-24");
	});

	// El caso que rompe la cuenta ingenua: el cumpleaños ya pasó este año, así
	// que el próximo es el del año que entra y no una cantidad negativa de días.
	test("si ya pasó este año, el próximo es el del año siguiente", () => {
		expect(proximoCumpleanos("1978-03-02", "2026-09-19")).toBe("2027-03-02");
		expect(diasParaCumpleanos("1978-03-02", "2026-09-19")).toBeGreaterThan(0);
	});

	test("el mismo día cuenta como cumpleaños de hoy", () => {
		expect(cumpleHoy("1980-09-19", "2026-09-19")).toBe(true);
		expect(diasParaCumpleanos("1980-09-19", "2026-09-19")).toBe(0);
	});

	test("sin fecha de nacimiento no inventa nada", () => {
		expect(proximoCumpleanos(null)).toBeNull();
		expect(diasParaCumpleanos("")).toBeNull();
		expect(cumpleHoy(undefined)).toBe(false);
	});

	test("los próximos se ordenan del más cercano al más lejano", () => {
		const medicos = [
			{ id_doctor: 1, fecha_nacimiento: "1970-09-28" },
			{ id_doctor: 2, fecha_nacimiento: "1970-09-21" },
			{ id_doctor: 3, fecha_nacimiento: "1970-11-30" },
		];
		expect(cumpleanosProximos(medicos, 15, "2026-09-19").map(({ medico }) => medico.id_doctor)).toEqual([
			2, 1,
		]);
	});
});

describe("próxima visita", () => {
	test("suma la frecuencia a la última visita", () => {
		expect(proximaVisitaSugerida("2026-09-01", 30)).toBe("2026-10-01");
	});

	test("sin frecuencia o sin última visita no sugiere fecha", () => {
		expect(proximaVisitaSugerida("2026-09-01", null)).toBeNull();
		expect(proximaVisitaSugerida(null, 30)).toBeNull();
		expect(proximaVisitaSugerida("2026-09-01", 0)).toBeNull();
	});

	test("una fecha anterior a hoy está vencida", () => {
		expect(visitaVencida("2026-09-18", "2026-09-19")).toBe(true);
		expect(visitaVencida("2026-09-19", "2026-09-19")).toBe(false);
		expect(visitaVencida(null, "2026-09-19")).toBe(false);
	});
});

describe("búsqueda", () => {
	const medico = {
		nombre_completo: "Ramón Pérez",
		especialidad: "Ginecología",
		hospital: "Hospital del Valle",
		telefono: "3221234567",
	};

	test("encuentra sin acentos ni mayúsculas", () => {
		expect(coincideBusqueda(medico, "ramon")).toBe(true);
		expect(coincideBusqueda(medico, "GINECO")).toBe(true);
	});

	test("busca también por hospital y teléfono", () => {
		expect(coincideBusqueda(medico, "valle")).toBe(true);
		expect(coincideBusqueda(medico, "3221234567")).toBe(true);
	});

	test("una búsqueda vacía no filtra nada", () => {
		expect(coincideBusqueda(medico, "")).toBe(true);
	});

	test("lo que no está no aparece", () => {
		expect(coincideBusqueda(medico, "cardiologia")).toBe(false);
	});
});

describe("ubicación y contacto", () => {
	test("ordena a los médicos por cercanía", () => {
		const origen = { latitud: 20.62, longitud: -105.23 };
		const medicos = [
			{ id_doctor: 1, latitud: 20.7, longitud: -105.3 },
			{ id_doctor: 2, latitud: 20.63, longitud: -105.24 },
			{ id_doctor: 3, latitud: null, longitud: null },
		];
		expect(medicosCercanos(medicos, origen).map(({ medico }) => medico.id_doctor)).toEqual([2, 1]);
	});

	test("sin coordenadas no hay distancia", () => {
		expect(distanciaKm({ latitud: 20 }, { latitud: 21, longitud: -105 })).toBeNull();
	});

	test("el mapa cae en la dirección cuando no hay coordenadas", () => {
		expect(enlaceMapa({ direccion_consultorio: "Av. Palmas 100" })).toContain("Av.%20Palmas%20100");
		expect(enlaceMapa({ latitud: 20.62, longitud: -105.23 })).toContain("20.62,-105.23");
		expect(enlaceMapa({})).toBeNull();
	});

	// Los teléfonos del directorio están capturados a diez dígitos; WhatsApp
	// necesita la lada del país o abre un chat vacío.
	test("WhatsApp agrega la lada de México a los diez dígitos", () => {
		expect(enlaceWhatsApp("3221234567")).toBe("https://wa.me/523221234567");
		expect(enlaceWhatsApp("523221234567")).toBe("https://wa.me/523221234567");
		expect(enlaceWhatsApp("12345")).toBeNull();
	});
});

test("las etiquetas de convenio se leen en español", () => {
	expect(etiquetaConvenio("sin_convenio")).toBe("Sin convenio");
	expect(etiquetaConvenio(null)).toBe("—");
});
