import {
	crearPayloadNotificacion,
	notificacionEsParaEmpleado,
	normalizarRolNotificacion,
} from "./notificaciones";

describe("notificaciones helpers", () => {
	test("normaliza roles con acentos, espacios y mayusculas", () => {
		expect(normalizarRolNotificacion(" Radiólogo ")).toBe("radiologo");
		expect(normalizarRolNotificacion("Técnico Radiología")).toBe(
			"tecnico_radiologia",
		);
	});

	test("filtra notificaciones por canal de trabajo", () => {
		const empleadoRadiologia = { rol: "radiologo", id_sucursal: 2 };
		const empleadoRecepcion = { rol: "recepcionista", id_sucursal: 2 };
		const notificacion = {
			canal_destino: "radiologia",
			id_sucursal: 2,
			usuario_destino: null,
		};

		expect(notificacionEsParaEmpleado(notificacion, empleadoRadiologia)).toBe(true);
		expect(notificacionEsParaEmpleado(notificacion, empleadoRecepcion)).toBe(false);
	});

	test("respeta usuario destino directo aunque el rol no coincida", () => {
		const empleado = { rol: "recepcionista", auth_uuid: "user-1" };
		const notificacion = {
			canal_destino: "radiologia",
			usuario_destino: "user-1",
		};

		expect(notificacionEsParaEmpleado(notificacion, empleado, { id: "user-1" })).toBe(
			true,
		);
	});

	test("crea payload con ruta y entidad para navegar desde la campana", () => {
		expect(
			crearPayloadNotificacion({
				titulo: "Reporte listo",
				mensaje: "Folio 001",
				canal_destino: "entrega",
				entidad_tipo: "estudio_radiologia",
				entidad_id: 10,
				id_venta: 5,
				action_path: "/entrega-resultados",
			}),
		).toMatchObject({
			titulo: "Reporte listo",
			mensaje: "Folio 001",
			tipo: "sistema",
			canal_destino: "entrega",
			entidad_tipo: "estudio_radiologia",
			entidad_id: 10,
			id_venta: 5,
			action_path: "/entrega-resultados",
		});
	});
});

// El aviso de una solicitud cancelada se escribe una vez por persona, con su
// auth_uuid en `usuario_destino`. Es lo que hace que el `read_at` -que en la
// tabla es una sola columna compartida- termine siendo de cada quien: que
// administración lo marque leído no le apaga la campana a dirección.
describe("aviso de solicitud cancelada en la campana", () => {
	const AVISO = {
		titulo: "Solicitud cancelada · B0009",
		tipo: "advertencia",
		canal_destino: "usuario",
		rol_destino: null,
		usuario_destino: "uuid-direccion",
	};

	test("le llega a la persona a la que va dirigido", () => {
		expect(
			notificacionEsParaEmpleado(
				AVISO,
				{ rol: "radiologo", auth_uuid: "uuid-direccion" },
				{ id: "uuid-direccion" },
			),
		).toBe(true);
	});

	test("no le llega a nadie mas, ni siquiera del mismo rol", () => {
		expect(
			notificacionEsParaEmpleado(
				AVISO,
				{ rol: "admin", auth_uuid: "uuid-admin" },
				{ id: "uuid-admin" },
			),
		).toBe(false);
	});

	// Recepcion cancela la orden, pero el aviso no es para ella.
	test("no le llega a quien no es destinatario", () => {
		expect(
			notificacionEsParaEmpleado(
				AVISO,
				{ rol: "recepcionista", auth_uuid: "uuid-recepcion" },
				{ id: "uuid-recepcion" },
			),
		).toBe(false);
	});
});
