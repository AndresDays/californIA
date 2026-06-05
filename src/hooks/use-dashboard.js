import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { CITA_ESTADOS, CITA_ESTADOS_DASHBOARD } from '../utils/cita-lifecycle';
import {
  calcularIngresosPorAreaVentasPagadas,
  calcularIngresosVentasPagadas,
} from '../utils/dashboard-stats';

const pad = (n) => String(n).padStart(2, '0');
const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── Estadísticas principales (tarjetas) ───────────────────────────────────────
export const useStatsDashboard = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const ahora = new Date();
      const hoy = fechaLocal(ahora);
      const horaActualStr = `${hoy}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:00`;

      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
      const inicioMesStr = `${fechaLocal(inicioMes)}T00:00:00`;
      const finMesStr = `${fechaLocal(finMes)}T00:00:00`;

      const [
        { count: totalPacientes },
        { count: citasHoy },
        { data: citasCompletadas },
        { data: ventasMes },
      ] = await Promise.all([
        supabase.from('pacientes').select('*', { count: 'exact', head: true }),
        supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .gte('fecha_estudio', hoy)
          .lt('fecha_estudio', `${hoy}T23:59:59`)
          .not('estado', 'eq', 'cancelada'),
        supabase
          .from('citas')
          .select('tipo_estudio, fecha_estudio')
          .in('estado', [CITA_ESTADOS.LISTA_ENTREGA, CITA_ESTADOS.ENTREGADA]),
        supabase
          .from('ventas')
          .select('fecha_venta, estado, total, pago_recibido')
          .eq('estado', 'activo')
          .gte('fecha_venta', inicioMesStr)
          .lt('fecha_venta', finMesStr),
      ]);

      const estudiosRealizados = (citasCompletadas ?? []).reduce((total, cita) => {
        if (cita.fecha_estudio > horaActualStr) return total;
        if (cita.tipo_estudio) {
          const arr = cita.tipo_estudio.split(',').map((e) => e.trim()).filter(Boolean);
          return total + (arr.length || 1);
        }
        return total + 1;
      }, 0);

      return {
        totalPacientes: totalPacientes ?? 0,
        citasHoy: citasHoy ?? 0,
        estudiosRealizados,
        ingresos: calcularIngresosVentasPagadas(ventasMes ?? [], inicioMesStr, finMesStr),
      };
    },
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60 * 5,
  });

// ── Próximas citas (tabla del dashboard) ─────────────────────────────────────
export const useCitasProximasDashboard = () => {
  const ahora = new Date();
  const horaLocal = `${fechaLocal(ahora)}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:00`;

  return useQuery({
    queryKey: ['dashboard-citas-proximas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          id_cita, fecha_estudio, estado, tipo_estudio, monto,
          id_sucursal, nombre_paciente, telefono_paciente,
          pacientes (nombre, telefono, id_paciente),
          sucursales (id_sucursal, nombre),
          clientes (id_cliente, nombre),
          empresas (id_empresa, nombre),
          tipos_estudio (id_tipo_estudio, nombre)
        `)
        .gte('fecha_estudio', horaLocal)
        .in('estado', CITA_ESTADOS_DASHBOARD)
        .order('fecha_estudio', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
};

// ── Estadísticas semanales/mensuales (gráfica) ────────────────────────────────
export const useEstadisticasSemanales = ({ vistaGrafica, sucursalFiltro }) =>
  useQuery({
    queryKey: ['dashboard-estadisticas', vistaGrafica, sucursalFiltro],
    queryFn: async () => {
      const hoy = new Date();
      let inicio, fin, labels, numPeriodos;

      if (vistaGrafica === 'semana') {
        const diaSemana = hoy.getDay();
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - diaSemana);
        inicio.setHours(0, 0, 0, 0);
        fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 7);
        labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        numPeriodos = 7;
      } else if (vistaGrafica === 'mes') {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        numPeriodos = Math.ceil(ultimoDia.getDate() / 7);
        labels = Array.from({ length: numPeriodos }, (_, i) => `Sem ${i + 1}`);
      } else {
        inicio = new Date(hoy.getFullYear(), 0, 1);
        fin = new Date(hoy.getFullYear() + 1, 0, 1);
        labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        numPeriodos = 12;
      }

      const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`;

      let queryCitas = supabase
        .from('citas')
        .select('fecha_estudio, tipo_estudio, id_sucursal, estado')
        .gte('fecha_estudio', fmt(inicio))
        .lt('fecha_estudio', fmt(fin));
      if (sucursalFiltro) queryCitas = queryCitas.eq('id_sucursal', sucursalFiltro);

      let queryVentas = supabase
        .from('ventas')
        .select(`fecha_venta, estado, total, pago_recibido, id_sucursal, sucursal,
          estudios_venta ( clave_estudio, descripcion_estudio, precio, area, id_sucursal, sucursal )`)
        .eq('estado', 'activo')
        .gte('fecha_venta', fmt(inicio))
        .lt('fecha_venta', fmt(fin));
      if (sucursalFiltro) queryVentas = queryVentas.eq('id_sucursal', sucursalFiltro);

      const [{ data: citas }, { data: ventas }] = await Promise.all([queryCitas, queryVentas]);

      const cR = new Array(numPeriodos).fill(0), cL = new Array(numPeriodos).fill(0);
      const iR = new Array(numPeriodos).fill(0), iL = new Array(numPeriodos).fill(0);

      const idx = (f) =>
        vistaGrafica === 'semana' ? f.getDay()
        : vistaGrafica === 'mes'  ? Math.floor((f.getDate() - 1) / 7)
        : f.getMonth();

      (citas ?? []).forEach((c) => {
        if (c.estado === 'cancelada') return;
        const i = idx(new Date(c.fecha_estudio));
        const tipo = c.tipo_estudio?.toLowerCase() ?? '';
        if (tipo.includes('radio') || tipo.includes('rayos') || tipo.includes('rx')) cR[i]++;
        else cL[i]++;
      });

      (ventas ?? []).forEach((v) => {
        const f = new Date(v.fecha_venta);
        if (Number.isNaN(f.getTime())) return;
        const i = idx(f);
        const ing = calcularIngresosPorAreaVentasPagadas([v]);
        iR[i] += ing.radiologia;
        iL[i] += ing.laboratorio;
      });

      return labels.map((label, i) => {
        const esActual =
          vistaGrafica === 'semana' ? i === hoy.getDay()
          : vistaGrafica === 'mes'  ? i === Math.floor((hoy.getDate() - 1) / 7)
          : i === hoy.getMonth();
        return {
          label,
          radiologia: cR[i], laboratorio: cL[i], total: cR[i] + cL[i],
          ingresosRadiologia: iR[i], ingresosLaboratorio: iL[i], ingresosTotal: iR[i] + iL[i],
          esActual,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
