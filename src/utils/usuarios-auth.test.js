import {
	buildEmpleadoInsertPayload,
	buildEmpleadoUpdatePayload,
	esRolAdministrador,
} from './usuarios-auth';

describe('usuarios auth payloads', () => {
	test('prepares new employees linked to Supabase Auth without storing passwords', () => {
		const payload = buildEmpleadoInsertPayload(
			{
				nombre: 'Ana Perez',
				usuario: 'aperez',
				contrasena: 'secreta123',
				rol: 'recepcionista',
				sucursal: 'Centro',
				email: 'ana@example.com',
				telefono: '5551234567',
				activo: true,
			},
			'auth-user-id',
		);

		expect(payload).toEqual({
			nombre: 'Ana Perez',
			usuario: 'aperez',
			rol: 'recepcionista',
			sucursal: 'Centro',
			email: 'ana@example.com',
			telefono: '5551234567',
			activo: true,
			auth_uuid: 'auth-user-id',
		});
		expect(payload).not.toHaveProperty('contrasena');
	});

	test('prepares employee updates without password fields', () => {
		const payload = buildEmpleadoUpdatePayload({
			nombre: 'Ana Perez',
			usuario: 'aperez',
			contrasena: 'nueva123',
			rol: 'admin',
			sucursal: '',
			email: 'ana@example.com',
			telefono: '',
			activo: false,
		});

		expect(payload).toMatchObject({
			nombre: 'Ana Perez',
			usuario: 'aperez',
			rol: 'admin',
			sucursal: '',
			email: 'ana@example.com',
			telefono: '',
			activo: false,
		});
		expect(payload).toHaveProperty('updated_at');
		expect(payload).not.toHaveProperty('contrasena');
	});

	test('recognizes roles allowed to manage auth users', () => {
		expect(esRolAdministrador('admin')).toBe(true);
		expect(esRolAdministrador('administrador')).toBe(true);
		expect(esRolAdministrador('desarrollador')).toBe(true);
		expect(esRolAdministrador('recepcionista')).toBe(false);
	});
});
