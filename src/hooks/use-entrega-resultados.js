import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import {
	esErrorColumnaInexistente,
} from '../utils/supabase-errors';
import { estudioLaboratorioListoEntrega, ventaListaEnRangoEntrega } from '../utils/entrega-resultados';

const SELECT_VENTAS = `
	id_venta, folio, fecha_venta, estado, total, pago_recibido,
	pacientes ( id_paciente, nombre, fecha_nacimiento, sexo, tipo, telefono, email ),
	clientes ( id_cliente, nombre ),
	estudios_venta ( id_estudio_venta, clave_estudio, descripcion_estudio, area, estado_validacion, entregado, muestra_pendiente, updated_at )
`;

const SELECT_RADIOLOGIA_ENTREGA = `
	id_estudio, id_venta, id_estudio_venta, tipo_estudio, descripcion, reporte,
	listo_entrega, entregado, fecha_entrega, updated_at
`;

const COLUMNAS_RADIOLOGIA_ENTREGA = [
	'id_venta',
	'id_estudio_venta',
	'listo_entrega',
	'entregado',
	'fecha_entrega',
];

const esErrorSchemaRadiologiaEntrega = (error) =>
	COLUMNAS_RADIOLOGIA_ENTREGA.some((columna) => esErrorColumnaInexistente(error, columna));

export const useEntregaResultados = ({ fechaInicial, fechaFinal } = {}) =>
	useQuery({
		queryKey: ['entrega-resultados', fechaInicial, fechaFinal],
		queryFn: async () => {
			// El predicado que se aplicaba en el cliente (estudioLaboratorioListoEntrega)
			// se empuja al servidor: sin esto la pantalla bajaba TODOS los estudios
			// validados de la historia de la clínica para tirar en el navegador los que
			// ya se entregaron hace años, y tardaba más cada mes que pasa.
			// Se usa `.not(col, 'is', true)` y NO `.eq(col, false)` a propósito:
			// `!estudio.entregado` y `estudio.muestra_pendiente !== true` en JS también
			// son verdaderos cuando la columna es NULL, y `.eq(col, false)` dejaría
			// fuera esos registros. Con `not.is.true` la semántica es idéntica.
			const { data: estudiosValidados, error: errorEstudios } = await supabase
				.from('estudios_venta')
				.select('id_estudio_venta, id_venta, estado_validacion, entregado, muestra_pendiente, updated_at')
				.eq('estado_validacion', 'validado')
				.not('entregado', 'is', true)
				.not('muestra_pendiente', 'is', true);

			if (errorEstudios) throw errorEstudios;

			let estudiosRadiologiaNoEntregados = [];
			const { data: radiologiaData, error: errorRadiologia } = await supabase
				.from('estudios_radiologia')
				.select(SELECT_RADIOLOGIA_ENTREGA)
				.eq('entregado', false);

			if (errorRadiologia) {
				if (!esErrorSchemaRadiologiaEntrega(errorRadiologia)) {
					throw errorRadiologia;
				}
				console.warn('Radiología no se pudo cargar porque faltan columnas de entrega:', errorRadiologia);
			} else {
				estudiosRadiologiaNoEntregados = radiologiaData ?? [];
			}

			const estudiosLaboratorioListos = (estudiosValidados ?? []).filter(
				(estudio) => estudioLaboratorioListoEntrega(estudio),
			);
			const estudiosRadiologiaPendientes = (estudiosRadiologiaNoEntregados).filter(
				(estudio) => estudio.listo_entrega && !estudio.entregado,
			);

			const idsVentasListas = [
				...new Set(
					[...estudiosLaboratorioListos, ...estudiosRadiologiaPendientes]
						.filter((estudio) => estudio.id_venta)
						.map((estudio) => estudio.id_venta),
				),
			];

			if (idsVentasListas.length === 0) return [];

			const { data, error } = await supabase
				.from('ventas')
				.select(SELECT_VENTAS)
				.in('id_venta', idsVentasListas)
				.eq('estado', 'activo')
				.order('fecha_venta', { ascending: false });

			if (error) throw error;

			const ventasConLaboratorioListo = new Set(
				estudiosLaboratorioListos.map((estudio) => estudio.id_venta),
			);
			const radiologiaListaPorVenta = estudiosRadiologiaPendientes.reduce((acc, estudio) => {
				if (!estudio.id_venta) return acc;
				acc[estudio.id_venta] = [...(acc[estudio.id_venta] ?? []), estudio];
				return acc;
			}, {});
			const radiologiaNoEntregadaPorVenta = estudiosRadiologiaNoEntregados.reduce((acc, estudio) => {
				if (!estudio.id_venta) return acc;
				acc[estudio.id_venta] = [...(acc[estudio.id_venta] ?? []), estudio];
				return acc;
			}, {});

			return (data ?? [])
				.map((venta) => ({
					...venta,
					estudios_radiologia: radiologiaListaPorVenta[venta.id_venta] ?? [],
					estudios_radiologia_todos: radiologiaNoEntregadaPorVenta[venta.id_venta] ?? [],
				}))
				.filter((venta) => ventaListaEnRangoEntrega(venta, fechaInicial, fechaFinal))
				.map((venta) => ({
					...venta,
					estudios_venta: (venta.estudios_venta ?? []).filter((estudio) =>
						ventasConLaboratorioListo.has(venta.id_venta)
							? estudioLaboratorioListoEntrega(estudio)
							: false,
					),
				}));
		},
		enabled: !!(fechaInicial && fechaFinal),
		staleTime: 1000 * 60 * 3,
	});
