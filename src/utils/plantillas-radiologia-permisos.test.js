import { puedePublicarPlantillasRadiologia } from "./plantillas-radiologia-permisos";

describe("publicación de plantillas de radiología", () => {
	test.each(["radiologo", "radiologo director", "admin", "administrador", "desarrollador"])(
		"permite publicar a %s",
		(rol) => expect(puedePublicarPlantillasRadiologia(rol)).toBe(true),
	);

	test.each(["tecnico_radiologia", "recepcionista", "quimico"])(
		"no permite publicar a %s",
		(rol) => expect(puedePublicarPlantillasRadiologia(rol)).toBe(false),
	);
});
