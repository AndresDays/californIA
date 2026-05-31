import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';
import { supabase } from '../lib/supabase-client';

// Mock de supabase
jest.mock('../lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      })),
      onAuthStateChange: jest.fn((callback) => {
        return {
          data: { 
            subscription: { 
              unsubscribe: jest.fn() 
            } 
          }
        };
      }),
      signInWithPassword: jest.fn(() => Promise.resolve({ 
        data: { user: { email: 'test@example.com' } }, 
        error: null 
      })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null }))
    }
  }
}));

// Componente de prueba para consumir el contexto
function AuthContextConsumer() {
  const { user, loading, error, signIn, signOut, resetPassword } = useAuth();
  
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="error">{error || 'no-error'}</span>
      <button onClick={() => signIn('test@example.com', 'password123')}>Login</button>
      <button onClick={() => signOut()}>Logout</button>
      <button onClick={() => resetPassword && resetPassword('test@example.com')}>Reset</button>
    </div>
  );
}

// Error Boundary para capturar errores de React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AuthProvider proporciona el contexto de autenticación por defecto', async () => {
    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('error').textContent).toBe('no-error');
  });

  test('AuthProvider inicializa con loading=true y luego cambia a false', async () => {
    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    const loadingElement = screen.getByTestId('loading');
    
    await waitFor(() => {
      expect(loadingElement.textContent).toBe('ready');
    });
  });

  test('AuthProvider verifica sesión al montar', async () => {
    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });
  });

  test('AuthProvider configura listener de cambios de auth', async () => {
    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  test('AuthProvider limpia subscription al desmontar', async () => {
    const unsubscribeMock = jest.fn();
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { 
        subscription: { 
          unsubscribe: unsubscribeMock 
        } 
      }
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

describe('AuthContext - Con sesión activa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    supabase.auth.getSession.mockResolvedValue({
      data: { 
        session: { 
          user: { email: 'user@example.com', id: '123' } 
        } 
      },
      error: null
    });
  });

  test('muestra usuario cuando hay sesión activa', async () => {
    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user@example.com');
    });
  });
});

describe('AuthContext - Manejo de errores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maneja error al obtener sesión', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Error de conexión' }
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthContextConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    consoleSpy.mockRestore();
  });
});
