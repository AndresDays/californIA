import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_visita, id_empleado, fecha, id_doctor, medico_nombre, especialidad,
	ubicacion, zona, actividades, comentarios_medico, observaciones,
	seguimiento, tipo_convenio
`;

export const useVisitasMedicas = ({ desde, hasta } = {}) =>
	useQuery({
		queryKey: ["visitas-medicas", desde, hasta],
		enabled: Boolean(desde && hasta),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("visitas_medicas")
				.select(CAMPOS)
				.gte("fecha", desde)
				.lte("fecha", hasta)
				.order("fecha", { ascending: true })
				.order("medico_nombre", { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 5,
	});

export const useGuardarVisita = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (visita) => {
			const { id_visita: id, ...campos } = visita;
			const consulta = id
				? supabase.from("visitas_medicas").update(campos).eq("id_visita", id)
				: supabase.from("visitas_medicas").insert(campos);
			const { error } = await consulta;
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitas-medicas"] }),
	});
};

export const useEliminarVisita = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (idVisita) => {
			const { error } = await supabase
				.from("visitas_medicas")
				.delete()
				.eq("id_visita", idVisita);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitas-medicas"] }),
	});
};

// La importación entra en un solo insert para que una semana completa quede
// dentro o quede fuera, y no a medias si algo falla a la mitad.
export const useImportarVisitas = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (visitas) => {
			if (!visitas?.length) return 0;
			const { error } = await supabase.from("visitas_medicas").insert(visitas);
			if (error) throw error;
			return visitas.length;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitas-medicas"] }),
	});
};
