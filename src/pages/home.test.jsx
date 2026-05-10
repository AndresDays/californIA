import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Dashboard from './home';

// Mock useAuth
jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'fake-user-id',
      email: 'test@user.com'
    },
    signOut: jest.fn()
  }),
}));

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock supabase client
jest.mock('../lib/supabase-client', () => ({
  supabase: {
    from: () => {
      // Builder para encadenar métodos de consulta supabase sin fallar
      const builder = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lt: () => builder,
        not: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve({ data: null }),
        maybeSingle: () => Promise.resolve({ data: null }),
        update: () => builder,
        count: 0
      };
      return builder;
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'public-foto.jpg' } })
      })
    },
    auth: {
      updateUser: () => Promise.resolve({ error: null })
    }
  }
}));

// Mocks componentes hijos
jest.mock('../components/header-principal', () => () => <div>MockHeader</div>);
jest.mock('../components/sidebar-home', () => () => <div>MockSidebar</div>);
jest.mock('../components/editar-cita-modal', () => () => <div>MockEditarCitaModal</div>);
jest.mock('../components/nueva-cita-modal', () => () => <div>MockNuevaCitaModal</div>);

test('renders Dashboard with welcome and stats', () => {
  render(<Dashboard />);
  expect(screen.getByText(/Bienvenido/)).toBeInTheDocument();
  expect(screen.getAllByText(/MockHeader/)[0]).toBeInTheDocument();
  expect(screen.getAllByText(/MockSidebar/)[0]).toBeInTheDocument();
  expect(screen.getByText(/Módulos Principales/)).toBeInTheDocument();
  expect(screen.getByText(/Próximas Citas/)).toBeInTheDocument();
  expect(screen.queryByText(/GUARDAR/)).toBeNull(); // No debe aparecer en dashboard, sanity check
});

test('uses the dashboard module space for radiology and quick actions', () => {
  render(<Dashboard />);

  expect(screen.getByRole('button', { name: /Abrir Radiología/i })).toBeInTheDocument();
  expect(screen.queryByAltText(/Laboratorio/i)).not.toBeInTheDocument();
  const quickActions = screen.getByRole('group', { name: /Acciones rápidas/i });
  expect(within(quickActions).getByRole('button', { name: /Nueva cita/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Nuevo paciente/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Editar solicitud/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Entrega/i })).toBeInTheDocument();
});
