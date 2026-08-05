import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardRadiologia from './dashboard-radiologia';

const mockNavigate = jest.fn();
const mockEqEstudios = jest.fn();
const mockUpdate = jest.fn(() => ({
  eq: jest.fn().mockResolvedValue({ error: null }),
}));
const mockHeader = jest.fn(() => <div>Header</div>);
const mockSidebar = jest.fn(({ isOpen }) => <div>{isOpen ? 'Sidebar mobile abierto' : 'Sidebar mobile cerrado'}</div>);
const mockSidebarHome = jest.fn(() => <div>Sidebar escritorio</div>);
const mockSetSidebarOpen = jest.fn();
let mockSidebarState = {
  sidebarOpen: false,
  setSidebarOpen: mockSetSidebarOpen,
  isMobile: false,
};
let mockAuthUser = { id: 'user-1', email: 'radiologia@test.com' };
let mockEmpleadoData = null;
let mockDoctorData = null;
let mockAuthEmpleadoData = null;
let mockTecnicosAsignables = [];
let mockRadiologosAsignables = [];
let mockMedicosReferentes = [];

jest.mock('../../../context/auth-context', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    empleadoData: mockAuthEmpleadoData,
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
jest.mock('../componentes/TarjetaEstudio', () => ({ nombrePaciente, estado, onClick, onVerDetalles }) => (
  <div>
    <button type="button" onClick={onClick}>
      {nombrePaciente} {estado}
    </button>
    <button type="button" onClick={onVerDetalles} aria-label={`Detalles ${nombrePaciente}`}>
      ⋮
    </button>
  </div>
));

jest.mock('../../../lib/supabase-client', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'empleados') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockEmpleadoData,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: [...mockTecnicosAsignables, ...mockRadiologosAsignables],
            error: null,
          }),
        };
      }
      if (table === 'doctores') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockDoctorData,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: mockMedicosReferentes,
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: mockEqEstudios.mockReturnThis(),
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
  mockAuthUser = { id: 'user-1', email: 'radiologia@test.com' };
  mockAuthEmpleadoData = null;
  mockEmpleadoData = {
    id_empleado: 7,
    nombre: 'Radiologo Principal',
    rol: 'radiologo',
  };
  mockDoctorData = null;
  mockTecnicosAsignables = [];
  mockRadiologosAsignables = [];
  mockMedicosReferentes = [];
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

test('does not offer manual image upload from cards or study details', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /Subir imagen Maria Gomez/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Detalles Maria Gomez/i }));
  expect(screen.queryByRole('button', { name: /Subir imagen|Reemplazar imagen/i })).not.toBeInTheDocument();
});

test('lets an authorized user choose whether to assign a technician, referring doctor, or radiologist', async () => {
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Detalles Maria Gomez/i }));
  fireEvent.click(screen.getByRole('button', { name: /Asignar estudio/i }));

  expect(screen.getByRole('heading', { name: /Asignar estudio a/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Técnico/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Médico referente/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Radiólogo/i })).toBeInTheDocument();
});

test('assigns the selected technician to the study', async () => {
  mockTecnicosAsignables = [{
    id_empleado: 23,
    nombre: 'Técnico Andrea',
    rol: 'tecnico_radiologia',
    especialidad: 'Tomografía',
  }];
  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Detalles Maria Gomez/i }));
  fireEvent.click(screen.getByRole('button', { name: /Asignar estudio/i }));
  fireEvent.click(screen.getByRole('button', { name: /Técnico/i }));

  await waitFor(() => expect(screen.getByText(/Técnico Andrea/i)).toBeInTheDocument());
  expect(document.querySelector('.radiologia-modal-asignar')).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Técnico Andrea/i));
  fireEvent.click(screen.getByRole('button', { name: /^Asignar Estudio$/ }));

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
    id_tecnico: 23,
    estado: 'ASIGNADO',
  })));
});

test('filters studies by assigned doctor and hides assignment actions for external doctors', async () => {
  mockEmpleadoData = {
    id_empleado: 88,
    nombre: 'Doctor Externo',
    rol: 'doctor_externo',
  };
  mockDoctorData = {
    id_doctor: 42,
    nombre: 'Doctor Externo',
    auth_uuid: 'user-1',
  };

  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(mockEqEstudios).toHaveBeenCalledWith('id_doctor', 42);
  fireEvent.click(screen.getByRole('button', { name: /Detalles Maria Gomez/i }));
  expect(screen.queryByRole('button', { name: /Asignar estudio/i })).not.toBeInTheDocument();
});

test('loads assigned studies for local external doctor sessions', async () => {
  mockAuthUser = { id: 'doctor:42', email: 'doctor@test.com' };
  mockAuthEmpleadoData = {
    nombre: 'Doctor Externo',
    rol: 'doctor_externo',
    id_doctor: 42,
  };

  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(mockEqEstudios).toHaveBeenCalledWith('id_doctor', 42);
  expect(screen.queryByRole('button', { name: /Subir imagen Maria Gomez/i })).not.toBeInTheDocument();
});

test('derives assigned doctor id from local doctor session when profile data is stale', async () => {
  mockAuthUser = { id: 'doctor:42', email: 'doctor@test.com' };
  mockAuthEmpleadoData = {
    nombre: 'Doctor Externo',
    rol: 'doctor_externo',
  };

  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(mockEqEstudios).toHaveBeenCalledWith('id_doctor', 42);
});

test('filters by local doctor session even before doctor profile is hydrated', async () => {
  mockAuthUser = { id: 'doctor:3', email: 'doctor@test.com' };
  mockAuthEmpleadoData = null;

  render(<DashboardRadiologia />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Maria Gomez POR ASIGNAR/i })).toBeInTheDocument());

  expect(mockEqEstudios).toHaveBeenCalledWith('id_doctor', 3);
});
