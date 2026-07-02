import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Polyfills para Node 
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock de Supabase 
jest.mock('./lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock del AuthContext 
jest.mock('./context/auth-context', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
    loading: false,
  }),
}));

// Mock de ProtectedRoute (pass-through)
jest.mock('./components/protected-route', () => ({
  __esModule: true,
  default: ({ children }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

// Mocks de páginas públicas 
jest.mock('./pages/login', () => ({
  __esModule: true,
  default: () => <div data-testid="login-page">Login Page</div>,
}));

jest.mock('./pages/forgot-password', () => ({
  __esModule: true,
  default: () => <div data-testid="forgot-password-page">Forgot Password Page</div>,
}));

// Mocks de páginas generales
jest.mock('./pages/home', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

jest.mock('./pages/usuarios', () => ({
  __esModule: true,
  default: () => <div data-testid="usuarios-page">Usuarios Page</div>,
}));

jest.mock('./pages/pacientes', () => ({
  __esModule: true,
  default: () => <div data-testid="pacientes-page">Pacientes Page</div>,
}));

jest.mock('./pages/perfil', () => ({
  __esModule: true,
  default: () => <div data-testid="perfil-page">Perfil Page</div>,
}));

// Mocks de páginas de Radiología
jest.mock('./pages/radiologia/pages/dashboard-radiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="radiologia-page">Radiología Page</div>,
}));

jest.mock('./pages/radiologia/pages/visor-dicom', () => ({
  __esModule: true,
  default: () => <div data-testid="visor-dicom-page">Visor DICOM Page</div>,
}));

jest.mock('./pages/radiologia/pages/ReporteRadiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-radiologia-page">Reporte Radiología Page</div>,
}));

jest.mock('./pages/radiologia/pages/plantillas-radiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="plantillas-page">Plantillas Page</div>,
}));

// Mocks de páginas de Laboratorio
jest.mock('./pages/laboratorio/laboratorio', () => ({
  __esModule: true,
  default: () => <div data-testid="laboratorio-page">Laboratorio Page</div>,
}));

jest.mock('./pages/laboratorio/nuevo-paciente', () => ({
  __esModule: true,
  default: () => <div data-testid="nuevo-paciente-page">Nuevo Paciente Page</div>,
}));

jest.mock('./pages/laboratorio/calendario-citas', () => ({
  __esModule: true,
  default: () => <div data-testid="calendario-citas-page">Calendario Citas Page</div>,
}));

jest.mock('./pages/laboratorio/captura', () => ({
  __esModule: true,
  default: () => <div data-testid="captura-page">Captura Page</div>,
}));

jest.mock('./pages/laboratorio/entrega-resultados', () => ({
  __esModule: true,
  default: () => <div data-testid="entrega-resultados-page">Entrega Resultados Page</div>,
}));

jest.mock('./pages/laboratorio/cierre-caja', () => ({
  __esModule: true,
  default: () => <div data-testid="cierre-caja-page">Cierre Caja Page</div>,
}));

jest.mock('./pages/laboratorio/clientes', () => ({
  __esModule: true,
  default: () => <div data-testid="clientes-page">Clientes Page</div>,
}));

jest.mock('./pages/laboratorio/doctores', () => ({
  __esModule: true,
  default: () => <div data-testid="doctores-page">Doctores Page</div>,
}));

jest.mock('./pages/laboratorio/reporte-ventas', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-ventas-page">Reporte Ventas Page</div>,
}));

jest.mock('./pages/laboratorio/reporte-administrativo', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-administrativo-page">Reporte Administrativo Page</div>,
}));

// Mocks de páginas de Recepción
jest.mock('./pages/laboratorio/recepcion/editar-solicitud', () => ({
  __esModule: true,
  default: () => <div data-testid="editar-solicitud-page">Editar Solicitud Page</div>,
}));

jest.mock('./pages/laboratorio/recepcion/cotizacion', () => ({
  __esModule: true,
  default: () => <div data-testid="cotizacion-page">Cotización Page</div>,
}));

jest.mock('./pages/laboratorio/recepcion/historial', () => ({
  __esModule: true,
  default: () => <div data-testid="historial-page">Historial Page</div>,
}));

// Mocks de páginas de Configuración
jest.mock('./pages/laboratorio/configuracion/estudios-laboratorio', () => ({
  __esModule: true,
  default: () => <div data-testid="estudios-lab-page">Estudios Laboratorio Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/analitos', () => ({
  __esModule: true,
  default: () => <div data-testid="analitos-page">Analitos Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/paquetes', () => ({
  __esModule: true,
  default: () => <div data-testid="paquetes-page">Paquetes Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/precios', () => ({
  __esModule: true,
  default: () => <div data-testid="precios-page">Precios Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-areas', () => ({
  __esModule: true,
  default: () => <div data-testid="areas-page">Áreas Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/tipo_muestra', () => ({
  __esModule: true,
  default: () => <div data-testid="tipo-muestra-page">Tipo Muestra Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-recipientes', () => ({
  __esModule: true,
  default: () => <div data-testid="recipientes-page">Recipientes Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-metodos', () => ({
  __esModule: true,
  default: () => <div data-testid="metodos-page">Métodos Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-tecnicas', () => ({
  __esModule: true,
  default: () => <div data-testid="tecnicas-page">Técnicas Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-equipos', () => ({
  __esModule: true,
  default: () => <div data-testid="equipos-page">Equipos Page</div>,
}));

jest.mock('./pages/laboratorio/configuracion/administrar-niveles', () => ({
  __esModule: true,
  default: () => <div data-testid="niveles-page">Niveles Page</div>,
}));

// Helper para navegar antes de renderizar
const renderAtPath = (path) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

// SUITE 1 — Comportamiento general
describe('App — General', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza sin errores', () => {
    renderAtPath('/login');
  });

  test('redirige "/" a "/login"', async () => {
    renderAtPath('/');
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    );
  });

  test('muestra Login en "/login"', async () => {
    renderAtPath('/login');
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    );
  });

  test('muestra ForgotPassword en "/forgot-password"', async () => {
    renderAtPath('/forgot-password');
    await waitFor(() =>
      expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument()
    );
  });

  test('redirige rutas desconocidas a "/login" (404 → login)', async () => {
    renderAtPath('/ruta-que-no-existe');
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    );
  });

  test('las rutas protegidas quedan envueltas en ProtectedRoute', async () => {
    renderAtPath('/dashboard');
    await waitFor(() =>
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
    );
  });
});

// SUITE 2 — Rutas protegidas generales
describe('App — Rutas protegidas generales', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    ['/dashboard',  'dashboard-page'],
    ['/perfil',     'perfil-page'],
    ['/usuarios',   'usuarios-page'],
    ['/pacientes',  'pacientes-page'],
  ];

  test.each(cases)('"%s" renderiza el componente correcto', async (path, testId) => {
    renderAtPath(path);
    await waitFor(() =>
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    );
  });

  test('ruta /plantillas renderiza página de plantillas', async () => {
    window.history.pushState({}, '', '/plantillas');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('plantillas-page')).toBeInTheDocument();
    });
  });
});

// SUITE 3 — Rutas de Radiología
describe('App — Radiología', () => {
  beforeEach(() => jest.clearAllMocks());

  test('"/radiologia" renderiza DashboardRadiologia', async () => {
    renderAtPath('/radiologia');
    await waitFor(() =>
      expect(screen.getByTestId('radiologia-page')).toBeInTheDocument()
    );
  });

  test('"/visor-dicom/:estudioId" renderiza VisorDicom con param dinámico', async () => {
    renderAtPath('/visor-dicom/abc-456');
    await waitFor(() =>
      expect(screen.getByTestId('visor-dicom-page')).toBeInTheDocument()
    );
  });

  test('"/reporte" renderiza ReporteRadiologia', async () => {
    renderAtPath('/reporte');
    await waitFor(() =>
      expect(screen.getByTestId('reporte-radiologia-page')).toBeInTheDocument()
    );
  });

  test('ruta /reporte-administrativo funciona', async () => {
    window.history.pushState({}, '', '/reporte-administrativo');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('reporte-administrativo-page')).toBeInTheDocument();
    });
  });
});

// SUITE 4 — Rutas de Laboratorio
describe('App — Laboratorio', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    ['/laboratorio',        'laboratorio-page'],
    ['/nuevo-paciente',     'nuevo-paciente-page'],
    ['/calendario',         'calendario-citas-page'],
    ['/captura',            'captura-page'],
    ['/entrega-resultados', 'entrega-resultados-page'],
    ['/cierre-caja',        'cierre-caja-page'],
    ['/clientes',           'clientes-page'],
    ['/doctores',           'doctores-page'],
    ['/reporte-ventas',     'reporte-ventas-page'],
  ];

  test.each(cases)('"%s" renderiza el componente correcto', async (path, testId) => {
    renderAtPath(path);
    await waitFor(() =>
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    );
  });
});

// SUITE 5 — Rutas de Recepción
describe('App — Recepción', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    ['/editar-solicitud', 'editar-solicitud-page'],
    ['/cotizacion',       'cotizacion-page'],
    ['/historial',        'historial-page'],
  ];

  test.each(cases)('"%s" renderiza el componente correcto', async (path, testId) => {
    renderAtPath(path);
    await waitFor(() =>
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    );
  });
});

// SUITE 6 — Rutas de Configuración
describe('App — Configuración', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    ['/configuracion/estudios',     'estudios-lab-page'],
    ['/configuracion/analitos',     'analitos-page'],
    ['/configuracion/paquetes',     'paquetes-page'],
    ['/configuracion/precios',      'precios-page'],
    ['/configuracion/areas',        'areas-page'],
    ['/configuracion/tipo-muestra', 'tipo-muestra-page'],
    ['/configuracion/recipientes',  'recipientes-page'],
    ['/configuracion/metodo',       'metodos-page'],
    ['/configuracion/tecnica',      'tecnicas-page'],
    ['/configuracion/equipos',      'equipos-page'],
    ['/configuracion/nivel',        'niveles-page'],
  ];

  test.each(cases)('"%s" renderiza el componente correcto', async (path, testId) => {
    renderAtPath(path);
    await waitFor(() =>
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    );
  });
});
