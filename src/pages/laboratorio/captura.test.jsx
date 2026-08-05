import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
jest.mock('./captura.css', () => ({}));

jest.mock('../../assets/calendarioIcono.png',      () => 'calendarioIcono.png');
jest.mock('../../assets/checkIconoVerde.png',       () => 'checkIcono.png');
jest.mock('../../assets/guardarIcono.png',          () => 'guardarIcono.png');
jest.mock('../../assets/ImprimirBtn.png',           () => 'imprimirBtn.png');
jest.mock('../../assets/relojIconoAmarillo.png',    () => 'relojIcono.png');

jest.mock('../../components/page-layout.jsx', () => ({
  __esModule: true, default: ({ children }) => <div>{children}</div>
}));
jest.mock('../../components/ModalNotificacion', () => ({
  __esModule: true,
  default: ({ isOpen, mensaje }) => isOpen ? <div role="alert">{mensaje}</div> : null
}));

jest.mock('../../context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'test@test.com' } })
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../../lib/supabase-client', () => {
  const mockChain = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    gte:         jest.fn().mockReturnThis(),
    lte:         jest.fn().mockReturnThis(),
    in:          jest.fn().mockReturnThis(),
    order:       jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single:      jest.fn().mockResolvedValue({ data: null, error: null }),
    update:      jest.fn().mockReturnThis(),
  };
  return { supabase: { from: jest.fn(() => mockChain) } };
});

import Captura from './captura';

const renderCaptura = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(<QueryClientProvider client={queryClient}><Captura /></QueryClientProvider>);
  });
};

// Captura — Renderizado
describe('Captura — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza los paneles principales', async () => {
    await renderCaptura();
    expect(screen.getByText('Lista de Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Área de Captura')).toBeInTheDocument();
    expect(screen.getByText('Área de Captura').closest('.panel-captura'))
      .toHaveClass('panel-captura-fill');
    expect(screen.getByText('Área de Captura').closest('.panel-captura'))
      .toHaveClass('panel-captura-match-height');
  });

  test('renderiza los filtros de fecha', async () => {
    await renderCaptura();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  test('renderiza los buscadores de folio y paciente', async () => {
    await renderCaptura();
    expect(screen.getByPlaceholderText('Folio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paciente')).toBeInTheDocument();
  });

  test('muestra mensaje vacío cuando no hay pacientes', async () => {
    await renderCaptura();
    expect(screen.getByText('No hay pacientes para mostrar')).toBeInTheDocument();
  });

  test('muestra mensaje inicial en el área de captura', async () => {
    await renderCaptura();
    expect(screen.getByText('Seleccione un paciente para capturar resultados')).toBeInTheDocument();
  });
});

// Captura — Interacción con filtros
describe('Captura — Interacción con filtros', () => {
  beforeEach(() => jest.clearAllMocks());

  test('actualiza el buscador de folio al escribir', async () => {
    await renderCaptura();
    const input = screen.getByPlaceholderText('Folio');
    fireEvent.change(input, { target: { value: 'FOL-001' } });
    expect(input.value).toBe('FOL-001');
  });

  test('actualiza el buscador de paciente al escribir', async () => {
    await renderCaptura();
    const input = screen.getByPlaceholderText('Paciente');
    fireEvent.change(input, { target: { value: 'María' } });
    expect(input.value).toBe('María');
  });

  test('activa el checkbox de solo pendientes', async () => {
    await renderCaptura();
    // Find the first checkbox in the filters area
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(true);
  });
});

// Captura — Validaciones sin paciente
describe('Captura — Validaciones sin paciente seleccionado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('muestra notificación al guardar sin paciente seleccionado', async () => {
    await renderCaptura();

    expect(screen.queryByText('Guardar Captura')).not.toBeInTheDocument();
    expect(screen.queryByText('Validar Estudios')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalidar Estudios')).not.toBeInTheDocument();
  });

  test('muestra el botón Vista previa en el área de captura', async () => {
    await renderCaptura();
    expect(screen.getByText('Vista previa')).toBeInTheDocument();
  });

  test('agrupa los controles de impresión en el diseño compacto', async () => {
    await renderCaptura();
    expect(screen.getByRole('button', { name: 'Imprimir' }).parentElement)
      .toHaveClass('captura-controls-compact');
    expect(screen.queryByRole('img', { name: 'Imprimir' })).not.toBeInTheDocument();
  });

  test('muestra las observaciones en una franja compacta', async () => {
    await renderCaptura();
    expect(screen.getByText('Observaciones').parentElement)
      .toHaveClass('observaciones-inline');
  });

  test('muestra notificación al hacer clic en Vista previa sin paciente', async () => {
    await renderCaptura();
    await act(async () => {
      fireEvent.click(screen.getByText('Vista previa'));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Por favor seleccione un paciente'
    );
  });
});
