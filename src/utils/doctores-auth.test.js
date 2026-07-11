import {
	actualizarDoctorConAuthentication,
	crearDoctorConAuthentication,
	vincularDoctorExistenteConAuthentication,
} from './doctores-auth';

describe('doctores auth', () => {
	test('solicita crear doctor con Authentication', async () => {
		const invoke = jest.fn().mockResolvedValue({
			data: { doctor: { id_doctor: 3 } },
			error: null,
		});
		const supabase = { functions: { invoke } };
		const doctor = { email: 'doc@example.com', contrasena: 'secreta' };

		await crearDoctorConAuthentication(supabase, doctor);

		expect(invoke).toHaveBeenCalledWith('admin-users', {
			body: { action: 'createDoctor', doctor },
		});
	});

	test('solicita vincular a Authentication un doctor existente', async () => {
		const invoke = jest.fn().mockResolvedValue({
			data: { doctor: { id_doctor: 3 } },
			error: null,
		});
		const supabase = { functions: { invoke } };
		const doctor = { id: 3, email: 'doc@example.com', contrasena: 'secreta' };

		await vincularDoctorExistenteConAuthentication(supabase, doctor);

		expect(invoke).toHaveBeenCalledWith('admin-users', {
			body: { action: 'provisionDoctorAuth', doctor },
		});
	});

	test('solicita actualizar doctor desde la funcion administrativa', async () => {
		const invoke = jest.fn().mockResolvedValue({
			data: { doctor: { id_doctor: 3 } },
			error: null,
		});
		const supabase = { functions: { invoke } };
		const doctor = { id: 3, email: 'doc@example.com' };

		await actualizarDoctorConAuthentication(supabase, doctor);

		expect(invoke).toHaveBeenCalledWith('admin-users', {
			body: { action: 'updateDoctor', doctor },
		});
	});
});
