import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// MOCKS 
jest.mock('../../../lib/supabase-client', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: jest.fn(() => mockChain),
    },
  };
});

import ModalAnalito from './modal-analito';
import { supabase } from '../../../lib/supabase-client';

jest.mock('./modal-analito.css', () => ({}));

jest.mock('./modal-referencias', () => ({
  __esModule: true,
  default: () => <div>MockModalReferencias</div>
}));

jest.mock('./modal-documento', () => ({
  __esModule: true,
  default: () => <div>MockModalDocumento</div>
}));

// HELPERS
const setupSupabaseResponse = (data = null, error = null) => {
  const chain = supabase.from();
  chain.single.mockResolvedValue({ data, error });
  chain.maybeSingle.mockResolvedValue({ data, error });
  chain.eq.mockResolvedValue({ data, error });
  return chain;
};

const renderModal = (props = {}) => {
  const defaults = {
    isOpen: true,
    onClose: jest.fn(),
    onGuardar: jest.fn(),
  };
  return render(<ModalAnalito {...defaults} {...props} />);
};

// ModalAnalito — Renderizado
describe('ModalAnalito — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalAnalito isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Crear Analito')).not.toBeInTheDocument();
  });

  test('muestra título "Crear Analito" por defecto', () => {
    renderModal();
    expect(screen.getByText('Crear Analito')).toBeInTheDocument();
  });

  test('muestra título "Editar Analito" en modoEdicion', () => {
    renderModal({ modoEdicion: true });
    expect(screen.getByText('Editar Analito')).toBeInTheDocument();
  });

  test('renderiza los campos base: Clave, Descripción, Tipo de Resultado', () => {
    renderModal();
    expect(screen.getByPlaceholderText('Clave')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descripcion')).toBeInTheDocument();
    expect(screen.getByText('Selecciona una Opción')).toBeInTheDocument();
  });
});

// ModalAnalito — Campos condicionales por tipo
describe('ModalAnalito — Campos condicionales por tipo', () => {
  beforeEach(() => jest.clearAllMocks());

  test('muestra VR-Bajo y VR-Alto al seleccionar Numérico', () => {
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Numerico' } });
    expect(screen.getByText('VR-Bajo')).toBeInTheDocument();
    expect(screen.getByText('VR-Alto')).toBeInTheDocument();
  });

  test('muestra campos de Referencia y Modo al seleccionar Texto', () => {
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Texto' } });
    expect(screen.getByText('Referencia')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Restringido')).toBeInTheDocument();
  });

  test('muestra botón "Agregar Referencias" al seleccionar Valor Referenciado', () => {
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Valor Referenciado' } });
    expect(screen.getByText('Agregar Referencias')).toBeInTheDocument();
  });

  test('muestra botón "Crear Documento" al seleccionar Documento', () => {
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Documento' } });
    expect(screen.getByText('Crear Documento')).toBeInTheDocument();
  });

  test('muestra campos de imagen al seleccionar Imagen', () => {
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Imagen' } });
    expect(screen.getByText('Ancho')).toBeInTheDocument();
    expect(screen.getByText('Alto')).toBeInTheDocument();
    expect(screen.getByText('Guardar Imagen')).toBeInTheDocument();
  });
});

// ModalAnalito — Interacción
describe('ModalAnalito — Interacción', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onClose al hacer clic en el botón ×', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('llama a onClose al hacer clic en Salir', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Salir'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('muestra alert y no llama a onClose si Clave y Descripción están vacíos', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const onClose = jest.fn();
    renderModal({ onClose });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });

    expect(alertMock).toHaveBeenCalledWith('Por favor, complete al menos la Clave y la Descripción');
    expect(onClose).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });
});

// ModalAnalito — Guardado exitoso (insert)
describe('ModalAnalito — Guardado exitoso', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a supabase.insert y cierra el modal al guardar un analito nuevo', async () => {
    const onClose = jest.fn();
    
    setupSupabaseResponse({ id_analito: 99 }, null);

    renderModal({ onClose });

    fireEvent.change(screen.getByPlaceholderText('Clave'), { target: { value: 'GLU' } });
    fireEvent.change(screen.getByPlaceholderText('Descripcion'), { target: { value: 'Glucosa' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });

    expect(supabase.from).toHaveBeenCalledWith('analitos');
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});