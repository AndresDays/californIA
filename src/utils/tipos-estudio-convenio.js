import { resolverEmpresaOperativaCatalogo, resolverModalidadDesdeTipo } from "./cita-nuevo-paciente";
import { MODALIDAD_TODAS } from "./folios";

// Los tipos de estudio se dan de alta por empresa, pero un convenio puede
// facturar por CDC estudios que el catálogo tiene en CDI: Anamaya lleva
// tomografía, ultrasonido, contrastados, otros y rayos X por California. Sin
// esto, al elegir CDC sólo se ofrecían laboratorio, resonancia y veterinaria.
export const resolverTiposEstudioConvenio = ({
	filas = [],
	empresas = [],
	idEmpresaSeleccionada = null,
	reglasConvenio = [],
} = {}) => {
	const operativaPorId = new Map(
		empresas.map((empresa) => [
			String(empresa.id_empresa),
			resolverEmpresaOperativaCatalogo(empresa.nombre),
		]),
	);
	const operativaSeleccionada = operativaPorId.get(String(idEmpresaSeleccionada)) || "";
	const reglas = Array.isArray(reglasConvenio) ? reglasConvenio : [];

	// El criterio no se toma en cuenta aquí: si el convenio cubre aunque sea
	// parte de la modalidad —como el ultrasonido doppler de IMSS— el tipo se
	// ofrece y la búsqueda de estudios ya acota lo que sí cubre.
	const convenioFacturaModalidad = (modalidad) =>
		reglas.some((regla) => {
			const modalidadRegla = String(regla?.modalidad || "").toLowerCase();
			const coincide =
				modalidadRegla === MODALIDAD_TODAS || modalidadRegla === modalidad;
			return coincide && regla?.empresa === operativaSeleccionada;
		});

	const tipos = new Map();
	filas.forEach((fila) => {
		const tipo = fila?.tipos_estudio;
		if (!tipo?.id_tipo_estudio) return;

		const esDeLaEmpresa =
			String(fila.id_empresa) === String(idEmpresaSeleccionada);
		const modalidad = resolverModalidadDesdeTipo(tipo.nombre);
		const loFacturaElConvenio =
			operativaSeleccionada &&
			modalidad &&
			modalidad !== "laboratorio" &&
			convenioFacturaModalidad(modalidad);

		if (!esDeLaEmpresa && !loFacturaElConvenio) return;
		tipos.set(String(tipo.id_tipo_estudio), {
			id_tipo_estudio: tipo.id_tipo_estudio,
			nombre: tipo.nombre,
		});
	});

	return [...tipos.values()].sort((uno, otro) =>
		String(uno.nombre || "").localeCompare(String(otro.nombre || "")),
	);
};
