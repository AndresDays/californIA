// La agenda son las visitas con fecha y hora: las que se ven en el día, se
// mueven a otro día y se marcan como realizadas. La programación semanal por
// zonas sigue viviendo en `programacion_visitas`, que es el formato del Excel
// que ella entrega.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_agenda, id_empleado, id_doctor, medico_nombre, especialidad, zona,
	fecha, hora, objetivo, tipo_visita, estatus, resultado, proximo_seguimiento,
	id_visita
`;

export const useAgendaVisitas = ({ desde, hasta } = {}) =>
	useQuery({
		queryKey: ["agenda-visitas", desde, hasta],
		enabled: Boolean(desde && hasta),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("agenda_visitas")
				.select(CAMPOS)
				.gte("fecha", desde)
				.lte("fecha", hasta)
				.order("fecha", { ascending: true })
				.order("hora", { ascending: true, nullsFirst: false });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60,
	});

export const useAgendaDeMedico = (idDoctor) =>
	useQuery({
		queryKey: ["agenda-visitas", "medico", idDoctor],
		enabled: Boolean(idDoctor),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("agenda_visitas")
				.select(CAMPOS)
				.eq("id_doctor", idDoctor)
				.order("fecha", { ascending: false });
			if (error) throw error;
			return data ?? [];
		},
	});

export const useGuardarAgenda = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (cita) => {
			const { id_agenda: id, ...campos } = cita;
			const consulta = id
				? supabase.from("agenda_visitas").update(campos).eq("id_agenda", id)
				: supabase.from("agenda_visitas").insert(campos);
			const { error } = await consulta;
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agenda-visitas"] }),
	});
};

// Reprogramar deja rastro: la cita original queda como 'reprogramada' y se crea
// otra en la fecha nueva. Así el reporte no pierde que ese día se movió.
export const useReprogramarVisita = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ cita, fecha, hora }) => {
			const { error: cierre } = await supabase
				.from("agenda_visitas")
				.update({ estatus: "reprogramada", updated_at: new Date().toISOString() })
				.eq("id_agenda", cita.id_agenda);
			if (cierre) throw cierre;
			// La copia se queda con los datos de la visita (médico, zona, objetivo)
			// y suelta lo que pertenece al renglón viejo: su id, sus fechas de
			// control y el enlace a la visita ya registrada.
			const campos = { ...cita };
			for (const columna of ["id_agenda", "created_at", "updated_at", "id_visita"]) {
				delete campos[columna];
			}
			const { error } = await supabase.from("agenda_visitas").insert({
				...campos,
				fecha,
				hora: hora ?? cita.hora ?? null,
				estatus: "programada",
				resultado: null,
			});
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agenda-visitas"] }),
	});
};

export const useCancelarVisitaAgenda = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (idAgenda) => {
			const { error } = await supabase
				.from("agenda_visitas")
				.update({ estatus: "cancelada", updated_at: new Date().toISOString() })
				.eq("id_agenda", idAgenda);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agenda-visitas"] }),
	});
};
