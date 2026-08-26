import { resolverEmpresaOperativaCatalogo, resolverModalidadDesdeTipo } from "./cita-nuevo-paciente";
import { MODALIDAD_TODAS, MODALIDADES_FUERA_DE_CONVENIO } from "./folios";

// Los tipos de estudio se dan de alta por empresa, pero un paciente de convenio
// no captura por empresa sino por lo que tiene pactado: Anamaya lleva
// tomografía, ultrasonido, resonancia, contrastados, otros y rayos X por
// California, e IMSS sólo tomografía, ultrasonido y resonancia. Un particular
// sigue viendo los tipos de la empresa elegida.
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
	//
	// La regla de una modalidad concreta gana sobre la del convenio completo, que
	// es lo que hace que la resonancia de Medisim y SSA salga con CDC y no con
	// CDI, aunque el resto de su imagen sea de CDI.
	const reglaDeModalidad = (modalidad) => {
		const aplicables = reglas.filter((regla) => {
			const modalidadRegla = String(regla?.modalidad || "").toLowerCase();
			return modalidadRegla === MODALIDAD_TODAS || modalidadRegla === modalidad;
		});
		return (
			aplicables.find(
				(regla) => String(regla?.modalidad || "").toLowerCase() === modalidad,
			) ||
			aplicables[0] ||
			null
		);
	};

	const tipos = new Map();
	filas.forEach((fila) => {
		const tipo = fila?.tipos_estudio;
		if (!tipo?.id_tipo_estudio) return;

		const modalidad = resolverModalidadDesdeTipo(tipo.nombre);

		// Con convenio se ofrece nada más lo que tiene pactado con la empresa
		// elegida: un paciente de IMSS no captura laboratorio ni veterinaria por
		// más que CDC los tenga dados de alta.
		if (reglas.length > 0) {
			if (!modalidad || !operativaSeleccionada) return;
			const regla = reglaDeModalidad(modalidad);
			if (!regla || regla.empresa !== operativaSeleccionada) return;
			// "Toda su imagen" no incluye laboratorio ni veterinaria: esos se
			// capturan como particular, salvo que el convenio los tenga pactados
			// con su propia regla.
			if (
				regla.modalidad === MODALIDAD_TODAS &&
				MODALIDADES_FUERA_DE_CONVENIO.includes(modalidad)
			) {
				return;
			}
		} else if (String(fila.id_empresa) !== String(idEmpresaSeleccionada)) {
			return;
		}

		tipos.set(String(tipo.id_tipo_estudio), {
			id_tipo_estudio: tipo.id_tipo_estudio,
			nombre: tipo.nombre,
		});
	});

	return [...tipos.values()].sort((uno, otro) =>
		String(uno.nombre || "").localeCompare(String(otro.nombre || "")),
	);
};
