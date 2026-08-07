import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { crearRangoFechaMexico } from '../utils/fecha-mexico';

const hoyLocal = () => {
	const ahora = new Date();
	return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
};

export const useTurnos = () => {
	const fecha = hoyLocal();
	const rango = crearRangoFechaMexico(fecha);

	return useQuery({
		queryKey: ['turnos', fecha],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('turnos_pacientes')
				.select('*')
				.gte('fecha_programada', rango.inicio)
				.lt('fecha_programada', rango.fin)
				.order('fecha_programada', { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 1,
	});
};

export const useCitasHoy = () => {
	const fecha = hoyLocal();

	return useQuery({
		queryKey: ['citas-hoy', fecha],
	queryFn: async () => {
			const rango = crearRangoFechaMexico(fecha);
			const { data, error } = await supabase
				.from('citas')
				.select(
					'id_cita, fecha_estudio, tipo_estudio, nombre_paciente, pacientes(id_paciente, nombre)',
				)
				.gte('fecha_estudio', rango.inicio)
				.lt('fecha_estudio', rango.fin)
				.not('estado', 'eq', 'cancelada')
				.order('fecha_estudio', { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 2,
	});
};
