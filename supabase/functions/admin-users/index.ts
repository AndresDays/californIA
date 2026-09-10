import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esOrigenAdminPermitido, headersCorsAdmin } from "../_shared/admin-cors.js";

const json = (body: unknown, corsHeaders: HeadersInit, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});

const clean = (value: unknown) =>
	typeof value === "string" ? value.trim() : value || "";

const normalizarRol = (rol: unknown) =>
	String(rol || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_");

const isAdminRole = (rol: unknown) =>
	["admin", "administrador", "desarrollador"].includes(normalizarRol(rol));

// Los accesos de los clientes de convenio los da dirección, y el radiólogo
// director se guarda con rol `radiologo`.
const puedeGestionarAccesosCliente = (rol: unknown) =>
	isAdminRole(rol) || ["radiologo", "radiologo_director"].includes(normalizarRol(rol));

const ACCIONES_ACCESO_CLIENTE = [
	"createClienteAcceso",
	"updateClienteAcceso",
	"deleteClienteAcceso",
];

const createAuthUser = async (
	adminClient: ReturnType<typeof createClient>,
	usuario: Record<string, unknown>,
	rol: string,
) => {
	const email = clean(usuario.email);
	const password = clean(usuario.contrasena);
	if (!email || !password) {
		return { user: null, error: "Email y contrasena son requeridos" };
	}

	const { data, error } = await adminClient.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: {
			nombre: clean(usuario.nombre),
			usuario: clean(usuario.usuario),
			rol,
		},
	});
	return { user: data.user, error: error?.message || null };
};

const buildDoctorPayload = (doctor: Record<string, unknown>, authUuid: string | null) => ({
	nombre: clean(doctor.nombre),
	apellido_paterno: clean(doctor.apellido_paterno),
	apellido_materno: clean(doctor.apellido_materno),
	primer_nombre: clean(doctor.primer_nombre),
	fecha_nacimiento: doctor.fecha_nacimiento || null,
	edad: doctor.edad || null,
	sexo: clean(doctor.sexo) || null,
	email: clean(doctor.email) || null,
	telefono: clean(doctor.telefono) || null,
	usuario: clean(doctor.usuario) || null,
	tipo_doctor: doctor.tipo_doctor || "particular",
	institucion: clean(doctor.institucion) || null,
	es_radiologo: doctor.es_radiologo === true,
	especialidad: doctor.es_radiologo === true ? null : clean(doctor.especialidad) || null,
	activo: doctor.activo !== false,
	auth_uuid: authUuid,
});

const buildDoctorUpdatePayload = (doctor: Record<string, unknown>) => ({
	nombre: clean(doctor.nombre),
	apellido_paterno: clean(doctor.apellido_paterno),
	apellido_materno: clean(doctor.apellido_materno),
	primer_nombre: clean(doctor.primer_nombre),
	fecha_nacimiento: doctor.fecha_nacimiento || null,
	edad: doctor.edad || null,
	sexo: clean(doctor.sexo) || null,
	email: clean(doctor.email),
	telefono: clean(doctor.telefono) || null,
	usuario: clean(doctor.usuario) || null,
	tipo_doctor: doctor.tipo_doctor || "particular",
	institucion: clean(doctor.institucion) || null,
	es_radiologo: doctor.es_radiologo === true,
	especialidad: doctor.es_radiologo === true ? null : clean(doctor.especialidad) || null,
	updated_at: new Date().toISOString(),
});

const esColumnaDoctorNoDisponible = (error: { code?: string } | null) =>
	error?.code === "PGRST204";

Deno.serve(async (req) => {
	const origen = req.headers.get("Origin");
	const origenesPermitidos = Deno.env.get("ADMIN_USERS_ALLOWED_ORIGINS") || "";
	if (!esOrigenAdminPermitido(origen, origenesPermitidos)) {
		return new Response("Origen no permitido", { status: 403 });
	}
	const corsHeaders = headersCorsAdmin(origen, origenesPermitidos);
	const responder = (body: unknown, status = 200) => json(body, corsHeaders, status);
	if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
	if (req.method !== "POST") return responder({ error: "Metodo no permitido" }, 405);

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!supabaseUrl || !serviceRoleKey) {
		return responder({ error: "Faltan variables de entorno de Supabase" }, 500);
	}

	const authHeader = req.headers.get("Authorization") || "";
	const token = authHeader.replace("Bearer ", "");
	if (!token) return responder({ error: "Sesion requerida" }, 401);

	const adminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const {
		data: { user: requester },
		error: requesterError,
	} = await adminClient.auth.getUser(token);
	if (requesterError || !requester) return responder({ error: "Sesion invalida" }, 401);

	const { data: empleadoAdmin, error: empleadoAdminError } = await adminClient
		.from("empleados")
		.select("rol, activo")
		.eq("auth_uuid", requester.id)
		.maybeSingle();

	if (empleadoAdminError) {
		return responder({ error: empleadoAdminError.message }, 500);
	}

	const body = await req.json();
	const puedeGestionarDoctor = ["createDoctor", "updateDoctor"].includes(body.action);
	const esAccesoCliente = ACCIONES_ACCESO_CLIENTE.includes(body.action);

	if (!empleadoAdmin?.activo) {
		return responder({ error: "No tienes permiso para administrar usuarios" }, 403);
	}

	if (esAccesoCliente) {
		if (!puedeGestionarAccesosCliente(empleadoAdmin.rol)) {
			return responder({ error: "No tienes permiso para administrar accesos de clientes" }, 403);
		}
	} else if (!isAdminRole(empleadoAdmin.rol) && !puedeGestionarDoctor) {
		return responder({ error: "No tienes permiso para administrar usuarios" }, 403);
	}

	// ── Accesos de clientes de convenio ──────────────────────────────────────
	// Un acceso por área: `imagen` entra a radiología y `laboratorio` a la
	// pantalla de resultados del convenio. El rol viaja en el usuario de auth
	// sólo como referencia; quien manda es la fila de `clientes_accesos`.
	if (esAccesoCliente) {
		const acceso = body.acceso || {};
		const idCliente = Number(acceso.id_cliente);
		const modulo = clean(acceso.modulo);
		const email = clean(acceso.email);
		const password = clean(acceso.contrasena);

		if (!Number.isInteger(idCliente) || idCliente <= 0) {
			return responder({ error: "Falta el cliente" }, 400);
		}
		if (!["imagen", "laboratorio"].includes(String(modulo))) {
			return responder({ error: "Modulo invalido" }, 400);
		}

		const { data: existente, error: existenteError } = await adminClient
			.from("clientes_accesos")
			.select("id, auth_uuid")
			.eq("id_cliente", idCliente)
			.eq("modulo", modulo)
			.maybeSingle();
		if (existenteError) return responder({ error: existenteError.message }, 500);

		if (body.action === "deleteClienteAcceso") {
			if (!existente) return responder({ ok: true });
			const { error: borradoError } = await adminClient
				.from("clientes_accesos")
				.delete()
				.eq("id", existente.id);
			if (borradoError) return responder({ error: borradoError.message }, 400);
			// El usuario de auth se borra después de la fila: si quedara la fila
			// sin usuario, el acceso se vería activo y no dejaría entrar.
			if (existente.auth_uuid) {
				await adminClient.auth.admin.deleteUser(existente.auth_uuid);
			}
			return responder({ ok: true });
		}

		if (!email) return responder({ error: "El usuario (correo) es requerido" }, 400);

		if (existente?.auth_uuid) {
			const cambios: Record<string, unknown> = { email };
			if (password) cambios.password = password;
			const { error: authError } = await adminClient.auth.admin.updateUserById(
				existente.auth_uuid,
				cambios,
			);
			if (authError) return responder({ error: authError.message }, 400);

			const { data: actualizado, error: filaError } = await adminClient
				.from("clientes_accesos")
				.update({
					usuario: clean(acceso.usuario) || email,
					email,
					activo: acceso.activo !== false,
					updated_at: new Date().toISOString(),
				})
				.eq("id", existente.id)
				.select()
				.single();
			if (filaError) return responder({ error: filaError.message }, 400);
			return responder({ acceso: actualizado });
		}

		if (!password) return responder({ error: "La contrasena es requerida" }, 400);

		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			{ ...acceso, contrasena: password },
			modulo === "imagen" ? "cliente_imagen" : "cliente_laboratorio",
		);
		if (authError || !authUser) {
			return responder({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const fila = {
			id_cliente: idCliente,
			modulo,
			usuario: clean(acceso.usuario) || email,
			email,
			auth_uuid: authUser.id,
			activo: acceso.activo !== false,
			updated_at: new Date().toISOString(),
		};

		const { data: creado, error: creadoError } = existente
			? await adminClient
				.from("clientes_accesos")
				.update(fila)
				.eq("id", existente.id)
				.select()
				.single()
			: await adminClient
				.from("clientes_accesos")
				.insert([fila])
				.select()
				.single();

		if (creadoError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return responder({ error: creadoError.message }, 400);
		}

		return responder({ user: authUser, acceso: creado });
	}

	if (body.action === "updatePassword" || body.action === "updateDoctorPassword") {
		if (!body.auth_uuid || !body.password) {
			return responder({ error: "Falta auth_uuid o password" }, 400);
		}
		const { error } = await adminClient.auth.admin.updateUserById(body.auth_uuid, {
			password: body.password,
		});
		if (error) return responder({ error: error.message }, 400);
		return responder({ ok: true });
	}

	if (body.action === "createDoctor") {
		const doctor = body.doctor || {};
		const crearAcceso = Boolean(clean(doctor.email) && clean(doctor.contrasena));
		let authUser: { id: string } | null = null;
		if (crearAcceso) {
			const { user, error: authError } = await createAuthUser(
				adminClient,
				doctor,
				"doctor_externo",
			);
			if (authError || !user) {
				return responder({ error: authError || "No se pudo crear el usuario" }, 400);
			}
			authUser = user;
		}

		const { data: doctorCreado, error: doctorError } = await adminClient
			.from("doctores")
			.insert([buildDoctorPayload(doctor, authUser?.id || null)])
			.select()
			.single();

		if (doctorError) {
			if (authUser) await adminClient.auth.admin.deleteUser(authUser.id);
			return responder({ error: doctorError.message }, 400);
		}

		return responder({ user: authUser, doctor: doctorCreado });
	}

	if (body.action === "updateDoctor") {
		const doctor = body.doctor || {};
		const idDoctor = Number(doctor.id || doctor.id_doctor);
		if (!Number.isInteger(idDoctor) || idDoctor <= 0) {
			return responder({ error: "Falta id_doctor" }, 400);
		}

		const payload = buildDoctorUpdatePayload(doctor);
		let { data: doctorActualizado, error: doctorError } = await adminClient
			.from("doctores")
			.update(payload)
			.eq("id_doctor", idDoctor)
			.select()
			.single();

		if (esColumnaDoctorNoDisponible(doctorError)) {
			const { tipo_doctor, institucion, ...payloadCompatible } = payload;
			({ data: doctorActualizado, error: doctorError } = await adminClient
				.from("doctores")
				.update(payloadCompatible)
				.eq("id_doctor", idDoctor)
				.select()
				.single());
		}
		if (doctorError || !doctorActualizado) {
			return responder({ error: doctorError?.message || "No se pudo actualizar el doctor" }, 400);
		}

		if (!clean(doctor.email) || !clean(doctor.contrasena)) {
			return responder({ doctor: doctorActualizado });
		}

		const { data: doctorAuth, error: doctorAuthError } = await adminClient
			.from("doctores")
			.select("id_doctor, auth_uuid")
			.eq("id_doctor", idDoctor)
			.maybeSingle();
		if (doctorAuthError || !doctorAuth) {
			return responder({ error: doctorAuthError?.message || "Doctor no encontrado" }, 400);
		}

		if (doctorAuth.auth_uuid) {
			const { error: passwordError } = await adminClient.auth.admin.updateUserById(
				doctorAuth.auth_uuid,
				{ password: clean(doctor.contrasena) },
			);
			if (passwordError) return responder({ error: passwordError.message }, 400);
			return responder({ doctor: doctorActualizado });
		}

		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return responder({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorVinculado, error: vinculoError } = await adminClient
			.from("doctores")
			.update({ auth_uuid: authUser.id })
			.eq("id_doctor", idDoctor)
			.select()
			.single();
		if (vinculoError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return responder({ error: vinculoError.message }, 400);
		}

		return responder({ user: authUser, doctor: doctorVinculado });
	}

	if (body.action === "provisionDoctorAuth") {
		const doctor = body.doctor || {};
		const idDoctor = Number(doctor.id || doctor.id_doctor);
		if (!Number.isInteger(idDoctor) || idDoctor <= 0) {
			return responder({ error: "Falta id_doctor" }, 400);
		}

		const { data: doctorExistente, error: doctorExistenteError } = await adminClient
			.from("doctores")
			.select("id_doctor, auth_uuid")
			.eq("id_doctor", idDoctor)
			.maybeSingle();
		if (doctorExistenteError) return responder({ error: doctorExistenteError.message }, 400);
		if (!doctorExistente) return responder({ error: "Doctor no encontrado" }, 404);
		if (doctorExistente.auth_uuid) {
			const { error: passwordError } = await adminClient.auth.admin.updateUserById(
				doctorExistente.auth_uuid,
				{ password: clean(doctor.contrasena) },
			);
			if (passwordError) return responder({ error: passwordError.message }, 400);
			return responder({ doctor: doctorExistente, existing: true });
		}

		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return responder({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorVinculado, error: doctorError } = await adminClient
			.from("doctores")
			.update({ auth_uuid: authUser.id })
			.eq("id_doctor", idDoctor)
			.select()
			.single();
		if (doctorError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return responder({ error: doctorError.message }, 400);
		}

		return responder({ user: authUser, doctor: doctorVinculado });
	}

	if (body.action !== "create") return responder({ error: "Accion no soportada" }, 400);

	const usuario = body.usuario || {};
	const email = clean(usuario.email);
	const password = clean(usuario.contrasena);
	if (!email || !password) {
		return responder({ error: "Email y contrasena son requeridos" }, 400);
	}

	const { user: authUser, error: authError } = await createAuthUser(
		adminClient,
		usuario,
		String(usuario.rol || ""),
	);

	if (authError || !authUser) {
		return responder({ error: authError || "No se pudo crear el usuario" }, 400);
	}

	const empleadoPayload = {
		nombre: clean(usuario.nombre),
		usuario: clean(usuario.usuario),
		rol: usuario.rol || "",
		sucursal: clean(usuario.sucursal),
		email,
		telefono: clean(usuario.telefono),
		activo: Boolean(usuario.activo),
		auth_uuid: authUser.id,
	};

	const { data: empleado, error: empleadoError } = await adminClient
		.from("empleados")
		.insert([empleadoPayload])
		.select()
		.single();

	if (empleadoError) {
		await adminClient.auth.admin.deleteUser(authUser.id);
		return responder({ error: empleadoError.message }, 400);
	}

	return responder({ user: authUser, empleado });
});
