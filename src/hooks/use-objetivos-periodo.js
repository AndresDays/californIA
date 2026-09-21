// Objetivos que valen para todas las visitas de un día o de una semana, en vez
// de teclear lo mismo cita por cita.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = "id_objetivo, id_empleado, desde, hasta, texto, created_at";

// Se piden los que se cruzan con el rango que se está viendo: un objetivo de la
// semana entra aunque la vista sea de un solo día.
export const useObjetivosPeriodo = ({ desde, hasta } = {}) =>
	useQuery({
		queryKey: ["objetivos-periodo", desde, hasta],
		enabled: Boolean(desde && hasta),
		queryFn: async () => {
			const { data, error } = await supabase
				.from("objetivos_periodo")
				.select(CAMPOS)
				.lte("desde", hasta)
				.gte("hasta", desde)
				.order("desde", { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 5,
	});

export const useGuardarObjetivoPeriodo = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (objetivo) => {
			const { error } = await supabase.from("objetivos_periodo").insert(objetivo);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["objetivos-periodo"] }),
	});
};

export const useEliminarObjetivoPeriodo = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (idObjetivo) => {
			const { error } = await supabase
				.from("objetivos_periodo")
				.delete()
				.eq("id_objetivo", idObjetivo);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["objetivos-periodo"] }),
	});
};

// Los que aplican a una fecha concreta, que es lo que se copia al programar.
export const objetivosDeFecha = (objetivos = [], fecha) => {
	const dia = String(fecha || "").slice(0, 10);
	if (!dia) return [];
	return objetivos.filter((objetivo) => objetivo.desde <= dia && objetivo.hasta >= dia);
};

export const textoDeObjetivos = (objetivos = []) =>
	objetivos.map((objetivo) => String(objetivo.texto || "").trim()).filter(Boolean).join("\n");
