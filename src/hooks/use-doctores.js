import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';

const SELECT_DOCTORES = `
	id_doctor, nombre, primer_nombre, apellido_paterno, apellido_materno,
	fecha_nacimiento, sexo, telefono, email, usuario, auth_uuid,
	es_radiologo, especialidad, tipo_doctor, institucion, created_at
`;

export const useDoctores = ({ buscar = '', pagina = 1, porPagina = 500 } = {}) =>
	useQuery({
		queryKey: ['doctores', buscar, pagina, porPagina],
		queryFn: async () => {
			// Columnas explícitas en vez de `*`: la lista trae hasta 500 filas y con
			// `*` viajaba también la columna `contrasena` (y `edad`, `activo`,
			// `updated_at`, que nadie lee: la edad se calcula de fecha_nacimiento).
			// Todas estas columnas están en el esquema base, así que no hay riesgo
			// de romper la pantalla por una migración pendiente.
			let query = supabase.from('doctores').select(SELECT_DOCTORES, { count: 'exact' });
			if (buscar.trim()) {
				query = query.or(
					`nombre.ilike.%${buscar}%,apellido_paterno.ilike.%${buscar}%,apellido_materno.ilike.%${buscar}%,email.ilike.%${buscar}%`,
				);
			}
			const desde = (pagina - 1) * porPagina;
			const hasta = desde + porPagina - 1;
			const { data, error, count } = await query
				.order('id_doctor', { ascending: true })
				.range(desde, hasta);
			if (error) throw error;
			return { data: data ?? [], count: count ?? 0 };
		},
		staleTime: 1000 * 60 * 30,
	});
