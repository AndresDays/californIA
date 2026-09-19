// Las órdenes que se le dejan a cada médico. Lo que importa no es sólo cuántas
// se entregaron, sino a quién le toca renovar: ése es el renglón que se le
// olvidaba en la libreta.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";

const CAMPOS = `
	id_entrega, id_empleado, id_doctor, fecha_entrega, cantidad, tipo_orden,
	folios, fecha_renovacion, seguimiento, observaciones
`;

export const useOrdenesEntregadas = ({ desde, hasta, idDoctor } = {}) =>
	useQuery({
		queryKey: ["ordenes-entregadas", desde, hasta, idDoctor],
		queryFn: async () => {
			let consulta = supabase.from("ordenes_medicas_entregadas").select(CAMPOS);
			if (desde) consulta = consulta.gte("fecha_entrega", desde);
			if (hasta) consulta = consulta.lte("fecha_entrega", hasta);
			if (idDoctor) consulta = consulta.eq("id_doctor", idDoctor);
			const { data, error } = await consulta.order("fecha_entrega", { ascending: false });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 5,
	});

export const useGuardarEntregaOrdenes = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (entrega) => {
			const { id_entrega: id, ...campos } = entrega;
			const consulta = id
				? supabase.from("ordenes_medicas_entregadas").update(campos).eq("id_entrega", id)
				: supabase.from("ordenes_medicas_entregadas").insert(campos);
			const { error } = await consulta;
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ordenes-entregadas"] }),
	});
};

export const useServiciosPorEspecialidad = (especialidad) =>
	useQuery({
		queryKey: ["servicios-especialidad", especialidad],
		queryFn: async () => {
			let consulta = supabase
				.from("servicios_por_especialidad")
				.select("id_servicio, especialidad, nombre_servicio, categoria, descripcion, orden")
				.eq("activo", true);
			if (especialidad) consulta = consulta.eq("especialidad", especialidad);
			const { data, error } = await consulta
				.order("especialidad", { ascending: true })
				.order("orden", { ascending: true });
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 30,
	});
