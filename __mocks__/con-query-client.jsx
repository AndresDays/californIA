import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Las pantallas que guardan ventas piden `useQueryClient` para refrescar el
// reporte y los tableros sin recargar la pagina. En la aplicacion el proveedor
// esta siempre puesto en main.jsx; en las pruebas hay que ponerlo a mano o el
// hook lanza.
//
// Cada llamada crea un cliente nuevo, sin reintentos: una prueba no debe heredar
// el cache de la anterior ni esperar a que un fallo se reintente.
export const conQueryClient = (elemento) => {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={cliente}>{elemento}</QueryClientProvider>;
};
