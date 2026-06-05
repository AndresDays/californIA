import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { CITA_ESTADOS_DASHBOARD } from '../utils/cita-lifecycle';

export const useCitasProximas = ({ limite = 5 } = {}) => {
  const ahora = new Date();
  const horaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:00`;

  return useQuery({
    queryKey: ['citas', 'proximas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          id_cita, fecha_estudio, estado, tipo_estudio, monto,
          id_sucursal, nombre_paciente, telefono_paciente,
          pacientes ( nombre, telefono, id_paciente ),
          sucursales ( id_sucursal, nombre ),
          clientes ( id_cliente, nombre ),
          empresas ( id_empresa, nombre ),
          tipos_estudio ( id_tipo_estudio, nombre )
        `)
        .gte('fecha_estudio', horaLocal)
        .in('estado', CITA_ESTADOS_DASHBOARD)
        .order('fecha_estudio', { ascending: true })
        .limit(limite);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5, // refresca automático cada 5 min
  });
};

export const useCitasHoy = () => {
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['citas', 'hoy'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_estudio', hoy)
        .lt('fecha_estudio', `${hoy}T23:59:59`)
        .not('estado', 'eq', 'cancelada');
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 3,
  });
};
