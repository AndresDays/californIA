import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';

export const useClientes = ({ buscar = '', pagina = 1, porPagina = 500 } = {}) =>
	useQuery({
		queryKey: ['clientes-lista', buscar, pagina, porPagina],
		queryFn: async () => {
			let query = supabase.from('pacientes').select('*', { count: 'exact' });
			if (buscar.trim()) {
				query = query.or(
					`nombre.ilike.%${buscar}%,apellido_paterno.ilike.%${buscar}%,apellido_materno.ilike.%${buscar}%,email.ilike.%${buscar}%`,
				);
			}
			const desde = (pagina - 1) * porPagina;
			const hasta = desde + porPagina - 1;
			const { data, error, count } = await query
				.range(desde, hasta)
				.order('id_paciente', { ascending: true });
			if (error) throw error;
			return { data: data ?? [], count: count ?? 0 };
		},
		staleTime: 1000 * 60 * 30,
	});
