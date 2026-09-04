import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { consultarClientesSeleccionables } from '../utils/clientes-seleccionables';
import { esErrorColumnaSchemaCache, esErrorTablaInexistente } from '../utils/supabase-errors';
import { crearRangoFechaMexico } from '../utils/fecha-mexico';

const SELECT_BASE = `
  id_venta, folio, fecha_venta, estado, subtotal, iva, descuento, total,
  forma_pago, pago_recibido, cambio, id_empleado, id_cliente, id_doctor, observaciones,
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
  forma_pago, pago_recibido, cambio, id_empleado, id_cliente, id_doctor, observaciones,
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

// El detalle del folio pide datos que no todos los entornos tienen. Se cargan
// por separado para que una columna faltante sólo deje ese dato vacío en lugar
// de hacer caer el select completo del reporte.
const completarDatosDePacientes = async (ventas = []) => {
  const ids = [...new Set(ventas.map((venta) => venta.pacientes?.id_paciente).filter(Boolean))];
  if (ids.length === 0) return ventas;

  const { data, error } = await supabase
    .from('pacientes')
    .select('id_paciente, telefono, email, edad, sexo')
    .in('id_paciente', ids);
  if (error) return ventas;

  const porId = new Map(data.map((paciente) => [paciente.id_paciente, paciente]));
  return ventas.map((venta) => {
    const datos = porId.get(venta.pacientes?.id_paciente);
    return datos ? { ...venta, pacientes: { ...venta.pacientes, ...datos } } : venta;
  });
};

const completarEmpresasDeVentas = async (ventas = []) => {
  const ids = ventas.map((venta) => venta.id_venta).filter(Boolean);
  if (ids.length === 0) return ventas;

  const { data, error } = await supabase
    .from('ventas')
    .select('id_venta, id_empresa')
    .in('id_venta', ids);
  if (error) return ventas;

  const porVenta = new Map(data.map((venta) => [venta.id_venta, venta.id_empresa]));
  return ventas.map((venta) => ({ ...venta, id_empresa: porVenta.get(venta.id_venta) ?? null }));
};

export const completarDatosDelDetalle = async (ventas = []) =>
  completarEmpresasDeVentas(await completarDatosDePacientes(ventas));

const fetchVentasConFallback = async ({ fechaInicial, fechaFinal, estado = 'activo' }) => {
	const rango = crearRangoFechaMexico(fechaInicial, fechaFinal);
	const crearQuery = (select) =>
    supabase
      .from('ventas')
      .select(select)
      .eq('estado', estado)
		.gte('fecha_venta', rango.inicio)
		.lt('fecha_venta', rango.fin)
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
  return completarDatosDelDetalle(data ?? []);
};

// ── Hook de ventas con caché ──────────────────────────────────────────────────
export const useReporteVentas = ({ fechaInicial, fechaFinal }) =>
  useQuery({
    queryKey: ['reporte-ventas', fechaInicial, fechaFinal],
    queryFn: () => fetchVentasConFallback({ fechaInicial, fechaFinal }),
    enabled: !!(fechaInicial && fechaFinal),
    staleTime: 1000 * 60 * 3,
  });

// Las canceladas van en su propia consulta y no mezcladas con las activas: el
// reporte entero -tabla, gráficas, totales, descargas- cuenta ventas activas, y
// meterlas en la misma lista inflaría todo. Aquí sólo se cuentan, y como traen
// la misma forma pasan por los mismos filtros de la pantalla, así que el número
// respeta la sucursal, el cliente y lo demás que esté puesto.
export const useVentasCanceladas = ({ fechaInicial, fechaFinal }) =>
  useQuery({
    queryKey: ['reporte-ventas-canceladas', fechaInicial, fechaFinal],
    queryFn: () => fetchVentasConFallback({ fechaInicial, fechaFinal, estado: 'cancelado' }),
    enabled: !!(fechaInicial && fechaFinal),
    staleTime: 1000 * 60 * 3,
  });

// Pagos cancelados: los movimientos de cancelación del período. La tabla es
// posterior al resto del sistema, así que si todavía no existe se devuelve cero
// en lugar de romper el reporte entero por un renglón del resumen.
export const usePagosCancelados = ({ fechaInicial, fechaFinal }) =>
  useQuery({
    queryKey: ['reporte-ventas-pagos-cancelados', fechaInicial, fechaFinal],
    queryFn: async () => {
      const rango = crearRangoFechaMexico(fechaInicial, fechaFinal);
      const { count, error } = await supabase
        .from('movimientos_pago_venta')
        .select('id', { count: 'exact', head: true })
        .eq('tipo_movimiento', 'cancelacion')
        .gte('created_at', rango.inicio)
        .lt('created_at', rango.fin);

      if (error) {
        if (!esErrorTablaInexistente(error, 'movimientos_pago_venta')) {
          console.warn('No se pudieron contar los pagos cancelados:', error);
        }
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!(fechaInicial && fechaFinal),
    staleTime: 1000 * 60 * 3,
  });

// ── Hook de catálogos (sucursales, vendedores, etc.) ─────────────────────────
export const useCatalogosReporte = () =>
  useQuery({
    queryKey: ['catalogos-reporte'],
    queryFn: async () => {
      const [sucursalesR, vendedoresR, clientesR, doctoresR, areasR, empresasR] = await Promise.all([
        supabase.from('sucursales').select('id_sucursal, nombre').order('nombre'),
        supabase.from('empleados').select('id_empleado, nombre').order('nombre'),
        // Solo los convenios vigentes: los dados de baja llenaban el filtro de
        // nombres que ya no seleccionan nada. Los que sigan apareciendo en las
        // ventas cargadas los repone `clientesParaFiltro` en la pantalla.
        consultarClientesSeleccionables(),
        supabase.from('doctores').select('*').order('nombre'),
        supabase.from('areas').select('id_area, nombre').order('nombre'),
        supabase.from('empresas').select('id_empresa, nombre').order('nombre'),
      ]);
      return {
        sucursales: sucursalesR.data ?? [],
        vendedores: vendedoresR.data ?? [],
        clientes:   clientesR.data ?? [],
        doctores:   doctoresR.data ?? [],
        areas:      areasR.data ?? [],
        empresas:   empresasR.data ?? [],
      };
    },
    staleTime: 1000 * 60 * 30,
  });
