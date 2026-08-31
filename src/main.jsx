import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tema.css';
import './App.css';
import App from './App.jsx';
import './styles/refinado.css';
import { initializeObservability } from './lib/observability';
import { limpiarBorradorSiEsRecargaManual } from './utils/borrador-sesion';

// Antes de montar nada: un refresh empieza la captura en blanco, mientras que
// volver a una pestaña que el navegador descartó la recupera.
limpiarBorradorSiEsRecargaManual();

initializeObservability({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
