import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { esErrorColumnaSchemaCache } from '../utils/supabase-errors';

const SELECT_BASE = `
  id_venta, folio, fecha_venta, estado, subtotal, iva, descuento, total,
  forma_pago, pago_recibido, cambio, id_empleado, id_cliente, id_doctor,
  pacientes ( id_paciente, nombre ),
  clientes ( id_cliente, nombre ),
  empleados ( id_empleado, nombre ),
  estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, precio, area )
`;

const SELECT_SUCURSAL = SELECT_BASE.replace(
  'id_doctor,',
  'id_doctor, id_sucursal, sucursal,',
).replace(
  'estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, precio, area )',
  'estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, precio, area, id_sucursal, sucursal )',
);

const SELECT_CON_CITA = SELECT_SUCURSAL.replace(
  'id_doctor, id_sucursal, sucursal,',
  'id_doctor, id_cita, id_sucursal, sucursal,',
);

const SELECT_FULL = `
  id_venta, folio, fecha_venta, estado, subtotal, iva, descuento, total,
  forma_pago, pago_recibido, cambio, id_empleado, id_cliente, id_doctor,
  id_cita, id_sucursal, sucursal,
  pacientes ( id_paciente, nombre ),
  clientes ( id_cliente, nombre ),
  empleados ( id_empleado, nombre ),
  citas ( id_cita, id_sucursal, sucursales ( id_sucursal, nombre ) ),
  estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, precio, area, id_sucursal, sucursal )
`;

const puedeReintentarSinCita = (error) => {
  const msg = error?.message || '';
  return (
    esErrorColumnaSchemaCache(error, 'id_cita') ||
    msg.includes('relationship') ||
    msg.includes('citas')
  );
};

const cargarCitasDeVentas = async (ventas = []) => {
  const idsCita = [...new Set(ventas.map((v) => v.id_cita).filter(Boolean))];
  if (idsCita.length === 0) return ventas;

  const { data, error } = await supabase
    .from('citas')
    .select('id_cita, id_sucursal, sucursales ( id_sucursal, nombre )')
    .in('id_cita', idsCita);

  if (error) return ventas;

  const citasPorId = new Map(data.map((c) => [c.id_cita, c]));
  return ventas.map((v) => ({ ...v, citas: citasPorId.get(v.id_cita) || v.citas }));
};

const fetchVentasConFallback = async ({ fechaInicial, fechaFinal }) => {
  const crearQuery = (select) =>
    supabase
      .from('ventas')
      .select(select)
      .eq('estado', 'activo')
      .gte('fecha_venta', `${fechaInicial}T00:00:00`)
      .lte('fecha_venta', `${fechaFinal}T23:59:59`)
      .order('fecha_venta', { ascending: false });

  // Intento 1: query completo
  let { data, error } = await crearQuery(SELECT_FULL);

  // Intento 2: sin relación citas
  if (error && puedeReintentarSinCita(error)) {
    const r = await crearQuery(SELECT_CON_CITA);
    data = r.data; error = r.error;
    if (!error) data = await cargarCitasDeVentas(data ?? []);
  }

  // Intento 3: sin columnas de sucursal
  if (error && (esErrorColumnaSchemaCache(error, 'id_sucursal') || esErrorColumnaSchemaCache(error, 'sucursal'))) {
    const r = await crearQuery(SELECT_SUCURSAL);
    data = r.data; error = r.error;
  }

  // Intento 4: base mínima
  if (error) {
    const r = await crearQuery(SELECT_BASE);
    data = r.data; error = r.error;
  }

  if (error) throw error;
  return data ?? [];
};

// ── Hook de ventas con caché ──────────────────────────────────────────────────
export const useReporteVentas = ({ fechaInicial, fechaFinal }) =>
  useQuery({
    queryKey: ['reporte-ventas', fechaInicial, fechaFinal],
    queryFn: () => fetchVentasConFallback({ fechaInicial, fechaFinal }),
    enabled: !!(fechaInicial && fechaFinal),
    staleTime: 1000 * 60 * 3,
  });

// ── Hook de catálogos (sucursales, vendedores, etc.) ─────────────────────────
export const useCatalogosReporte = () =>
  useQuery({
    queryKey: ['catalogos-reporte'],
    queryFn: async () => {
      const [sucursalesR, vendedoresR, clientesR, doctoresR, areasR] = await Promise.all([
        supabase.from('sucursales').select('id_sucursal, nombre').order('nombre'),
        supabase.from('empleados').select('id_empleado, nombre').order('nombre'),
        supabase.from('clientes').select('id_cliente, nombre').order('nombre'),
        supabase.from('doctores').select('*').order('nombre'),
        supabase.from('areas').select('id_area, nombre').order('nombre'),
      ]);
      return {
        sucursales: sucursalesR.data ?? [],
        vendedores: vendedoresR.data ?? [],
        clientes:   clientesR.data ?? [],
        doctores:   doctoresR.data ?? [],
        areas:      areasR.data ?? [],
      };
    },
    staleTime: 1000 * 60 * 30,
  });
