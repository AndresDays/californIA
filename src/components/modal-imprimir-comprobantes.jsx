import { abrirPdfEnPestana } from "../utils/abrir-pdf-en-pestana";
import "./modal-imprimir-comprobantes.css";

// Al guardar, los comprobantes se abrían solos en pestañas nuevas y el navegador
// dejaba pasar nada más la primera: salía el ticket y las etiquetas se perdían
// sin decir nada. Aquí se abren desde el clic de quien cobra, que es lo que el
// navegador sí permite, y de paso se puede reimprimir sin volver a capturar.
const ModalImprimirComprobantes = ({ comprobantes = [], folio, onCerrar }) => {
	if (comprobantes.length === 0) return null;

	return (
		<div className="imp-overlay" role="dialog" aria-modal="true" aria-label="Imprimir comprobantes">
			<div className="imp-modal">
				<h2 className="imp-titulo">Venta registrada</h2>
				<p className="imp-folio">Folio: {folio}</p>
				<p className="imp-ayuda">Imprime lo que necesites; puedes repetir la impresión.</p>

				<div className="imp-botones">
					{comprobantes.map((comprobante) => (
						<button
							key={comprobante.id}
							type="button"
							className="imp-btn"
							onClick={() => abrirPdfEnPestana(comprobante)}
						>
							{comprobante.etiqueta}
						</button>
					))}
				</div>

				<button type="button" className="imp-btn cerrar" onClick={onCerrar}>
					Terminar
				</button>
			</div>
		</div>
	);
};

export default ModalImprimirComprobantes;
