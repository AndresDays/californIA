// Los pendientes: seguimientos, llamadas, entregas, altas de eBudaicom y
// cumpleaños. Se leen por rango de fecha para la bandeja del día y sin rango
// para el expediente de un médico.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_tarea, id_empleado, id_doctor, medico_nombre, tipo, descripcion,
	fecha_objetivo, estado, completada_en, notas
`;

export const useTareasSeguimiento = ({ desde, hasta, estado } = {}) =>
	useQuery({
		queryKey: ["tareas-seguimiento", desde, hasta, estado],
		queryFn: async () => {
			let consulta = supabase.from("tareas_seguimiento").select(CAMPOS);
			if (desde) consulta = consulta.gte("fecha_objetivo", desde);
			if (hasta) consulta = consulta.lte("fecha_objetivo", hasta);
			if (estado) consulta = consulta.eq("estado", estado);
			const { data, error } = await consulta.order("fecha_objetivo", { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60,
	});

// Lo vencido no caduca: una llamada que no se hizo el martes sigue pendiente el
// jueves, y por eso la bandeja del día pide todo lo anterior a hoy también.
export const usePendientesAlDia = (hoy) =>
	useTareasSeguimiento({ hasta: hoy, estado: "pendiente" });

export const useTareasDeMedico = (idDoctor) =>
	useQuery({
		queryKey: ["tareas-seguimiento", "medico", idDoctor],
		enabled: Boolean(idDoctor),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("tareas_seguimiento")
				.select(CAMPOS)
				.eq("id_doctor", idDoctor)
				.order("fecha_objetivo", { ascending: false });
			if (error) throw error;
			return data ?? [];
		},
	});

export const useGuardarTarea = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (tarea) => {
			const { id_tarea: id, ...campos } = tarea;
			const consulta = id
				? supabase.from("tareas_seguimiento").update(campos).eq("id_tarea", id)
				: supabase.from("tareas_seguimiento").insert(campos);
			const { error } = await consulta;
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tareas-seguimiento"] }),
	});
};

export const useCompletarTarea = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idTarea, estado = "hecha", notas }) => {
			const { error } = await supabase
				.from("tareas_seguimiento")
				.update({
					estado,
					completada_en: estado === "pendiente" ? null : new Date().toISOString(),
					...(notas === undefined ? {} : { notas }),
				})
				.eq("id_tarea", idTarea);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tareas-seguimiento"] }),
	});
};
