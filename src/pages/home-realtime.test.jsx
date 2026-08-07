import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

let mockRealtimeCallback;
let mockRespuestasBandejas = Array.from({ length: 6 }, () => Promise.resolve({ count: 0, error: null }));

jest.mock('../components/page-layout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));
jest.mock('../components/nueva-cita-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/editar-cita-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: { email: 'admin@california.test' },
    empleadoData: { nombre: 'Admin', rol: 'admin' },
  }),
}));
jest.mock('../hooks/use-dashboard', () => ({
  useStatsDashboard: () => ({ data: { totalPacientes: 0, citasHoy: 0, estudiosRealizados: 0, ingresos: 0 } }),
  useCitasProximasDashboard: () => ({ data: [] }),
  useEstadisticasSemanales: () => ({ data: [] }),
}));
jest.mock('../hooks/use-sucursales', () => ({ useSucursales: () => ({ data: [] }) }));

jest.mock('../lib/supabase-client', () => {
  let indiceConsulta = 0;
  const crearConsulta = () => {
    const consulta = {
      select: jest.fn(() => consulta),
      eq: jest.fn(() => consulta),
      in: jest.fn(() => consulta),
      then: (resolver, rechazar) => mockRespuestasBandejas[indiceConsulta++].then(resolver, rechazar),
    };
    return consulta;
  };
  const canal = {
    on: jest.fn((_evento, _filtro, callback) => {
      mockRealtimeCallback = callback;
      return canal;
    }),
    subscribe: jest.fn(() => canal),
  };
  return {
    supabase: {
      from: jest.fn(crearConsulta),
      channel: jest.fn(() => canal),
      removeChannel: jest.fn(),
    },
    __reiniciarConsultas: () => { indiceConsulta = 0; },
  };
});

import Dashboard from './home';
import { __reiniciarConsultas } from '../lib/supabase-client';

const renderDashboard = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  </QueryClientProvider>,
);

test('conserva los conteos del centro de trabajo durante una recarga Realtime', async () => {
  jest.useFakeTimers();
  mockRespuestasBandejas = Array.from({ length: 6 }, () => Promise.resolve({ count: 0, error: null }));
  __reiniciarConsultas();
  renderDashboard();

  await waitFor(() => expect(screen.getByText('0 tareas')).toBeInTheDocument());

  mockRespuestasBandejas = Array.from({ length: 6 }, () => new Promise(() => {}));
  __reiniciarConsultas();
  act(() => {
    mockRealtimeCallback();
    jest.advanceTimersByTime(400);
  });

  expect(screen.getByText('0 tareas')).toBeInTheDocument();
  expect(screen.queryByText('...')).not.toBeInTheDocument();
  jest.useRealTimers();
});
