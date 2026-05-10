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

	if (body.action === "updatePassword") {
		if (!body.auth_uuid || !body.password) {
			return json({ error: "Falta auth_uuid o password" }, 400);
		}
		const { error } = await adminClient.auth.admin.updateUserById(body.auth_uuid, {
			password: body.password,
		});
		if (error) return json({ error: error.message }, 400);
		return json({ ok: true });
	}

	if (body.action !== "create") return json({ error: "Accion no soportada" }, 400);

	const usuario = body.usuario || {};
	const email = clean(usuario.email);
	const password = clean(usuario.contrasena);
	if (!email || !password) {
		return json({ error: "Email y contrasena son requeridos" }, 400);
	}

	const { data: authData, error: authError } =
		await adminClient.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				nombre: clean(usuario.nombre),
				usuario: clean(usuario.usuario),
				rol: usuario.rol || "",
			},
		});

	if (authError || !authData.user) {
		return json({ error: authError?.message || "No se pudo crear el usuario" }, 400);
	}

	const empleadoPayload = {
		nombre: clean(usuario.nombre),
		usuario: clean(usuario.usuario),
		rol: usuario.rol || "",
		sucursal: clean(usuario.sucursal),
		email,
		telefono: clean(usuario.telefono),
		activo: Boolean(usuario.activo),
		auth_uuid: authData.user.id,
	};

	const { data: empleado, error: empleadoError } = await adminClient
		.from("empleados")
		.insert([empleadoPayload])
		.select()
		.single();

	if (empleadoError) {
		await adminClient.auth.admin.deleteUser(authData.user.id);
		return json({ error: empleadoError.message }, 400);
	}

	return json({ user: authData.user, empleado });
});
