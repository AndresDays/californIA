import { useRegisterSW } from 'virtual:pwa-register/react';
import './pwa-update-prompt.css';

const PwaUpdatePrompt = () => {
	const {
		offlineReady: [offlineReady, setOfflineReady],
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(registration) {
			if (!registration) return;
			setInterval(() => {
				registration.update();
			}, 1000 * 60 * 30);
		},
	});

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
						onClick={() => updateServiceWorker(true)}>
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
