import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Polyfills para Node
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock de Supabase
jest.mock('./lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { 
          subscription: { 
            unsubscribe: jest.fn() 
          } 
        }
      })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }
}));

// Mock del auth context
jest.mock('./context/auth-context', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
    loading: false
  })
}));

// Mock de todos los componentes de páginas
jest.mock('./pages/login', () => ({
  __esModule: true,
  default: () => <div data-testid="login-page">Login Page</div>
}));

jest.mock('./pages/forgot-password', () => ({
  __esModule: true,
  default: () => <div data-testid="forgot-password-page">Forgot Password Page</div>
}));

jest.mock('./pages/home', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

jest.mock('./pages/usuarios', () => ({
  __esModule: true,
  default: () => <div data-testid="usuarios-page">Usuarios Page</div>
}));

jest.mock('./pages/pacientes', () => ({
  __esModule: true,
  default: () => <div data-testid="pacientes-page">Pacientes Page</div>
}));

jest.mock('./pages/perfil', () => ({
  __esModule: true,
  default: () => <div data-testid="perfil-page">Perfil Page</div>
}));

jest.mock('./pages/radiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="radiologia-base-page">Radiología Base Page</div>
}));

jest.mock('./pages/radiologia/pages/dashboard-radiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="radiologia-page">Radiología Page</div>
}));

jest.mock('./pages/radiologia/pages/visor-dicom', () => ({
  __esModule: true,
  default: () => <div data-testid="visor-dicom-page">Visor DICOM Page</div>
}));

jest.mock('./pages/radiologia/pages/ReporteRadiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-radiologia-page">Reporte Radiología Page</div>
}));

jest.mock('./pages/radiologia/pages/plantillas-radiologia', () => ({
  __esModule: true,
  default: () => <div data-testid="plantillas-page">Plantillas Page</div>
}));

jest.mock('./pages/laboratorio/laboratorio', () => ({
  __esModule: true,
  default: () => <div data-testid="laboratorio-page">Laboratorio Page</div>
}));

jest.mock('./pages/laboratorio/nuevo-paciente', () => ({
  __esModule: true,
  default: () => <div data-testid="nuevo-paciente-page">Nuevo Paciente Page</div>
}));

jest.mock('./pages/laboratorio/captura', () => ({
  __esModule: true,
  default: () => <div data-testid="captura-page">Captura Page</div>
}));

jest.mock('./pages/laboratorio/entrega-resultados', () => ({
  __esModule: true,
  default: () => <div data-testid="entrega-resultados-page">Entrega Resultados Page</div>
}));

jest.mock('./pages/laboratorio/recepcion/editar-solicitud', () => ({
  __esModule: true,
  default: () => <div data-testid="editar-solicitud-page">Editar Solicitud Page</div>
}));

jest.mock('./pages/laboratorio/recepcion/cotizacion', () => ({
  __esModule: true,
  default: () => <div data-testid="cotizacion-page">Cotización Page</div>
}));

jest.mock('./pages/laboratorio/recepcion/historial', () => ({
  __esModule: true,
  default: () => <div data-testid="historial-page">Historial Page</div>
}));

jest.mock('./pages/laboratorio/cierre-caja', () => ({
  __esModule: true,
  default: () => <div data-testid="cierre-caja-page">Cierre Caja Page</div>
}));

jest.mock('./pages/laboratorio/clientes', () => ({
  __esModule: true,
  default: () => <div data-testid="clientes-page">Clientes Page</div>
}));

jest.mock('./pages/laboratorio/doctores', () => ({
  __esModule: true,
  default: () => <div data-testid="doctores-page">Doctores Page</div>
}));

jest.mock('./pages/laboratorio/reporte-ventas', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-ventas-page">Reporte Ventas Page</div>
}));

jest.mock('./pages/laboratorio/reporte-administrativo', () => ({
  __esModule: true,
  default: () => <div data-testid="reporte-administrativo-page">Reporte Administrativo Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/estudios-laboratorio', () => ({
  __esModule: true,
  default: () => <div data-testid="estudios-lab-page">Estudios Laboratorio Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/analitos', () => ({
  __esModule: true,
  default: () => <div data-testid="analitos-page">Analitos Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/paquetes', () => ({
  __esModule: true,
  default: () => <div data-testid="paquetes-page">Paquetes Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/precios', () => ({
  __esModule: true,
  default: () => <div data-testid="precios-page">Precios Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-areas', () => ({
  __esModule: true,
  default: () => <div data-testid="areas-page">Áreas Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/tipo_muestra', () => ({
  __esModule: true,
  default: () => <div data-testid="tipo-muestra-page">Tipo Muestra Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-recipientes', () => ({
  __esModule: true,
  default: () => <div data-testid="recipientes-page">Recipientes Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-metodos', () => ({
  __esModule: true,
  default: () => <div data-testid="metodos-page">Métodos Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-tecnicas', () => ({
  __esModule: true,
  default: () => <div data-testid="tecnicas-page">Técnicas Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-equipos', () => ({
  __esModule: true,
  default: () => <div data-testid="equipos-page">Equipos Page</div>
}));

jest.mock('./pages/laboratorio/configuracion/administrar-niveles', () => ({
  __esModule: true,
  default: () => <div data-testid="niveles-page">Niveles Page</div>
}));

jest.mock('./components/protected-route', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="protected-route">{children}</div>
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza sin errores', () => {
    render(<App />);
  });

  test('redirige a login por defecto en ruta raíz', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  test('muestra página de login en /login', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  test('muestra página de forgot password en /forgot-password', async () => {
    window.history.pushState({}, '', '/forgot-password');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
    });
  });

  test('redirige rutas no existentes a login', async () => {
    window.history.pushState({}, '', '/ruta-no-existe');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  test('envuelve rutas protegidas con ProtectedRoute', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });
  });
});

describe('App Routing - Protected Routes', () => {
  test('ruta /perfil renderiza página de perfil', async () => {
    window.history.pushState({}, '', '/perfil');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('perfil-page')).toBeInTheDocument();
    });
  });

  test('ruta /radiologia renderiza dashboard de radiología', async () => {
    window.history.pushState({}, '', '/radiologia');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('radiologia-page')).toBeInTheDocument();
    });
  });

  test('ruta /usuarios renderiza página de usuarios', async () => {
    window.history.pushState({}, '', '/usuarios');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('usuarios-page')).toBeInTheDocument();
    });
  });

  test('ruta dinámica /visor-dicom/:estudioId funciona', async () => {
    window.history.pushState({}, '', '/visor-dicom/123');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('visor-dicom-page')).toBeInTheDocument();
    });
  });

  test('ruta /plantillas renderiza página de plantillas', async () => {
    window.history.pushState({}, '', '/plantillas');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('plantillas-page')).toBeInTheDocument();
    });
  });
});

describe('App Routing - Laboratorio', () => {
  test('ruta /laboratorio funciona', async () => {
    window.history.pushState({}, '', '/laboratorio');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('laboratorio-page')).toBeInTheDocument();
    });
  });

  test('ruta /nuevo-paciente funciona', async () => {
    window.history.pushState({}, '', '/nuevo-paciente');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('nuevo-paciente-page')).toBeInTheDocument();
    });
  });

  test('ruta /captura funciona', async () => {
    window.history.pushState({}, '', '/captura');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('captura-page')).toBeInTheDocument();
    });
  });

  test('ruta /reporte-administrativo funciona', async () => {
    window.history.pushState({}, '', '/reporte-administrativo');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('reporte-administrativo-page')).toBeInTheDocument();
    });
  });
});
