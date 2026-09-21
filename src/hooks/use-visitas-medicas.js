import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_visita, id_empleado, fecha, id_doctor, medico_nombre, especialidad,
	ubicacion, zona, actividades, comentarios_medico, observaciones,
	seguimiento, tipo_convenio, tipo_visita, objetivo, resultado,
	que_se_ofrecio, que_se_entrego, compromisos, proxima_accion,
	fecha_seguimiento, id_agenda
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

// El expediente del médico necesita todo su histórico, no sólo la semana que
// se está viendo en el informe.
export const useVisitasDeMedico = (idDoctor) =>
	useQuery({
		queryKey: ["visitas-medicas", "medico", idDoctor],
		enabled: Boolean(idDoctor),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("visitas_medicas")
				.select(CAMPOS)
				.eq("id_doctor", idDoctor)
				.order("fecha", { ascending: false });
			if (error) throw error;
			return data ?? [];
		},
	});

// La visita que nació de una cita de la agenda: sirve para reabrirla con todos
// sus campos cuando hay que corregir lo que se registró.
export const useVisitaDeAgenda = (idAgenda) =>
	useQuery({
		queryKey: ["visitas-medicas", "agenda", idAgenda],
		enabled: Boolean(idAgenda),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("visitas_medicas")
				.select(CAMPOS)
				.eq("id_agenda", idAgenda)
				.order("fecha", { ascending: false })
				.limit(1);
			if (error) throw error;
			return data?.[0] ?? null;
		},
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
