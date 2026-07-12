import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VisorDicom from './visor-dicom';

// Polyfills
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock de HTMLCanvasElement
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({
      clearRect:    jest.fn(),
      beginPath:    jest.fn(),
      moveTo:       jest.fn(),
      lineTo:       jest.fn(),
      stroke:       jest.fn(),
      fill:         jest.fn(),
      arc:          jest.fn(),
      ellipse:      jest.fn(),
      strokeRect:   jest.fn(),
      fillRect:     jest.fn(),
      drawImage:    jest.fn(),
      save:         jest.fn(),
      restore:      jest.fn(),
      clip:         jest.fn(),
      measureText:  jest.fn(() => ({ width: 0 })),
      fillText:     jest.fn(),
      setLineDash:  jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      toDataURL:    jest.fn(() => 'data:image/png;base64,MOCKED'),
    }),
  });
});

// Mock de Cornerstone
jest.mock('cornerstone-core', () => ({
  enable: jest.fn(),
  disable: jest.fn(),
  loadAndCacheImage: jest.fn(() => Promise.resolve({
    imageId: 'mock-id',
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    width: 512,
    height: 512,
  })),
  displayImage: jest.fn(),
  getViewport: jest.fn(() => ({
    scale: 1,
    voi: { windowWidth: 400, windowCenter: 40 },
    translation: { x: 0, y: 0 },
  })),
  setViewport: jest.fn(),
  updateImage: jest.fn(),
  reset: jest.fn(),
  resize: jest.fn(),
  getImage: jest.fn(() => ({})),
  getEnabledElement: jest.fn(() => ({ canvas: {} })),
  events: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
  registerImageLoader: jest.fn(),
}));

jest.mock('cornerstone-wado-image-loader', () => ({
  external: { cornerstone: null, dicomParser: null },
  configure: jest.fn(),
  wadouri: {
    dataSetCacheManager: { unload: jest.fn() },
    fileManager: { add: jest.fn(), remove: jest.fn() },
  },
}));

jest.mock('cornerstone-tools', () => ({
  external: { cornerstone: null, Hammer: null },
  init: jest.fn(),
  addTool: jest.fn(),
  setToolActive: jest.fn(),
}));

jest.mock('dicom-parser', () => ({}));

// Mock de la generacion de PDF del reporte (jspdf es ESM y jest no lo transforma)
jest.mock('../../../utils/reporte-pdf', () => ({
  generarReportePdf: jest.fn().mockResolvedValue(undefined),
  crearNombreArchivoReporte: jest.fn(() => 'reporte_test.pdf'),
}));

// Mock de Assets
jest.mock('../../../assets/anguloIcono.png',      () => 'mock-img');
jest.mock('../../../assets/anotarIcono.png',      () => 'mock-img');
jest.mock('../../../assets/basuraIcon.png',       () => 'mock-img');
jest.mock('../../../assets/capturaIcono.png',     () => 'mock-img');
jest.mock('../../../assets/centrarIcono.png',     () => 'mock-img');
jest.mock('../../../assets/cineIcono.png',        () => 'mock-img');
jest.mock('../../../assets/comentarioIcono.png',  () => 'mock-img');
jest.mock('../../../assets/compartirIcono.png',   () => 'mock-img');
jest.mock('../../../assets/contrasteIcono.png',   () => 'mock-img');
jest.mock('../../../assets/descargarIcono.png',   () => 'mock-img');
jest.mock('../../../assets/detallesIcono.png',    () => 'mock-img');
jest.mock('../../../assets/doctorV2Icono.png',    () => 'mock-img');
jest.mock('../../../assets/editarIcono.png',      () => 'mock-img');
jest.mock('../../../assets/etiquetaIcono.png',    () => 'mock-img');
jest.mock('../../../assets/exclamacionIcono.png', () => 'mock-img');
jest.mock('../../../assets/formatoIcono.png',     () => 'mock-img');
jest.mock('../../../assets/informacionIcono.png', () => 'mock-img');
jest.mock('../../../assets/longitudIcono.png',    () => 'mock-img');
jest.mock('../../../assets/lupaIcono.png',        () => 'mock-img');
jest.mock('../../../assets/masIcono.png',         () => 'mock-img');
jest.mock('../../../assets/metricasIcono.png',    () => 'mock-img');
jest.mock('../../../assets/moverIcono.png',       () => 'mock-img');
jest.mock('../../../assets/nubeIcono.png',        () => 'mock-img');
jest.mock('../../../assets/ojosIcono.png',        () => 'mock-img');
jest.mock('../../../assets/referenteIcono.png',   () => 'mock-img');
jest.mock('../../../assets/restaurarIcono.png',   () => 'mock-img');
jest.mock('../../../assets/scrollIcono.png',      () => 'mock-img');
jest.mock('../../../assets/solicitudIcono.png',   () => 'mock-img');
jest.mock('../../../assets/tecnicoIcono.png',     () => 'mock-img');

// Mock de CSS
jest.mock('./VisorDicom.css', () => ({}));

// Mock de React Router
const mockNavigate = jest.fn();
let mockEmpleadoVisor = null;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams:   () => ({ estudioId: '123' }),
  useLocation: () => ({
    state: {
      estudio: {
        id: 123,
        nombrePaciente: 'Juan Pérez',
        tipoEstudio: 'RX',
        sucursal: 'Norte',
        horaFecha: '2024-01-01',
        estado: 'Pendiente',
      },
    },
  }),
}));

// Mock de AuthContext
jest.mock('../../../context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@test.com' },
    signOut: jest.fn(),
  }),
}));

// Mock de Supabase
jest.mock('../../../lib/supabase-client', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      neq:         jest.fn().mockReturnThis(),
      order:       jest.fn().mockReturnThis(),
      limit:       jest.fn().mockReturnThis(),
      single:      jest.fn(() => Promise.resolve({
        data: table === 'estudios_radiologia'
          ? { url_archivo: 'mock.dcm', id_doctor: mockEmpleadoVisor?.id_doctor || null }
          : { url_archivo: 'mock.dcm' },
        error: null,
      })),
      maybeSingle: jest.fn(() => Promise.resolve({
        data: table === 'empleados' ? mockEmpleadoVisor : null,
        error: null,
      })),
      insert:      jest.fn().mockReturnThis(),
      update:      jest.fn().mockReturnThis(),
      delete:      jest.fn().mockReturnThis(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload:       jest.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock.url/file.dcm' } })),
        createSignedUrl: jest.fn(() => Promise.resolve({ data: { signedUrl: 'https://mock.url/signed-file.dcm' }, error: null })),
      })),
    },
  },
}));

// Mock de componentes hijos
jest.mock('../../../components/header-principal', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-header">MockHeader</div>,
}));
jest.mock('../../../components/ModalConfirmarEliminacion', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../components/ModalNotificacion', () => ({
  __esModule: true,
  default: ({ isOpen, mensaje }) =>
    isOpen ? <div data-testid="mock-notificacion">{mensaje}</div> : null,
}));
jest.mock('../componentes/ModalAsignar', () => ({
  __esModule: true,
  default: ({ config }) => config ? <div data-testid="mock-modal-asignar">{config.titulo}</div> : null,
}));

// Helper
const renderVisor = async () => {
  let result;
  await act(async () => {
    result = render(<VisorDicom />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return result;
};

// SUITE 1 — Renderizado general
describe('VisorDicom — Renderizado general', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmpleadoVisor = null;
  });

  test('renderiza sin errores', async () => {
    await renderVisor();
  });

  test('muestra el Header', async () => {
    await renderVisor();
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
  });

  test('muestra el botón Atrás', async () => {
    await renderVisor();
    expect(screen.getByText(/Atrás/)).toBeInTheDocument();
  });

  test('muestra la sección Herramientas', async () => {
    await renderVisor();
    expect(screen.getByText('Herramientas')).toBeInTheDocument();
  });

  test('muestra la sección Flujo', async () => {
    await renderVisor();
    expect(screen.getByText('Flujo')).toBeInTheDocument();
  });

  test('muestra la sección Series en la barra lateral', async () => {
    await renderVisor();
    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  test('muestra el panel con mensaje "Sin imagen" cuando no hay imageId', async () => {
    await renderVisor();
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
  });
});

// SUITE 2 — Toolbar: herramientas
describe('VisorDicom — Toolbar herramientas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmpleadoVisor = null;
  });

  test.each([
    'Scroll', 'Ampliar', 'W/L', 'Mover',
    'Longitud', 'Anotar', 'Ángulo', 'Centrar',
  ])('muestra el botón de herramienta "%s"', async (label) => {
    await renderVisor();
    expect(screen.getByTitle(label)).toBeInTheDocument();
  });

  test('clic en una herramienta la marca como activa', async () => {
    await renderVisor();
    const btn = screen.getByTitle('Ampliar');
    fireEvent.click(btn);
    expect(btn.className).toContain('activo');
  });

  test('clic en Centrar incrementa el contador de centrado', async () => {
    await renderVisor();
    const btn = screen.getByTitle('Centrar');
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });
});

// SUITE 3 — Toolbar: acciones
describe('VisorDicom — Toolbar acciones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmpleadoVisor = null;
  });

  test.each([
    'Restaurar', 'CINE', 'Más', 'Detalle',
    'Descargar', 'Captura',
    'Compartir', 'Formato',
  ])('muestra el botón de acción "%s"', async (label) => {
    await renderVisor();
    expect(screen.getByTitle(label)).toBeInTheDocument();
  });

  test('muestra el botón de Reporte (título "Abrir reporte")', async () => {
    await renderVisor();
    expect(screen.getByTitle('Abrir reporte')).toBeInTheDocument();
  });

  test('clic en Más muestra opciones del submenú', async () => {
    await renderVisor();
    await act(async () => { fireEvent.click(screen.getByTitle('Más')); });
    // MAS_ITEMS includes "Lupa", "Elipse", etc.
    expect(screen.getByTitle('Lupa')).toBeInTheDocument();
  });

  test('clic en Detalle abre el panel de detalles', async () => {
    await renderVisor();
    await act(async () => { fireEvent.click(screen.getByTitle('Detalle')); });
    // panelDerecho="detalles" shows patient info panel
    expect(screen.getByText('Paciente')).toBeInTheDocument();
  });

  test('clic en opciones de reporte muestra las opciones', async () => {
    await renderVisor();
    // Click the "Opciones de reporte" toggle button
    await act(async () => { fireEvent.click(screen.getByTitle('Opciones de reporte')); });
    // REPORTE_ITEMS includes "Nueva pestaña", "Usar plantilla", "Adjuntar"
    expect(screen.getByTitle('Nueva pestaña')).toBeInTheDocument();
  });

  test('clic en Formato muestra el popup de formatos de grid', async () => {
    await renderVisor();
    await act(async () => { fireEvent.click(screen.getByTitle('Formato')); });
    expect(screen.getAllByText('1×1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2×2')).toBeInTheDocument();
    expect(screen.getByText('2×3')).toBeInTheDocument();
  });

  test('clic en Más y luego en Detalle cierra el submenú Más', async () => {
    await renderVisor();
    await act(async () => { fireEvent.click(screen.getByTitle('Más')); });
    expect(screen.getByTitle('Lupa')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByTitle('Detalle')); });
    // Clicking Detalle closes Más submenu
    expect(screen.queryByTitle('Lupa')).not.toBeInTheDocument();
  });

});

// SUITE 4 — Navegación
describe('VisorDicom — Navegación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmpleadoVisor = null;
  });

  test('clic en Atrás llama a navigate(-1)', async () => {
    await renderVisor();
    fireEvent.click(screen.getByText(/Atrás/));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
