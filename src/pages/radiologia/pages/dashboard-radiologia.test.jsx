import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardRadiologia from './dashboard-radiologia';

const mockNavigate = jest.fn();
const mockUpdate = jest.fn(() => ({
  eq: jest.fn().mockResolvedValue({ error: null }),
}));
const mockUpload = jest.fn().mockResolvedValue({ error: null });
const mockHeader = jest.fn(() => <div>Header</div>);
const mockSidebar = jest.fn(({ isOpen }) => <div>{isOpen ? 'Sidebar mobile abierto' : 'Sidebar mobile cerrado'}</div>);
const mockSidebarHome = jest.fn(() => <div>Sidebar escritorio</div>);
const mockSetSidebarOpen = jest.fn();
let mockSidebarState = {
  sidebarOpen: false,
  setSidebarOpen: mockSetSidebarOpen,
  isMobile: false,
};

jest.mock('../../../context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'radiologia@test.com' },
    signOut: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../components/header-principal', () => (props) => mockHeader(props));
jest.mock('../../../components/sidebar', () => (props) => mockSidebar(props));
jest.mock('../../../components/sidebar-home', () => (props) => mockSidebarHome(props));
jest.mock('../../../utils/use-sidebar', () => () => mockSidebarState);
jest.mock('../componentes/TarjetaEstudio', () => ({ nombrePaciente, estado, onClick, onVerDetalles, onSubirImagen }) => (
  <div>
    <button type="button" onClick={onClick}>
      {nombrePaciente} {estado}
    </button>
    <button type="button" onClick={onSubirImagen}>
      Subir imagen {nombrePaciente}
    </button>
    <button type="button" onClick={onVerDetalles} aria-label={`Detalles ${nombrePaciente}`}>
      ⋮
    </button>
  </div>
));

jest.mock('../../../lib/supabase-client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
      })),
    },
    from: jest.fn((table) => {
      if (table === 'empleados') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        update: mockUpdate,
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id_estudio: 1,
              tipo_estudio: 'DX',
              estado: 'POR ASIGNAR',
              storage_path: null,
              sucursal: 'Centro',
              fecha_estudio: new Date().toISOString(),
              pacientes: { id_paciente: 11, nombre: 'Maria Gomez' },
            },
            {
              id_estudio: 2,
              tipo_estudio: 'US',
              estado: 'ASIGNADO',
              storage_path: '2/previo.dcm',
              sucursal: 'Norte',
              fecha_estudio: new Date().toISOString(),
              pacientes: { id_paciente: 12, nombre: 'Juan Perez' },
            },
            {
              id_estudio: 3,
              tipo_estudio: 'DX',
              estado: 'EN PROCESO',
              storage_path: '3/imagen.dcm',
              sucursal: 'Centro',
              fecha_estudio: new Date().toISOString(),
              pacientes: { id_paciente: 13, nombre: 'Ana Lopez' },
            },
          ],
          error: null,
        }),
      };
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSidebarState = {
    sidebarOpen: false,
    setSidebarOpen: mockSetSidebarOpen,
    isMobile: false,
  };
});

test('does not show the create group action', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(screen.queryByRole('button', { name: /Crear Grupo/i })).not.toBeInTheDocument();
});

test('passes profile menu controls to the main header', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(mockHeader).toHaveBeenCalled());
  const headerProps = mockHeader.mock.calls.at(-1)[0];

  expect(headerProps.menuOpen).toBe(false);
  expect(typeof headerProps.setMenuOpen).toBe('function');
  expect(headerProps.menuRef).toBeTruthy();
});

test('connects the header hamburger to the responsive sidebar', async () => {
  mockSidebarState = {
    sidebarOpen: true,
    setSidebarOpen: mockSetSidebarOpen,
    isMobile: true,
  };

  render(<DashboardRadiologia />);

  await waitFor(() => expect(mockHeader).toHaveBeenCalled());
  const headerProps = mockHeader.mock.calls.at(-1)[0];

  expect(headerProps.sidebarOpen).toBe(true);
  expect(headerProps.setSidebarOpen).toBe(mockSetSidebarOpen);
  expect(mockSidebar.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      isOpen: true,
      setIsOpen: mockSetSidebarOpen,
    })
  );
  expect(mockSidebarHome).not.toHaveBeenCalled();
});

test('shows operational filters and keeps card details behind the three-dot action', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(screen.getByRole('button', { name: /Todos 3/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Por tomar\/subir 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Asignados 1/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /En proceso 1/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Buscar paciente, estudio o sucursal/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Por tomar\/subir 1/i }));
  expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument();
  expect(screen.queryByText(/Juan Perez/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i }));

  expect(mockNavigate).toHaveBeenCalledWith('/visor-dicom/1', {
    state: {
      estudio: expect.objectContaining({
        id: 1,
        nombrePaciente: 'Maria Gomez',
      }),
    },
  });
  expect(screen.queryByRole('heading', { name: /Detalle del estudio/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Detalles Maria Gomez/i }));

  expect(screen.getByRole('heading', { name: /Detalle del estudio/i })).toBeInTheDocument();
});

test('uploads an image file to the pending radiology study', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /Subir imagen Maria Gomez/i }));

  const input = document.querySelector('.radiologia-input-archivo');
  const archivo = new File(['dicom'], 'torax.dcm', { type: 'application/dicom' });
  fireEvent.change(input, { target: { files: [archivo] } });

  await waitFor(() => expect(mockUpload).toHaveBeenCalled());
  expect(mockUpload.mock.calls[0][0]).toMatch(/^1\/\d+-torax\.dcm$/);
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      estado: 'EN PROCESO',
      storage_path: expect.stringMatching(/^1\/\d+-torax\.dcm$/),
    })
  );
});
