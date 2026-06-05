import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';

const SELECT_VENTAS = `
  id_venta, folio, fecha_venta, estado, total, pago_recibido,
  forma_pago, actor_nombre, empleado_nombre, id_sucursal, sucursal,
  nombre_paciente, id_cliente, id_doctor,
  pacientes ( nombre ),
  clientes ( id_cliente, nombre ),
  estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, precio, area, estado_validacion, entregado )
`;

export const useVentas = ({ fechaInicial, fechaFinal, idSucursal } = {}) =>
  useQuery({
    queryKey: ['ventas', fechaInicial, fechaFinal, idSucursal],
    queryFn: async () => {
      let q = supabase.from('ventas').select(SELECT_VENTAS).eq('estado', 'activo');
      if (fechaInicial) q = q.gte('fecha_venta', `${fechaInicial}T00:00:00`);
      if (fechaFinal)   q = q.lte('fecha_venta', `${fechaFinal}T23:59:59`);
      if (idSucursal)   q = q.eq('id_sucursal', idSucursal);
      const { data, error } = await q.order('fecha_venta', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!(fechaInicial && fechaFinal),
  });
