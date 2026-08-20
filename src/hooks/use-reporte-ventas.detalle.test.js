const consultas = [];

jest.mock('../lib/supabase-client', () => ({
	supabase: {
		from: (tabla) => {
			const respuesta = consultas.find((c) => c.tabla === tabla)?.respuesta ?? {
				data: [],
				error: null,
			};
			const encadenable = {
				select: () => encadenable,
				eq: () => encadenable,
				gte: () => encadenable,
				lt: () => encadenable,
				in: () => Promise.resolve(respuesta),
				order: () => Promise.resolve(respuesta),
			};
			return encadenable;
		},
	},
}));

import { completarDatosDelDetalle } from './use-reporte-ventas';

// El reporte se queda sin esos datos, no sin reporte: así se comporta cuando un
// entorno no tiene la columna id_empresa o no deja leer pacientes.
describe('datos del detalle del folio', () => {
	beforeEach(() => {
		consultas.length = 0;
	});

	const ventas = [{ id_venta: 1, folio: 'F-1', pacientes: { id_paciente: 7, nombre: 'Maria' } }];

	test('completa el paciente y la empresa de cada venta', async () => {
		consultas.push({
			tabla: 'pacientes',
			respuesta: {
				data: [{ id_paciente: 7, telefono: '3221234567', email: 'm@e.com', edad: 42, sexo: 'F' }],
				error: null,
			},
		});
		consultas.push({
			tabla: 'ventas',
			respuesta: { data: [{ id_venta: 1, id_empresa: 3 }], error: null },
		});

		const [venta] = await completarDatosDelDetalle(ventas);

		expect(venta.pacientes).toMatchObject({ telefono: '3221234567', email: 'm@e.com', edad: 42 });
		expect(venta.id_empresa).toBe(3);
	});

	test('sin la columna de empresa el resto del detalle sigue llegando', async () => {
		consultas.push({
			tabla: 'pacientes',
			respuesta: { data: [{ id_paciente: 7, telefono: '3221234567' }], error: null },
		});
		consultas.push({
			tabla: 'ventas',
			respuesta: { data: null, error: { message: 'column ventas.id_empresa does not exist' } },
		});

		const [venta] = await completarDatosDelDetalle(ventas);

		expect(venta.pacientes.telefono).toBe('3221234567');
		expect(venta.id_empresa).toBeUndefined();
	});

	test('si no se pueden leer pacientes las ventas quedan intactas', async () => {
		consultas.push({
			tabla: 'pacientes',
			respuesta: { data: null, error: { message: 'permission denied' } },
		});
		consultas.push({
			tabla: 'ventas',
			respuesta: { data: [{ id_venta: 1, id_empresa: 3 }], error: null },
		});

		const [venta] = await completarDatosDelDetalle(ventas);

		expect(venta.pacientes).toEqual({ id_paciente: 7, nombre: 'Maria' });
		expect(venta.id_empresa).toBe(3);
	});
});
