import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';

export const useSucursales = () =>
  useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id_sucursal, nombre')
        .order('nombre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30, // sucursales casi nunca cambian, 30 min
  });
