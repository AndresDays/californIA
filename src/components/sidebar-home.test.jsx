import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import SidebarHome from './sidebar-home';

const mockNavigate = jest.fn();
let mockEmpleadoData = { rol: 'admin' };
let mockUser = null;

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    empleadoData: mockEmpleadoData,
    user: mockUser,
    // empleadoLoading is true when user is set but empleadoData hasn't loaded yet
    empleadoLoading: mockUser !== null && mockEmpleadoData === null,
  }),
}));

describe('sidebar-home responsive desktop layout', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/components/sidebar-home.css'),
    'utf8'
  );

  beforeEach(() => {
    mockNavigate.mockClear();
    mockEmpleadoData = { rol: 'admin' };
    mockUser = null;
  });

  test('keeps the large-screen sidebar inside shorter viewports', () => {
    expect(css).toMatch(/max-height:\s*calc\(100(?:dvh|vh)\s*-\s*2rem\)/);
    expect(css).toMatch(/overflow-y:\s*auto/);
  });

  test('opens reception submenu by click without navigating away', () => {
    render(<SidebarHome />);

    fireEvent.click(screen.getByRole('button', { name: /Recepción/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Cotización/i })).toBeInTheDocument();
  });

  test('closes the submenu when clicking outside it', () => {
    render(
      <>
        <button type="button">Fuera del sidebar</button>
        <SidebarHome />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Recepción/i }));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Fuera del sidebar/i }));

    expect(screen.queryByRole('button', { name: /Cotización/i })).not.toBeInTheDocument();
  });
  test('closes the submenu after selecting an option', () => {
    render(<SidebarHome />);

    fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pacientes/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/pacientes');
    expect(screen.queryByRole('button', { name: /Doctores/i })).not.toBeInTheDocument();
  });

  test('limits the menu for receptionist role', () => {
    mockEmpleadoData = { rol: 'recepcionista' };

    render(<SidebarHome />);

    expect(screen.getByRole('button', { name: /Inicio/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Captura/i })).not.toBeInTheDocument();
    // Recepcionista does not see Reportes at all
    expect(screen.queryByRole('button', { name: /Reportes/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));
    expect(screen.getByRole('button', { name: /Pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Doctores/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();

    // Recepcion submenu should be visible
    fireEvent.click(screen.getByRole('button', { name: /Recepci/i }));
    expect(screen.getByRole('button', { name: /Cotización/i })).toBeInTheDocument();
    // Cierre Caja is in Recepcion submenu for recepcionista
    expect(screen.getByRole('button', { name: /Cierre Caja/i })).toBeInTheDocument();
  });

  test('uses page employee role to hide users when context is not ready', () => {
    mockEmpleadoData = null;

    render(<SidebarHome empleadoData={{ rol: 'recepcionista' }} />);

    fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));

    expect(screen.getByRole('button', { name: /Pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Doctores/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
  });

  test('does not show the full menu when authenticated user role has not loaded yet', () => {
    mockUser = { id: 'user-1' };
    mockEmpleadoData = null;

    render(<SidebarHome />);

    expect(screen.queryByRole('button', { name: /Administraci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Configuraci/i })).not.toBeInTheDocument();
  });

  test('hides all menu items while employee role is loading', () => {
    mockUser = { id: 'cached-user' };
    mockEmpleadoData = { rol: 'recepcionista' };
    const { rerender } = render(<SidebarHome />);

    expect(screen.getByRole('button', { name: /Inicio/i })).toBeInTheDocument();

    // When empleadoData is null and user is set, empleadoLoading=true -> show nothing
    mockEmpleadoData = null;
    rerender(<SidebarHome />);

    expect(screen.queryByRole('button', { name: /Inicio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Captura/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Configuraci/i })).not.toBeInTheDocument();
  });

  test('hides reception reports and users for quimico role', () => {
    mockEmpleadoData = { rol: 'quimico' };

    render(<SidebarHome />);

    expect(screen.queryByRole('button', { name: /Recepci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportes/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));

    expect(screen.getByRole('button', { name: /Pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Doctores/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
  });

  test.each(['tecnico', 'medico'])(
    'uses quimico-like sidebar for %s role',
    (rol) => {
      mockEmpleadoData = { rol };

      render(<SidebarHome />);

      expect(screen.queryByRole('button', { name: /Recepci/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reportes/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));

      expect(screen.getByRole('button', { name: /Pacientes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Doctores/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
    },
  );

  test('hides restricted modules for tecnico radiologia', () => {
    mockEmpleadoData = { rol: 'tecnico_radiologia' };

    render(<SidebarHome />);

    expect(screen.queryByRole('button', { name: /Captura/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Administraci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Configuraci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recepci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportes/i })).not.toBeInTheDocument();
  });
});
