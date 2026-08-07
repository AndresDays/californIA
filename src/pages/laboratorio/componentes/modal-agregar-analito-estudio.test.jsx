import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalAgregarAnalitoEstudio from './modal-agregar-analito-estudio';
import { reiniciarSesionAnalitos } from '../configuracion/analitos-sesion';

// Mock de CSS
jest.mock('./modal-agregar-analito-estudio.css', () => {});

// Mock de window.alert
global.alert = jest.fn();

// Datos base
const analitosDisponibles = [
  { id_analito: 1, clave: 'GLU', descripcion: 'Glucosa' },
  { id_analito: 2, clave: 'HEM', descripcion: 'Hemoglobina' },
  { id_analito: 3, clave: 'COL', descripcion: 'Colesterol' },
  { id_analito: 4, clave: 'TRI', descripcion: 'Triglicéridos' },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onGuardar: jest.fn(),
  analitosDisponibles,
};

beforeEach(() => reiniciarSesionAnalitos());

// SUITE 1 — Renderizado inicial
describe('ModalAgregarAnalitoEstudio — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Agregar Analitos al Estudio')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByText('Agregar Analitos al Estudio')).toBeInTheDocument();
  });

  test('muestra el input de búsqueda', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByPlaceholderText('Buscar por clave o descripción...')).toBeInTheDocument();
  });

  test('muestra el mensaje inicial para buscar analitos', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByText('Escribe para buscar analitos...')).toBeInTheDocument();
  });

  test('muestra el contador de seleccionados en 0', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByText('Analitos Seleccionados (0)')).toBeInTheDocument();
  });

  test('muestra los botones Cancelar y Agregar', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });

  test('el botón Agregar está deshabilitado cuando no hay seleccionados', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    expect(screen.getByText('Agregar')).toBeDisabled();
  });
});

// SUITE 2 — Búsqueda de analitos
describe('ModalAgregarAnalitoEstudio — Búsqueda', () => {
  beforeEach(() => jest.clearAllMocks());

  test('filtra analitos por clave', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'GLU' },
    });
    expect(screen.getByText('Glucosa')).toBeInTheDocument();
    expect(screen.queryByText('Hemoglobina')).not.toBeInTheDocument();
  });

  test('filtra analitos por descripción', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'colesterol' },
    });
    expect(screen.getByText('Colesterol')).toBeInTheDocument();
    expect(screen.queryByText('Glucosa')).not.toBeInTheDocument();
  });

  test('la búsqueda no distingue entre mayúsculas y minúsculas', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'glu' },
    });
    expect(screen.getByText('Glucosa')).toBeInTheDocument();
  });

  test('muestra mensaje sin resultados cuando no hay coincidencias', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'XYZ' },
    });
    expect(screen.getByText(/No se encontraron analitos con/)).toBeInTheDocument();
  });
});

// SUITE 3 — Selección de analitos
describe('ModalAgregarAnalitoEstudio — Selección', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reiniciarSesionAnalitos();
  });

  const buscarYSeleccionar = (texto) => {
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: texto },
    });
    fireEvent.click(screen.getByText(
      analitosDisponibles.find(a =>
        a.clave.toLowerCase().includes(texto.toLowerCase()) ||
        a.descripcion.toLowerCase().includes(texto.toLowerCase())
      ).descripcion
    ));
  };

  test('seleccionar un analito lo agrega a la lista de seleccionados', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    expect(screen.getByText('Analitos Seleccionados (1)')).toBeInTheDocument();
  });

  test('deseleccionar un analito lo quita de la lista', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    expect(screen.getByText('Analitos Seleccionados (1)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('Glucosa')[0]);
    expect(screen.getByText('Analitos Seleccionados (0)')).toBeInTheDocument();
  });

  test('el botón Agregar se habilita al seleccionar un analito', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    expect(document.querySelector('.btn-guardar-modal')).not.toBeDisabled();
  });

  test('conserva la búsqueda y los analitos seleccionados al volver a montar el modal', () => {
    const { unmount } = render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'GLU' },
    });
    fireEvent.click(screen.getByText('Glucosa'));

    unmount();
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);

    expect(screen.getByPlaceholderText('Buscar por clave o descripción...')).toHaveValue('GLU');
    expect(screen.getByText('Analitos Seleccionados (1)')).toBeInTheDocument();
  });

  test('el botón Limpiar aparece cuando hay analitos seleccionados', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  test('el botón Limpiar vacía la lista de seleccionados', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    fireEvent.click(screen.getByText('Limpiar'));
    expect(screen.getByText('Analitos Seleccionados (0)')).toBeInTheDocument();
  });

  test('remover un analito individual lo quita de la lista', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    buscarYSeleccionar('GLU');
    fireEvent.click(screen.getByTitle('Remover'));
    expect(screen.getByText('Analitos Seleccionados (0)')).toBeInTheDocument();
  });
});

// SUITE 4 — Reordenamiento
describe('ModalAgregarAnalitoEstudio — Reordenamiento', () => {
  beforeEach(() => jest.clearAllMocks());

  const seleccionarDos = () => {
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'G' },
    });
    fireEvent.click(screen.getByText('Glucosa'));
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'H' },
    });
    fireEvent.click(screen.getByText('Hemoglobina'));
  };

  test('el botón Mover arriba está deshabilitado para el primer elemento', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    seleccionarDos();
    const botonesArriba = screen.getAllByTitle('Mover arriba');
    expect(botonesArriba[0]).toBeDisabled();
  });

  test('el botón Mover abajo está deshabilitado para el último elemento', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    seleccionarDos();
    const botonesAbajo = screen.getAllByTitle('Mover abajo');
    expect(botonesAbajo[botonesAbajo.length - 1]).toBeDisabled();
  });

  test('mover abajo cambia el orden de los analitos', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    seleccionarDos();
    fireEvent.click(screen.getAllByTitle('Mover abajo')[0]);
    const items = screen.getAllByText(/GLU|HEM/);
    expect(items[0].textContent).toBe('HEM');
  });
});

// SUITE 5 — Guardar y cerrar
describe('ModalAgregarAnalitoEstudio — Guardar y cerrar', () => {
  beforeEach(() => jest.clearAllMocks());

  test('clic en Cancelar llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalAgregarAnalitoEstudio {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en ✖ llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalAgregarAnalitoEstudio {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✖'));
    expect(onClose).toHaveBeenCalled();
  });

  test('guardar con seleccionados llama a onGuardar con los analitos', () => {
    const onGuardar = jest.fn();
    render(<ModalAgregarAnalitoEstudio {...defaultProps} onGuardar={onGuardar} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'GLU' },
    });
    fireEvent.click(screen.getByText('Glucosa'));
    fireEvent.click(document.querySelector('.btn-guardar-modal'));
    expect(onGuardar).toHaveBeenCalledWith([analitosDisponibles[0]]);
  });

  test('después de guardar se limpia la selección y la búsqueda', () => {
    render(<ModalAgregarAnalitoEstudio {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por clave o descripción...'), {
      target: { value: 'GLU' },
    });
    fireEvent.click(screen.getByText('Glucosa'));
    fireEvent.click(document.querySelector('.btn-guardar-modal'));
    expect(screen.getByPlaceholderText('Buscar por clave o descripción...').value).toBe('');
    expect(screen.getByText('Analitos Seleccionados (0)')).toBeInTheDocument();
  });
});
