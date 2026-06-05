import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';

export const usePacientes = ({ busqueda = '', pagina = 1, porPagina = 500 } = {}) =>
  useQuery({
    queryKey: ['pacientes', busqueda, pagina, porPagina],
    queryFn: async () => {
      let query = supabase.from('pacientes').select('*', { count: 'exact' });
      if (busqueda.trim()) {
        query = query.or(
          `nombre.ilike.%${busqueda}%,apellido_paterno.ilike.%${busqueda}%,apellido_materno.ilike.%${busqueda}%,email.ilike.%${busqueda}%`,
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
    staleTime: 1000 * 60 * 2,
  });

export const useTotalPacientes = () =>
  useQuery({
    queryKey: ['pacientes', 'total'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 5,
  });
