import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './home';

let mockEmpleadoData = null;
let mockInvalidateQueries = jest.fn();

// Mock useAuth
jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'fake-user-id',
      email: 'test@user.com'
    },
    empleadoData: mockEmpleadoData,
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
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe: jest.fn() }),
        }),
      }),
    }),
    removeChannel: jest.fn(),
    auth: {
      updateUser: () => Promise.resolve({ error: null })
    }
  }
}));

// Mocks componentes hijos
jest.mock('../components/header-principal', () => () => <div>MockHeader</div>);
jest.mock('../components/sidebar-home', () => () => <div>MockSidebar</div>);
jest.mock('../components/editar-cita-modal', () => () => <div>MockEditarCitaModal</div>);
jest.mock('../components/nueva-cita-modal', () => ({ isOpen, onCitaCreada }) =>
  isOpen ? <button type="button" onClick={onCitaCreada}>MockNuevaCitaModal</button> : null
);

beforeEach(() => {
  mockEmpleadoData = null;
  mockInvalidateQueries.mockClear();
});

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  mockInvalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
};

test('renders Dashboard with welcome and stats', () => {
  renderDashboard();
  expect(screen.getByText(/Bienvenido/)).toBeInTheDocument();
  expect(screen.getAllByText(/MockHeader/)[0]).toBeInTheDocument();
  expect(screen.getAllByText(/MockSidebar/)[0]).toBeInTheDocument();
  expect(screen.getByText(/Módulos Principales/)).toBeInTheDocument();
  expect(screen.getByText(/Próximas Citas/)).toBeInTheDocument();
  expect(screen.queryByText(/GUARDAR/)).toBeNull(); // No debe aparecer en dashboard, sanity check
});

test('uses the dashboard module space for radiology and quick actions', () => {
  renderDashboard();

  expect(screen.getByRole('button', { name: /Abrir Radiología/i })).toBeInTheDocument();
  expect(screen.queryByAltText(/Laboratorio/i)).not.toBeInTheDocument();
  const quickActions = screen.getByRole('group', { name: /Acciones rápidas/i });
  expect(within(quickActions).getByRole('button', { name: /Nueva cita/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Nuevo paciente/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Editar solicitud/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Entrega/i })).toBeInTheDocument();
});

test('invalidates calendar appointment queries after creating a new appointment', () => {
  renderDashboard();

  const quickActions = screen.getByRole('group', { name: /Acciones rápidas/i });
  fireEvent.click(within(quickActions).getByRole('button', { name: /Nueva cita/i }));
  fireEvent.click(screen.getByRole('button', { name: /MockNuevaCitaModal/i }));

  expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['citas'] });
});

test('hides income access for receptionist role', () => {
  mockEmpleadoData = { nombre: 'Recepcion Uno', rol: 'recepcionista' };

  renderDashboard();

  expect(screen.queryByText(/Ingresos del Mes/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Abrir Radiolog/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/MÃ³dulos Principales/i)).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Acciones rápidas/i })).toBeInTheDocument();
  const quickActions = screen.getByRole('group', { name: /Acciones rápidas/i });
  expect(within(quickActions).getByRole('button', { name: /Nueva cita/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Nuevo paciente/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Editar solicitud/i })).toBeInTheDocument();
  expect(within(quickActions).getByRole('button', { name: /Entrega/i })).toBeInTheDocument();
  expect(screen.getByText(/Pacientes de Hoy/i)).toBeInTheDocument();
});

test('uses restricted dashboard layout for quimico role', () => {
  mockEmpleadoData = { nombre: 'Quimico Uno', rol: 'quimico' };

  renderDashboard();

  expect(screen.queryByText(/Ingresos del Mes/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Abrir Radiolog/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/MÃ³dulos Principales/i)).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Acciones rápidas/i })).toBeInTheDocument();
  expect(screen.getByText(/Pacientes de Hoy/i)).toBeInTheDocument();
});

test.each(['tecnico_radiologia', 'tecnico', 'medico'])(
  'uses restricted dashboard with radiology module and no quick actions for %s',
  (rol) => {
    mockEmpleadoData = { nombre: 'Rayos Uno', rol };

    renderDashboard();

    expect(screen.queryByText(/Ingresos del Mes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Módulos Principales/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir Radiolog/i })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Acciones rápidas/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Pacientes de Hoy/i)).toBeInTheDocument();
  },
);
