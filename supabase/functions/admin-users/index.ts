import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esOrigenAdminPermitido, headersCorsAdmin } from "../_shared/admin-cors.js";

const json = (body: unknown, corsHeaders: HeadersInit, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});

const clean = (value: unknown) =>
	typeof value === "string" ? value.trim() : value || "";

const isAdminRole = (rol: unknown) =>
	["admin", "administrador", "desarrollador"].includes(
		String(rol || "").toLowerCase(),
	);

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

const buildDoctorPayload = (doctor: Record<string, unknown>, authUuid: string) => ({
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
	const puedeCrearDoctor = body.action === "createDoctor";

	if (
		!empleadoAdmin?.activo ||
		(!isAdminRole(empleadoAdmin.rol) && !puedeCrearDoctor)
	) {
		return responder({ error: "No tienes permiso para administrar usuarios" }, 403);
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
		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return responder({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorCreado, error: doctorError } = await adminClient
			.from("doctores")
			.insert([buildDoctorPayload(doctor, authUser.id)])
			.select()
			.single();

		if (doctorError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
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

		if (!clean(doctor.contrasena)) return responder({ doctor: doctorActualizado });

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
