import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { esErrorTablaInexistente } from '../utils/supabase-errors';
import { crearRangoFechaMexico } from '../utils/fecha-mexico';

const SELECT_VENTAS_ADMIN = `
	id_venta, folio, fecha_venta, estado, total, pago_recibido, id_cliente, id_doctor, id_sucursal, sucursal,
	clientes ( id_cliente, nombre ),
	citas ( id_cita, id_sucursal, sucursales ( id_sucursal, nombre ) ),
	estudios_venta (
		id_estudio_venta, clave_estudio, descripcion_estudio, precio, area,
		estado_validacion, entregado, muestra_pendiente, id_sucursal, sucursal
	)
`;

export const useReporteAdministrativo = ({ fechaInicial, fechaFinal, sucursalSeleccionada } = {}) =>
	useQuery({
		queryKey: ['reporte-administrativo', fechaInicial, fechaFinal, sucursalSeleccionada],
		queryFn: async () => {
			const rango = crearRangoFechaMexico(fechaInicial, fechaFinal);
			let ventasQuery = supabase
				.from('ventas')
				.select(SELECT_VENTAS_ADMIN)
				.eq('estado', 'activo')
				.gte('fecha_venta', rango.inicio)
				.lt('fecha_venta', rango.fin)
				.order('fecha_venta', { ascending: false });
			let radiologiaQuery = supabase
				.from('estudios_radiologia')
				.select('id_estudio, id_venta, estado, listo_entrega, entregado, fecha_estudio')
				.gte('fecha_estudio', rango.inicio)
				.lt('fecha_estudio', rango.fin);

			if (sucursalSeleccionada) {
				ventasQuery = ventasQuery.eq('id_sucursal', sucursalSeleccionada);
			}

			const [ventasResp, radiologiaResp, auditoriaResp] = await Promise.all([
				ventasQuery,
				radiologiaQuery,
				supabase
					.from('solicitudes_auditoria')
					.select('id_venta, evento, created_at')
					.gte('created_at', rango.inicio)
					.lt('created_at', rango.fin)
					.order('created_at', { ascending: true }),
			]);

			if (ventasResp.error) throw ventasResp.error;
			if (radiologiaResp.error) throw radiologiaResp.error;
			if (
				auditoriaResp.error &&
				!esErrorTablaInexistente(auditoriaResp.error, 'solicitudes_auditoria')
			) {
				throw auditoriaResp.error;
			}

			const ventasData = ventasResp.data ?? [];
			const radiologiaData = radiologiaResp.data ?? [];
			const idsVentasSucursal = new Set(
				ventasData
					.map((venta) => venta.id_venta)
					.filter((id) => id !== null && id !== undefined)
					.map(String),
			);

			return {
				ventas: ventasData,
				estudiosRadiologia: sucursalSeleccionada
					? radiologiaData.filter((estudio) =>
							idsVentasSucursal.has(String(estudio.id_venta || '')),
						)
					: radiologiaData,
				eventosAuditoria: auditoriaResp.error ? [] : (auditoriaResp.data ?? []),
			};
		},
		enabled: !!(fechaInicial && fechaFinal),
		staleTime: 1000 * 60 * 3,
	});

export const useCatalogosAdministrativos = () =>
	useQuery({
		queryKey: ['catalogos-administrativos'],
		queryFn: async () => {
			const [sucursalesResp, doctoresResp, clientesResp] = await Promise.all([
				supabase.from('sucursales').select('id_sucursal, nombre').order('nombre'),
				supabase.from('doctores').select('*').order('nombre'),
				supabase.from('clientes').select('id_cliente, nombre').order('nombre'),
			]);
			return {
				sucursales: sucursalesResp.error ? [] : (sucursalesResp.data ?? []),
				doctores: doctoresResp.error ? [] : (doctoresResp.data ?? []),
				clientes: clientesResp.error ? [] : (clientesResp.data ?? []),
			};
		},
		staleTime: 1000 * 60 * 30,
	});
