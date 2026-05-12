import {
	EVENTOS_SOLICITUD,
	formatearEventoAuditoria,
	obtenerActorAuditoria,
} from "./solicitud-auditoria";

describe("solicitud-auditoria helpers", () => {
	test("resuelve actor desde empleado y usuario", () => {
		expect(
			obtenerActorAuditoria(
				{ nombre: "Ana Recepcion", rol: "recepcionista" },
				{ id: "auth-1", email: "ana@test.com" },
			),
		).toEqual({
			actor_nombre: "Ana Recepcion",
			actor_rol: "recepcionista",
			actor_auth_uuid: "auth-1",
		});
	});

	test("formatea evento para linea de tiempo", () => {
		expect(
			formatearEventoAuditoria({
				evento: EVENTOS_SOLICITUD.CREADA,
				descripcion: "Solicitud creada",
				actor_nombre: "Luis",
				actor_rol: "admin",
				created_at: "2026-05-12T12:30:00.000Z",
			}),
		).toMatchObject({
			actor: "Luis · admin",
			descripcion: "Solicitud creada",
		});
	});
});
