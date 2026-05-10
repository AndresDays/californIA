import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlantillasRadiologia from './plantillas-radiologia';
import { supabase } from '../../../lib/supabase-client';

let mockAuthUser = { id: 'auth-1', email: 'radio@example.com' };
let mockEmpleado = {
  id_empleado: 7,
  nombre: 'Radio User',
  rol: 'radiologo',
};
let mockPlantillas = [];

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../../context/auth-context', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    signOut: mockSignOut,
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../components/header-principal', () => () => <div>Header</div>);
jest.mock('../../../components/sidebar-home', () => () => <div>Sidebar</div>);
jest.mock('../../../components/ModalNotificacion', () => ({ isOpen, mensaje }) =>
  isOpen ? <div>{mensaje}</div> : null,
);

jest.mock('../../../lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

const buildPlantillasQuery = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: mockPlantillas, error: null }),
  single: jest.fn().mockResolvedValue({
    data: { id: 'tpl-1', nombre: 'Membrete nuevo' },
    error: null,
  }),
});

describe('PlantillasRadiologia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = { id: 'auth-1', email: 'radio@example.com' };
    mockEmpleado = {
      id_empleado: 7,
      nombre: 'Radio User',
      rol: 'radiologo',
    };
    mockPlantillas = [
      {
        id: 'tpl-0',
        nombre: 'Membrete General',
        descripcion: 'Plantilla principal',
        visibilidad: 'organizacion',
        categoria: 'Radiologia',
        archivo_url: 'https://example.com/membrete.png',
        created_at: '2026-05-10T00:00:00Z',
      },
    ];

    supabase.from.mockImplementation((table) => {
      if (table === 'empleados') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockEmpleado, error: null }),
        };
      }

      return buildPlantillasQuery();
    });

    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://example.com/subido.png' },
      })),
    });
  });

  it('shows the templates workspace for radiologos', async () => {
    render(<PlantillasRadiologia />);

    expect(await screen.findByRole('heading', { name: /Plantillas/i })).toBeInTheDocument();
    expect(screen.getByText('Membrete General')).toBeInTheDocument();
  });

  it('blocks employees without template access', async () => {
    mockEmpleado = {
      id_empleado: 9,
      nombre: 'Recepcion User',
      rol: 'recepcionista',
    };

    render(<PlantillasRadiologia />);

    expect(await screen.findByText(/No tienes acceso a Plantillas/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva plantilla/i })).not.toBeInTheDocument();
  });

  it('uploads a Word letterhead and saves its metadata', async () => {
    render(<PlantillasRadiologia />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva plantilla/i }));
    fireEvent.change(screen.getByLabelText(/Nombre de plantilla/i), {
      target: { value: 'Membrete nuevo' },
    });
    fireEvent.change(screen.getByLabelText(/Descripcion/i), {
      target: { value: 'Para reportes de resonancia' },
    });
    fireEvent.change(screen.getByLabelText(/Archivo de membrete/i), {
      target: {
        files: [
          new File(['membrete'], 'membrete.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar plantilla/i }));

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('plantillas-radiologia');
      expect(supabase.from).toHaveBeenCalledWith('plantillas_radiologia');
    });
  });
});
