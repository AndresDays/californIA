import PageLayout from "../../components/page-layout.jsx";
import { useActualizacionApp } from "../../context/actualizacion-app-context";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import {
	COMMIT_APP,
	VERSION_APP,
	etiquetaVersionApp,
	formatearFechaCompilacion,
} from "../../utils/version-app";
import "./version-app.css";

const VersionApp = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const { needRefresh, buscando, ultimaRevision, buscarActualizaciones, actualizar } =
		useActualizacionApp();

	const datos = [
		{ etiqueta: "Versión instalada", valor: etiquetaVersionApp() },
		{ etiqueta: "Número de versión", valor: VERSION_APP },
		{ etiqueta: "Compilación (commit)", valor: COMMIT_APP || "No disponible" },
		{ etiqueta: "Fecha de compilación", valor: formatearFechaCompilacion() },
		{
			etiqueta: "Última revisión de actualizaciones",
			valor: ultimaRevision ? formatearFechaCompilacion(ultimaRevision) : "Aún no se ha revisado",
		},
	];

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="version-app-wrapper">
				<div className="version-app-header">
					<h1 className="version-app-title">Versión de la app</h1>
					<p className="version-app-subtitulo">
						Confirma qué compilación tiene cargada este equipo y si ya existe una más
						reciente publicada.
					</p>
				</div>

				<div className="version-app-content">
					<div
						className={`version-app-estado ${needRefresh ? "pendiente" : "al-dia"}`}
						role="status">
						<strong>
							{needRefresh
								? "Hay una versión más reciente disponible"
								: "Estás en la última versión disponible"}
						</strong>
						<p>
							{needRefresh
								? "Recarga para instalar la actualización. No se pierde información capturada."
								: "La app revisa actualizaciones automáticamente cada 30 minutos."}
						</p>
					</div>

					<dl className="version-app-datos">
						{datos.map((dato) => (
							<div className="version-app-dato" key={dato.etiqueta}>
								<dt>{dato.etiqueta}</dt>
								<dd>{dato.valor}</dd>
							</div>
						))}
					</dl>

					<div className="version-app-acciones">
						<button
							type="button"
							className="version-app-btn"
							onClick={buscarActualizaciones}
							disabled={buscando}>
							{buscando ? "Buscando..." : "Buscar actualizaciones"}
						</button>
						{needRefresh && (
							<button type="button" className="version-app-btn primario" onClick={actualizar}>
								Actualizar ahora
							</button>
						)}
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default VersionApp;
