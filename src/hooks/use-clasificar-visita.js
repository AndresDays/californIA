// Le pide a la Edge Function que reparta el dictado en las columnas del
// informe. Si no contesta —sin internet, sin llave configurada, un error de la
// API— se devuelve el reparto por palabras que vive en la aplicación: registrar
// la visita nunca depende de que haya señal.
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";
import { desglosarCaptura } from "../utils/desglose-captura";

const COLUMNAS = ["actividades", "comentarios_medico", "observaciones", "seguimiento", "tipo_convenio"];

const normalizar = (desglose) =>
	Object.fromEntries(COLUMNAS.map((columna) => [columna, String(desglose?.[columna] ?? "").trim()]));

export const clasificarConIa = async (texto) => {
	const { data, error } = await supabase.functions.invoke("clasificar-visita", {
		body: { texto },
	});
	if (error) throw error;
	if (!data?.desglose) throw new Error(data?.error || "No se pudo repartir el dictado");
	return normalizar(data.desglose);
};

export const useClasificarVisita = () =>
	useMutation({
		mutationFn: async (texto) => {
			const limpio = String(texto || "").trim();
			if (!limpio) return { desglose: normalizar({}), fuente: "local" };
			try {
				return { desglose: await clasificarConIa(limpio), fuente: "ia" };
			} catch (fallo) {
				// El motivo se conserva para poder decir en pantalla por qué se usó
				// el reparto local, en vez de dejar creer que lo acomodó la IA.
				return {
					desglose: normalizar(desglosarCaptura(limpio)),
					fuente: "local",
					motivo: fallo?.message || "Sin conexión con el servicio",
				};
			}
		},
	});
