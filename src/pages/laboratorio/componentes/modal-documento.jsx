import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './modal-documento.css';

const ModalDocumento = ({
  isOpen,
  onClose,
  onGuardar,
  titulo = 'Crear Documento',
  htmlInicial = '',
  modoEdicion = false
}) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setHtml(htmlInicial || '');
  }, [isOpen, htmlInicial]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleGuardarSalir = () => {
    if (typeof onGuardar === 'function') onGuardar(html);
    onClose();
  };

  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ align: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ color: [] }, { background: [] }],
      ['clean'],
      ['code-block'],
    ],
    clipboard: { matchVisual: false },
  }), []);

  const formats = useMemo(() => ([
    'bold', 'italic', 'underline',
    'align',
    'script',
    'size',
    'color', 'background',
    'clean',
    'code-block'
  ]), []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-documento" onClick={handleOverlayClick}>
      <div className="modal-contenedor-documento" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-documento">
          <h2 className="modal-titulo-documento">
            {modoEdicion ? 'Editar Documento' : titulo}
          </h2>
          <button className="modal-btn-cerrar-documento" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-documento">
          <div className="editor-wrapper">
            <ReactQuill
              theme="snow"
              value={html}
              onChange={setHtml}
              modules={modules}
              formats={formats}
            />
          </div>
        </div>

        <div className="modal-footer-documento">
          <button className="btn-guardar-salir-documento" onClick={handleGuardarSalir}>
            Guardar/Salir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDocumento;