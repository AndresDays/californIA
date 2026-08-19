import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const ActualizacionAppContext = createContext(null);

const INTERVALO_REVISION = 1000 * 60 * 30;

// Un único registro del service worker para toda la app: el aviso flotante y la
// pantalla de versión comparten el mismo estado y el mismo botón de recarga.
export const ActualizacionAppProvider = ({ children }) => {
	const registroRef = useRef(null);
	const [buscando, setBuscando] = useState(false);
	const [ultimaRevision, setUltimaRevision] = useState(null);

	const {
		offlineReady: [offlineReady, setOfflineReady],
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(registration) {
			if (!registration) return;
			registroRef.current = registration;
			setInterval(() => {
				registration.update();
			}, INTERVALO_REVISION);
		},
	});

	const buscarActualizaciones = useCallback(async () => {
		setBuscando(true);
		try {
			await registroRef.current?.update();
		} catch (error) {
			console.error("No fue posible revisar actualizaciones:", error);
		} finally {
			setUltimaRevision(new Date().toISOString());
			setBuscando(false);
		}
	}, []);

	const valor = useMemo(
		() => ({
			offlineReady,
			setOfflineReady,
			needRefresh,
			setNeedRefresh,
			buscando,
			ultimaRevision,
			buscarActualizaciones,
			actualizar: () => updateServiceWorker(true),
		}),
		[
			offlineReady,
			setOfflineReady,
			needRefresh,
			setNeedRefresh,
			buscando,
			ultimaRevision,
			buscarActualizaciones,
			updateServiceWorker,
		],
	);

	return (
		<ActualizacionAppContext.Provider value={valor}>
			{children}
		</ActualizacionAppContext.Provider>
	);
};

// Fuera del provider (por ejemplo en pruebas de una pantalla suelta) se devuelve
// un estado inerte en vez de romper el render.
export const useActualizacionApp = () =>
	useContext(ActualizacionAppContext) ?? {
		offlineReady: false,
		setOfflineReady: () => {},
		needRefresh: false,
		setNeedRefresh: () => {},
		buscando: false,
		ultimaRevision: null,
		buscarActualizaciones: () => {},
		actualizar: () => {},
	};

export default ActualizacionAppContext;
