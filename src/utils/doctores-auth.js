const invocarAdminUsers = async (supabase, body) => {
	const { data, error } = await supabase.functions.invoke('admin-users', { body });
	if (error) throw error;
	if (data?.error) throw new Error(data.error);
	return data;
};

export const crearDoctorConAuthentication = (supabase, doctor) =>
	invocarAdminUsers(supabase, { action: 'createDoctor', doctor });

export const actualizarDoctorConAuthentication = (supabase, doctor) =>
	invocarAdminUsers(supabase, { action: 'updateDoctor', doctor });

export const vincularDoctorExistenteConAuthentication = (supabase, doctor) =>
	invocarAdminUsers(supabase, { action: 'provisionDoctorAuth', doctor });

export const actualizarContrasenaDoctor = (supabase, authUuid, password) =>
	invocarAdminUsers(supabase, {
		action: 'updateDoctorPassword',
		auth_uuid: authUuid,
		password,
	});
