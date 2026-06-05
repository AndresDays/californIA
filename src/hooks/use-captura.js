import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { aplicarEstadoRadiologiaACaptura } from '../utils/captura-row-status';

export const cargarRadiologiaParaCaptura = async ({ idsVentas = [], idsEstudiosVenta = [], idsPacientes = [] } = {}) => {
	const selectRadiologia =
		'id_estudio, id_venta, id_estudio_venta, id_paciente, tipo_estudio, descripcion, estado, listo_entrega, reporte, fecha_estudio';
	const selectRadiologiaBasico =
		'id_estudio, id_paciente, tipo_estudio, descripcion, estado, reporte, fecha_estudio';

	const consultas = [];
	if (idsVentas.length) {
		consultas.push(
			supabase.from('estudios_radiologia').select(selectRadiologia).in('id_venta', idsVentas),
		);
	}
	if (idsEstudiosVenta.length) {
		consultas.push(
			supabase.from('estudios_radiologia').select(selectRadiologia).in('id_estudio_venta', idsEstudiosVenta),
		);
	}
	if (idsPacientes.length) {
		consultas.push(
			supabase.from('estudios_radiologia').select(selectRadiologiaBasico).in('id_paciente', idsPacientes),
		);
	}
	if (!consultas.length) return [];

	const respuestas = await Promise.all(consultas);
	const estudios = [];
	const idsIncluidos = new Set();

	for (const { data, error } of respuestas) {
		if (error) {
			console.warn('No se pudo cargar estado de radiologia para captura:', error);
			continue;
		}
		for (const estudio of data ?? []) {
			const id =
				estudio.id_estudio ||
				`${estudio.id_venta || ''}-${estudio.id_estudio_venta || ''}-${estudio.descripcion || ''}`;
			if (idsIncluidos.has(id)) continue;
			idsIncluidos.add(id);
			estudios.push(estudio);
		}
	}

	return estudios;
};

export const useCaptura = ({ fechaInicial, fechaFinal } = {}) =>
	useQuery({
		queryKey: ['captura', fechaInicial, fechaFinal],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('ventas')
				.select(
					`id_venta, folio, fecha_venta, estado, total, pago_recibido,
					pacientes (id_paciente, nombre, fecha_nacimiento, sexo, tipo),
					clientes (id_cliente, nombre),
					estudios_venta (id_estudio_venta, clave_estudio, descripcion_estudio, area, estado_captura, estado_validacion, muestra_pendiente)`,
				)
				.gte('fecha_venta', `${fechaInicial}T00:00:00`)
				.lte('fecha_venta', `${fechaFinal}T23:59:59`)
				.eq('estado', 'activo')
				.order('fecha_venta', { ascending: false });

			if (error) throw error;

			const ventasData = data ?? [];
			const idsVentas = ventasData.map((v) => v.id_venta).filter(Boolean);
			const idsPacientes = ventasData.map((v) => v.pacientes?.id_paciente).filter(Boolean);
			const idsEstudiosVenta = ventasData
				.flatMap((v) => v.estudios_venta ?? [])
				.map((e) => e.id_estudio_venta)
				.filter(Boolean);

			const estudiosRadiologia = await cargarRadiologiaParaCaptura({
				idsVentas,
				idsEstudiosVenta,
				idsPacientes,
			});

			const radiologiaPorVenta = estudiosRadiologia.reduce((acc, e) => {
				if (!e.id_venta) return acc;
				acc[e.id_venta] = [...(acc[e.id_venta] ?? []), e];
				return acc;
			}, {});
			const radiologiaPorEstudioVenta = estudiosRadiologia.reduce((acc, e) => {
				if (!e.id_estudio_venta) return acc;
				acc[e.id_estudio_venta] = [...(acc[e.id_estudio_venta] ?? []), e];
				return acc;
			}, {});
			const radiologiaPorPaciente = estudiosRadiologia.reduce((acc, e) => {
				if (!e.id_paciente) return acc;
				acc[e.id_paciente] = [...(acc[e.id_paciente] ?? []), e];
				return acc;
			}, {});

			return ventasData.map((venta) => ({
				...venta,
				estudios_venta: aplicarEstadoRadiologiaACaptura(
					venta.estudios_venta ?? [],
					[
						...(radiologiaPorVenta[venta.id_venta] ?? []),
						...(radiologiaPorPaciente[venta.pacientes?.id_paciente] ?? []),
						...(venta.estudios_venta ?? []).flatMap(
							(e) => radiologiaPorEstudioVenta[e.id_estudio_venta] ?? [],
						),
					],
				),
			}));
		},
		enabled: !!(fechaInicial && fechaFinal),
		staleTime: 1000 * 60 * 3,
	});

export const useCatalogosCaptura = () =>
	useQuery({
		queryKey: ['catalogos-captura'],
		queryFn: async () => {
			const [clientesResp, areasResp] = await Promise.all([
				supabase.from('clientes').select('id_cliente, nombre').order('nombre'),
				supabase.from('areas').select('id_area, nombre').order('nombre'),
			]);
			return {
				clientes: clientesResp.error ? [] : (clientesResp.data ?? []),
				areas: areasResp.error ? [] : (areasResp.data ?? []),
			};
		},
		staleTime: 1000 * 60 * 30,
	});
