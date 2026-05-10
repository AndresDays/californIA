import { obtenerMensajeErrorFuncion } from './supabase-functions';

describe('obtenerMensajeErrorFuncion', () => {
	test('reads json error messages returned by edge functions', async () => {
		const error = new Error('Edge Function returned a non-2xx status code');
		error.context = {
			clone: () => ({
				json: () => Promise.resolve({ error: 'No tienes permiso para administrar usuarios' }),
			}),
		};

		await expect(obtenerMensajeErrorFuncion(error)).resolves.toBe(
			'No tienes permiso para administrar usuarios',
		);
	});

	test('falls back to the original error message', async () => {
		const error = new Error('Network failed');

		await expect(obtenerMensajeErrorFuncion(error)).resolves.toBe('Network failed');
	});
});
