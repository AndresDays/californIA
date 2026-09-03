import {
	calcularEdadDetalle,
	cargarDetalleCancelacion,
	formatearDetalleCancelacion,
} from "./detalle-cancelacion";
import {
	ENTIDAD_VENTA_CANCELADA,
	idVentaCanceladaDeAviso,
} from "./notificaciones";

const VENTA = {
	id_venta: 44,
	folio: "B0009",
	fecha_venta: "2026-09-02T18:41:00.000Z",
	estado: "cancelado",
	subtotal: 330,
	descuento: 0,
	total: 330,
	pago_recibido: 165,
	forma_pago: "efectivo",
	observaciones: "El paciente reagendó",
	motivo_cancelacion: "Otro: el paciente reagendó",
	cancelada_en: "2026-09-02T19:10:00.000Z",
	empresas: { nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	clientes: null,
	pacientes: {
		nombre: "GARCIA BALDERAS EDGAR FABIAN",
		fecha_nacimiento: "2004-01-15",
		telefono: "3221220777",
	},
	estudios_venta: [
		{
			id_estudio_venta: 1,
			clave_estudio: "BHC",
			descripcion_estudio: "BIOMETRIA HEMATICA COMPLETA",
			precio: 165,
			area: "Hematologia",
		},
		{
			id_estudio_venta: 2,
			clave_estudio: "EGO",
			descripcion_estudio: "EXAMEN GENERAL DE ORINA",
			precio: 165,
			area: "Uroanalisis",
		},
	],
};

const ACTOR = {
	evento: "solicitud_cancelada",
	actor_nombre: "Recep Uno",
	actor_rol: "recepcionista",
	created_at: "2026-09-02T19:10:00.000Z",
};

// Un doble de Supabase que responde distinto por tabla y anota qué se le pidió.
const crearSupabase = ({ venta = VENTA, errorVenta = null, auditoria = [ACTOR], errorAuditoria = null } = {}) => {
	const llamadas = [];
	const from = jest.fn((tabla) => {
		const registro = { tabla, filtros: [] };
		llamadas.push(registro);
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn((columna, valor) => {
				registro.filtros.push([columna, valor]);
				return cadena;
			}),
			order: jest.fn(() => cadena),
			limit: jest.fn(() =>
				Promise.resolve({ data: auditoria, error: errorAuditoria }),
			),
			maybeSingle: jest.fn(() =>
				Promise.resolve({ data: venta, error: errorVenta }),
			),
		};
		return cadena;
	});
	return { supabase: { from }, llamadas };
};

describe("cargarDetalleCancelacion", () => {
	test("pide la orden por su id y le suma quién canceló", async () => {
		const { supabase, llamadas } = crearSupabase();

		const { detalle, error } = await cargarDetalleCancelacion(supabase, 44);

		expect(error).toBeNull();
		expect(detalle.venta.folio).toBe("B0009");
		expect(detalle.actor.actor_nombre).toBe("Recep Uno");
		expect(llamadas[0]).toMatchObject({
			tabla: "ventas",
			filtros: [["id_venta", 44]],
		});
		expect(llamadas[1].tabla).toBe("solicitudes_auditoria");
	});

	test("sin id no consulta nada", async () => {
		const { supabase } = crearSupabase();

		const { detalle } = await cargarDetalleCancelacion(supabase, null);

		expect(detalle).toBeNull();
		expect(supabase.from).not.toHaveBeenCalled();
	});

	// Una orden borrada de la base deja el aviso apuntando a nada. Se distingue
	// de un fallo de red para poder decírselo a quien abre el aviso.
	test("una orden que ya no existe no es un error", async () => {
		const { supabase } = crearSupabase({ venta: null });

		const { detalle, error } = await cargarDetalleCancelacion(supabase, 44);

		expect(detalle).toBeNull();
		expect(error).toBeNull();
	});

	test("un fallo al leer la orden se reporta", async () => {
		const fallo = { message: "network" };
		const { supabase } = crearSupabase({ venta: null, errorVenta: fallo });

		const { detalle, error } = await cargarDetalleCancelacion(supabase, 44);

		expect(detalle).toBeNull();
		expect(error).toBe(fallo);
	});

	// La auditoría es un extra: si su tabla no existe todavía, el detalle se
	// muestra sin el nombre de quien canceló en vez de no mostrarse.
	test("sin tabla de auditoría el detalle sale igual, sin actor", async () => {
		const { supabase } = crearSupabase({
			auditoria: null,
			errorAuditoria: {
				code: "42P01",
				message: "relation \"public.solicitudes_auditoria\" does not exist",
			},
		});

		const { detalle, error } = await cargarDetalleCancelacion(supabase, 44);

		expect(error).toBeNull();
		expect(detalle.venta.folio).toBe("B0009");
		expect(detalle.actor).toBeNull();
	});
});

describe("formatearDetalleCancelacion", () => {
	const vista = formatearDetalleCancelacion({ venta: VENTA, actor: ACTOR });
	const valorDe = (filas, etiqueta) =>
		filas.find(([nombre]) => nombre === etiqueta)?.[1];

	test("el título lleva el folio", () => {
		expect(vista.titulo).toBe("Solicitud cancelada · B0009");
	});

	test("el motivo y quién canceló van en su propio bloque", () => {
		expect(valorDe(vista.cancelacion, "Motivo")).toBe("Otro: el paciente reagendó");
		expect(valorDe(vista.cancelacion, "Canceló")).toBe("Recep Uno");
		expect(valorDe(vista.cancelacion, "Rol")).toBe("recepcionista");
	});

	test("una orden sin motivo capturado lo dice en lugar de dejarlo vacío", () => {
		const sinMotivo = formatearDetalleCancelacion({
			venta: { ...VENTA, motivo_cancelacion: "   " },
			actor: null,
		});
		expect(valorDe(sinMotivo.cancelacion, "Motivo")).toBe("Sin motivo capturado");
	});

	// Una orden sin convenio es de mostrador: eso se dice, no se deja en blanco.
	test("sin convenio se muestra Particular", () => {
		expect(valorDe(vista.datos, "Convenio")).toBe("Particular");
	});

	test("los renglones sin valor no se pintan", () => {
		const pelado = formatearDetalleCancelacion({
			venta: { ...VENTA, pacientes: { nombre: "X" }, forma_pago: null },
			actor: null,
		});
		const etiquetas = pelado.datos.map(([etiqueta]) => etiqueta);
		expect(etiquetas).toContain("Paciente");
		expect(etiquetas).not.toContain("Teléfono");
		expect(etiquetas).not.toContain("Edad");
		expect(etiquetas).not.toContain("Forma de pago");
	});

	test("los estudios salen con clave, descripción y precio", () => {
		expect(vista.estudios).toHaveLength(2);
		expect(vista.estudios[0]).toMatchObject({
			clave: "BHC",
			descripcion: "BIOMETRIA HEMATICA COMPLETA",
			precio: "$165.00",
		});
	});

	// Es el dato que obliga a actuar: si la orden cancelada tenía dinero
	// recibido, alguien tiene que devolverlo.
	test("avisa cuando había pago por devolver", () => {
		expect(vista.hayPagoPorDevolver).toBe(true);
		expect(valorDe(vista.totales, "Pagado")).toBe("$165.00");
	});

	test("sin pago recibido no avisa de devolución", () => {
		const sinPago = formatearDetalleCancelacion({
			venta: { ...VENTA, pago_recibido: 0 },
			actor: ACTOR,
		});
		expect(sinPago.hayPagoPorDevolver).toBe(false);
	});

	// El aviso queda en la campana para siempre; la orden puede reactivarse
	// despues. El detalle tiene que poder decir que ya no esta cancelada.
	test("detecta que la orden dejó de estar cancelada", () => {
		expect(vista.sigueCancelada).toBe(true);
		expect(
			formatearDetalleCancelacion({ venta: { ...VENTA, estado: "activo" }, actor: ACTOR })
				.sigueCancelada,
		).toBe(false);
	});

	test("sin orden no hay vista que pintar", () => {
		expect(formatearDetalleCancelacion(null)).toBeNull();
		expect(formatearDetalleCancelacion({ venta: null })).toBeNull();
	});
});

describe("calcularEdadDetalle", () => {
	test("una fecha vacía o inválida no inventa una edad", () => {
		expect(calcularEdadDetalle(null)).toBe("");
		expect(calcularEdadDetalle("no es fecha")).toBe("");
	});

	test("cuenta los años cumplidos", () => {
		const hoy = new Date();
		const hace30 = new Date(hoy.getFullYear() - 30, hoy.getMonth(), hoy.getDate());
		expect(calcularEdadDetalle(hace30.toISOString())).toBe("30 años");
	});

	// Cumple mañana: todavía tiene la edad de antes.
	test("no adelanta el cumpleaños", () => {
		const hoy = new Date();
		const casi = new Date(hoy.getFullYear() - 30, hoy.getMonth(), hoy.getDate() + 1);
		expect(calcularEdadDetalle(casi.toISOString())).toBe("29 años");
	});
});

describe("idVentaCanceladaDeAviso", () => {
	test("reconoce el aviso de cancelación y devuelve su venta", () => {
		expect(
			idVentaCanceladaDeAviso({
				entidad_tipo: ENTIDAD_VENTA_CANCELADA,
				id_venta: 44,
			}),
		).toBe(44);
	});

	test("si falta id_venta usa la entidad", () => {
		expect(
			idVentaCanceladaDeAviso({
				entidad_tipo: ENTIDAD_VENTA_CANCELADA,
				entidad_id: 12,
			}),
		).toBe(12);
	});

	// `venta` a secas lo usan los avisos de captura y de venta nueva: esos
	// siguen navegando a su ruta, no abren el detalle de una cancelación.
	test.each(["venta", "estudio_venta", "estudio_radiologia", null, undefined])(
		"la entidad %s no abre el detalle de cancelación",
		(entidad) => {
			expect(idVentaCanceladaDeAviso({ entidad_tipo: entidad, id_venta: 44 })).toBeNull();
		},
	);

	test("un aviso de cancelación sin id no abre nada", () => {
		expect(
			idVentaCanceladaDeAviso({ entidad_tipo: ENTIDAD_VENTA_CANCELADA }),
		).toBeNull();
		expect(
			idVentaCanceladaDeAviso({
				entidad_tipo: ENTIDAD_VENTA_CANCELADA,
				id_venta: "no es id",
			}),
		).toBeNull();
	});

	test("no truena con un aviso vacío", () => {
		expect(idVentaCanceladaDeAviso()).toBeNull();
		expect(idVentaCanceladaDeAviso(null)).toBeNull();
	});
});
