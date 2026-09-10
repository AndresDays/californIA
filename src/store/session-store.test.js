import { useSessionStore } from './session-store';
import { supabase } from '../lib/supabase-client';

jest.mock('../lib/supabase-client', () => ({
	 supabase: { from: jest.fn() },
}));

const query = (data, error = null) => ({
	select: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	maybeSingle: jest.fn().mockResolvedValue({ data, error }),
});

describe('session store', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useSessionStore.setState({
			user: { id: 'auth-doctor-3' },
			empleadoData: null,
			empleadoLoading: false,
		});
	});

	test('resuelve un doctor externo aunque no tenga fila en empleados', async () => {
		supabase.from
			.mockReturnValueOnce(query(null))
			// Sin fila en empleados se revisa primero si es un convenio y luego si
			// es un médico externo.
			.mockReturnValueOnce(query(null))
			.mockReturnValueOnce(query({
				id_doctor: 3,
				nombre: 'PRUEBA1 RADIOLOGO',
				auth_uuid: 'auth-doctor-3',
				es_radiologo: true,
				especialidad: null,
			}));

		const perfil = await useSessionStore.getState().fetchEmpleadoActual('auth-doctor-3');

		expect(perfil).toMatchObject({
			rol: 'doctor_externo',
			id_doctor: 3,
			es_radiologo: true,
		});
		expect(supabase.from).toHaveBeenNthCalledWith(1, 'empleados');
		expect(supabase.from).toHaveBeenNthCalledWith(2, 'clientes_accesos');
		expect(supabase.from.mock.results[0].value.select).toHaveBeenCalledWith(
			'nombre, rol, id_doctor, sucursal',
		);
		expect(supabase.from).toHaveBeenNthCalledWith(3, 'doctores');
	});

	test('mantiene la ruta protegida en espera mientras restaura el perfil de una sesión', () => {
		useSessionStore.getState().setUser({ id: 'auth-radiologo-clinico' });

		expect(useSessionStore.getState().empleadoLoading).toBe(true);
	});

	// El convenio no está en `empleados` ni en `doctores`: su cuenta vive en
	// `clientes_accesos` y de ahí sale su rol y el convenio que lo acota.
	test('resuelve el acceso de un cliente de convenio', async () => {
		supabase.from
			.mockReturnValueOnce(query(null))
			.mockReturnValueOnce(query({
				id_cliente: 7,
				modulo: 'laboratorio',
				usuario: 'lab@medisim.mx',
				activo: true,
				clientes: { id_cliente: 7, nombre: 'MEDISIM' },
			}));

		const perfil = await useSessionStore.getState().fetchEmpleadoActual('auth-doctor-3');

		expect(perfil).toMatchObject({
			rol: 'cliente_laboratorio',
			id_cliente: 7,
			cliente_nombre: 'MEDISIM',
		});
	});

	// Una fila a medias -sin convenio o sin módulo- no es un acceso: dejarlo
	// entrar lo pondría en una pantalla sin nada que ver.
	test('una fila de acceso incompleta no da entrada', async () => {
		supabase.from
			.mockReturnValueOnce(query(null))
			.mockReturnValueOnce(query({ id_cliente: null, modulo: 'laboratorio' }))
			.mockReturnValueOnce(query(null));

		const perfil = await useSessionStore.getState().fetchEmpleadoActual('auth-doctor-3');

		expect(perfil).toBeNull();
	});
});
