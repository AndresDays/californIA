// Sustituto de `virtual:pwa-register/react` (módulo que sólo existe en el build
// de Vite) para que las pruebas puedan montar la app.
export const useRegisterSW = () => ({
	offlineReady: [false, () => {}],
	needRefresh: [false, () => {}],
	updateServiceWorker: () => {},
});
