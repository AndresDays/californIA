import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_programacion, id_empleado, semana_inicio, dia_semana, zona,
	medicos_programados, objetivos
`;

export const useProgramacionSemanal = ({ semanaInicio } = {}) =>
	useQuery({
		queryKey: ["programacion-visitas", semanaInicio],
		enabled: Boolean(semanaInicio),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("programacion_visitas")
				.select(CAMPOS)
				.eq("semana_inicio", semanaInicio)
				.order("dia_semana", { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 5,
	});

// Se guarda por (empleado, semana, día): editar el lunes dos veces actualiza el
// mismo renglón en lugar de dejar dos lunes en la misma semana.
export const useGuardarDiaProgramacion = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (dia) => {
			const { error } = await supabase
				.from("programacion_visitas")
				.upsert(dia, { onConflict: "id_empleado,semana_inicio,dia_semana" });
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programacion-visitas"] }),
	});
};

export const useImportarProgramacion = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (dias) => {
			if (!dias?.length) return 0;
			const { error } = await supabase
				.from("programacion_visitas")
				.upsert(dias, { onConflict: "id_empleado,semana_inicio,dia_semana" });
			if (error) throw error;
			return dias.length;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programacion-visitas"] }),
	});
};
