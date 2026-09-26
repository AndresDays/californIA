// Qué formato de ticket le toca a una orden ya guardada.
//
// Al cobrar se sabe por la serie que se le asignó a cada parte de la orden, pero
// al reimprimir desde editar solicitud sólo se tiene la orden: sin esto, una
// orden de imagen se reimprimía con el formato del laboratorio.
//
// Vive aparte del generador porque éste arrastra jsPDF y el código de barras:
// resolver el formato es una decisión de negocio y se prueba sola.
import { resolverEmpresaOperativaCatalogo } from "./cita-nuevo-paciente";

export const TIPO_TICKET_IMAGEN = "imagen";
export const TIPO_TICKET_LABORATORIO = "laboratorio";

// La serie del folio es la señal firme -se decidió al cobrar y quedó escrita-:
// A y B son imagen y C es el laboratorio. Los folios anteriores al cambio no
// traen letra, y ahí decide la empresa que cobra: CDI sólo hace imagen.
export const resolverTipoTicketVenta = ({ folio = "", empresa = "" } = {}) => {
	const serie = String(folio ?? "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.match(/^([A-Z])\d+$/)?.[1];

	if (serie === "C") return TIPO_TICKET_LABORATORIO;
	if (serie) return TIPO_TICKET_IMAGEN;

	return resolverEmpresaOperativaCatalogo(empresa) === "CDI"
		? TIPO_TICKET_IMAGEN
		: TIPO_TICKET_LABORATORIO;
};
