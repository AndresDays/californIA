import { useActualizacionApp } from '../context/actualizacion-app-context';
import './pwa-update-prompt.css';

const PwaUpdatePrompt = () => {
	const {
		offlineReady,
		setOfflineReady,
		needRefresh,
		setNeedRefresh,
		actualizar,
	} = useActualizacionApp();

	if (!offlineReady && !needRefresh) return null;

	const cerrar = () => {
		setOfflineReady(false);
		setNeedRefresh(false);
	};

	return (
		<div className="pwa-update-prompt" role="status" aria-live="polite">
			<div>
				<strong>
					{needRefresh ? 'Nueva version disponible' : 'CalifornIA lista'}
				</strong>
				<p>
					{needRefresh
						? 'Recarga para usar la version mas reciente.'
						: 'La app quedo instalada para abrir mas rapido.'}
				</p>
			</div>

			<div className="pwa-update-actions">
				{needRefresh && (
					<button
						type="button"
						className="pwa-update-btn primary"
						onClick={actualizar}>
						Recargar
					</button>
				)}
				<button type="button" className="pwa-update-btn" onClick={cerrar}>
					Cerrar
				</button>
			</div>
		</div>
	);
};

export default PwaUpdatePrompt;
