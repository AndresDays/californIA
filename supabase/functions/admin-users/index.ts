import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
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
	if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
	if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!supabaseUrl || !serviceRoleKey) {
		return json({ error: "Faltan variables de entorno de Supabase" }, 500);
	}

	const authHeader = req.headers.get("Authorization") || "";
	const token = authHeader.replace("Bearer ", "");
	if (!token) return json({ error: "Sesion requerida" }, 401);

	const adminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const {
		data: { user: requester },
		error: requesterError,
	} = await adminClient.auth.getUser(token);
	if (requesterError || !requester) return json({ error: "Sesion invalida" }, 401);

	const { data: empleadoAdmin, error: empleadoAdminError } = await adminClient
		.from("empleados")
		.select("rol, activo")
		.eq("auth_uuid", requester.id)
		.maybeSingle();

	if (empleadoAdminError) {
		return json({ error: empleadoAdminError.message }, 500);
	}

	if (!empleadoAdmin?.activo || !isAdminRole(empleadoAdmin.rol)) {
		return json({ error: "No tienes permiso para administrar usuarios" }, 403);
	}

	const body = await req.json();

	if (body.action === "updatePassword" || body.action === "updateDoctorPassword") {
		if (!body.auth_uuid || !body.password) {
			return json({ error: "Falta auth_uuid o password" }, 400);
		}
		const { error } = await adminClient.auth.admin.updateUserById(body.auth_uuid, {
			password: body.password,
		});
		if (error) return json({ error: error.message }, 400);
		return json({ ok: true });
	}

	if (body.action === "createDoctor") {
		const doctor = body.doctor || {};
		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return json({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorCreado, error: doctorError } = await adminClient
			.from("doctores")
			.insert([buildDoctorPayload(doctor, authUser.id)])
			.select()
			.single();

		if (doctorError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return json({ error: doctorError.message }, 400);
		}

		return json({ user: authUser, doctor: doctorCreado });
	}

	if (body.action === "updateDoctor") {
		const doctor = body.doctor || {};
		const idDoctor = Number(doctor.id || doctor.id_doctor);
		if (!Number.isInteger(idDoctor) || idDoctor <= 0) {
			return json({ error: "Falta id_doctor" }, 400);
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
			return json({ error: doctorError?.message || "No se pudo actualizar el doctor" }, 400);
		}

		if (!clean(doctor.contrasena)) return json({ doctor: doctorActualizado });

		const { data: doctorAuth, error: doctorAuthError } = await adminClient
			.from("doctores")
			.select("id_doctor, auth_uuid")
			.eq("id_doctor", idDoctor)
			.maybeSingle();
		if (doctorAuthError || !doctorAuth) {
			return json({ error: doctorAuthError?.message || "Doctor no encontrado" }, 400);
		}

		if (doctorAuth.auth_uuid) {
			const { error: passwordError } = await adminClient.auth.admin.updateUserById(
				doctorAuth.auth_uuid,
				{ password: clean(doctor.contrasena) },
			);
			if (passwordError) return json({ error: passwordError.message }, 400);
			return json({ doctor: doctorActualizado });
		}

		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return json({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorVinculado, error: vinculoError } = await adminClient
			.from("doctores")
			.update({ auth_uuid: authUser.id })
			.eq("id_doctor", idDoctor)
			.select()
			.single();
		if (vinculoError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return json({ error: vinculoError.message }, 400);
		}

		return json({ user: authUser, doctor: doctorVinculado });
	}

	if (body.action === "provisionDoctorAuth") {
		const doctor = body.doctor || {};
		const idDoctor = Number(doctor.id || doctor.id_doctor);
		if (!Number.isInteger(idDoctor) || idDoctor <= 0) {
			return json({ error: "Falta id_doctor" }, 400);
		}

		const { data: doctorExistente, error: doctorExistenteError } = await adminClient
			.from("doctores")
			.select("id_doctor, auth_uuid")
			.eq("id_doctor", idDoctor)
			.maybeSingle();
		if (doctorExistenteError) return json({ error: doctorExistenteError.message }, 400);
		if (!doctorExistente) return json({ error: "Doctor no encontrado" }, 404);
		if (doctorExistente.auth_uuid) {
			const { error: passwordError } = await adminClient.auth.admin.updateUserById(
				doctorExistente.auth_uuid,
				{ password: clean(doctor.contrasena) },
			);
			if (passwordError) return json({ error: passwordError.message }, 400);
			return json({ doctor: doctorExistente, existing: true });
		}

		const { user: authUser, error: authError } = await createAuthUser(
			adminClient,
			doctor,
			"doctor_externo",
		);
		if (authError || !authUser) {
			return json({ error: authError || "No se pudo crear el usuario" }, 400);
		}

		const { data: doctorVinculado, error: doctorError } = await adminClient
			.from("doctores")
			.update({ auth_uuid: authUser.id })
			.eq("id_doctor", idDoctor)
			.select()
			.single();
		if (doctorError) {
			await adminClient.auth.admin.deleteUser(authUser.id);
			return json({ error: doctorError.message }, 400);
		}

		return json({ user: authUser, doctor: doctorVinculado });
	}

	if (body.action !== "create") return json({ error: "Accion no soportada" }, 400);

	const usuario = body.usuario || {};
	const email = clean(usuario.email);
	const password = clean(usuario.contrasena);
	if (!email || !password) {
		return json({ error: "Email y contrasena son requeridos" }, 400);
	}

	const { user: authUser, error: authError } = await createAuthUser(
		adminClient,
		usuario,
		String(usuario.rol || ""),
	);

	if (authError || !authUser) {
		return json({ error: authError || "No se pudo crear el usuario" }, 400);
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
		return json({ error: empleadoError.message }, 400);
	}

	return json({ user: authUser, empleado });
});
