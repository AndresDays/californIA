// Cuántos pacientes le ha mandado cada médico a la clínica. Sale de las ventas
// ya capturadas, que son las que traen el remitente (`ventas.id_doctor`) y el
// paciente: no hay que capturar nada aparte.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";
import { crearRangoFechaMexico } from "../utils/fecha-mexico";

export const usePacientesReferidos = ({ desde, hasta } = {}) =>
	useQuery({
		queryKey: ["pacientes-referidos", desde, hasta],
		enabled: Boolean(desde && hasta),
		queryFn: async () => {
			// El rango se convierte con el offset de Ciudad de México, igual que el
			// resto de los reportes: una orden de las 23:00 pertenece al día en que
			// se cobró y no al siguiente.
			const { inicio, fin } = crearRangoFechaMexico(desde, hasta);
			const { data, error } = await supabase
				.from("ventas")
				.select("id_venta, folio, fecha_venta, estado, total, id_doctor, id_paciente")
				.gte("fecha_venta", inicio)
				.lt("fecha_venta", fin)
				.not("id_doctor", "is", null);
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 1000 * 60 * 5,
	});
