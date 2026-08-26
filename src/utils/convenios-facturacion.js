import { esErrorTablaInexistente } from "./supabase-errors";

// La matriz de qué empresa factura cada modalidad de un convenio vive en la
// base; sin reglas (particular, o base sin migrar) se factura con la empresa
// del catálogo del estudio.
export const cargarReglasConvenio = async (supabase, idCliente) => {
	if (!supabase || !idCliente) return [];

	const { data, error } = await supabase
		.from("convenios_facturacion")
		.select("modalidad, criterio, empresa")
		.eq("id_cliente", idCliente);

	if (error) {
		if (!esErrorTablaInexistente(error, "convenios_facturacion")) {
			console.warn("No se pudieron cargar las reglas del convenio:", error);
		}
		return [];
	}

	return (data || []).map((regla) => ({
		modalidad: String(regla.modalidad || "*").toLowerCase(),
		criterio: String(regla.criterio || "").toLowerCase(),
		empresa: String(regla.empresa || "").toUpperCase(),
	}));
};
