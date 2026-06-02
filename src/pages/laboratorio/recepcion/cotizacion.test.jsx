// cotizacion.test.jsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks 
jest.mock('./cotizacion.css', () => ({}));

jest.mock('../../../assets/empresaIcono.png', () => 'empresaIcono.png');
jest.mock('../../../assets/pacienteIcono.png', () => 'pacienteIcono.png');

jest.mock('../../../components/page-layout.jsx', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));
jest.mock('../../../components/ModalNotificacion', () => ({
  __esModule: true,
  default: ({ isOpen, mensaje }) => isOpen ? <div role="alert">{mensaje}</div> : null
}));

jest.mock('../../../context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'test@test.com' } })
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../../../utils/generar-pdf-cotizacion', () => ({
  generarPDFCotizacion: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../lib/supabase-client', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: { id_cotizacion: 1, numero_cotizacion: 'COT-01' }, error: null }),
    insert: jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    lte:    jest.fn().mockReturnThis(),
  };
  return { supabase: { from: jest.fn(() => mockChain) } };
});

import Cotizacion from './cotizacion';
import { supabase } from '../../../lib/supabase-client';

const renderCotizacion = async () => {
  let result;
  await act(async () => {
    result = render(<Cotizacion />);
  });
  return result;
};

// Cotizacion — Renderizado
describe('Cotizacion — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza el título principal', async () => {
    await renderCotizacion();
    expect(screen.getByText('Cotización')).toBeInTheDocument();
  });

  test('renderiza los campos de datos del paciente', async () => {
    await renderCotizacion();
    expect(screen.getByPlaceholderText('Nombre del Paciente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ejemplo: Paciente en ayunas/i)).toBeInTheDocument();
  });

  test('renderiza el selector de empresa', async () => {
    await renderCotizacion();
    expect(screen.getByText('Selecciona una Empresa')).toBeInTheDocument();
  });

  test('muestra el mensaje de sin cotizaciones al cargar vacío', async () => {
    await renderCotizacion();
    expect(screen.getByText('No hay cotizaciones guardadas')).toBeInTheDocument();
  });
});

// Cotizacion — Validaciones
describe('Cotizacion — Validaciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('muestra notificación si se guarda sin nombre de paciente', async () => {
    await renderCotizacion();

    await act(async () => {
      fireEvent.click(screen.getByAltText('Guardar'));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Por favor ingrese el nombre del paciente');
  });

  test('muestra notificación si se guarda sin estudios', async () => {
    await renderCotizacion();

    fireEvent.change(screen.getByPlaceholderText('Nombre del Paciente'), {
      target: { value: 'Ana López' }
    });

    await act(async () => {
      fireEvent.click(screen.getByAltText('Guardar'));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Por favor agregue al menos un estudio');
  });
});

// Cotizacion — Interacción
describe('Cotizacion — Interacción', () => {
  beforeEach(() => jest.clearAllMocks());

  test('actualiza el nombre del paciente al escribir', async () => {
    await renderCotizacion();
    const input = screen.getByPlaceholderText('Nombre del Paciente');
    fireEvent.change(input, { target: { value: 'Carlos Ruiz' } });
    expect(input.value).toBe('Carlos Ruiz');
  });

  test('filtra cotizaciones al escribir en el buscador', async () => {
    await renderCotizacion();
    const buscador = screen.getByPlaceholderText('Busca Cotizaciones aqui...');
    fireEvent.change(buscador, { target: { value: 'Juan' } });
    expect(buscador.value).toBe('Juan');
  });

});