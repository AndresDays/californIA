import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase-client';
import './modal-referencias.css';

const nuevaReferencia = () => ({
  edad_inicial: '',
  edad_final: '',
  unidad_edad: 'Años',
  sexo: 'Ambos',
  condicion_especial: '',
  vr_bajo: '',
  vr_alto: ''
});

const ModalReferencias = ({ isOpen, onClose, onGuardar }) => {
  const [referencias, setReferencias] = useState([]);
  const [nivelesMar, setNivelesMar] = useState([]);
  const [loadingNiveles, setLoadingNiveles] = useState(false);

  const columnas = useMemo(() => ([
    { key: 'edad_i', label: 'Edad I' },
    { key: 'edad_f', label: 'Edad F' },
    { key: 'unidad', label: 'Unidad' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'condicion', label: 'Condición especial' },
    { key: 'vr_bajo', label: 'VR-Bajo' },
    { key: 'vr_alto', label: 'VR-Alto' },
    { key: 'accion', label: 'Acción' }
  ]), []);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNivelesMar = async () => {
      setLoadingNiveles(true);
      try {
        const { data, error } = await supabase
          .from('niveles_mar')
          .select('nombre')
          .order('nombre', { ascending: true });

        if (error) throw error;
        setNivelesMar(data || []);
      } catch (err) {
        console.error('Error cargando niveles_mar:', err);
        setNivelesMar([]);
      } finally {
        setLoadingNiveles(false);
      }
    };

    fetchNivelesMar();
  }, [isOpen]);

  const agregarReferencia = () => {
    setReferencias((prev) => [...prev, nuevaReferencia()]);
  };

  const borrarTodo = () => setReferencias([]);

  const eliminarReferencia = (index) => {
    setReferencias((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarCampo = (index, campo, valor) => {
    setReferencias((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const handleGuardar = () => {
    if (referencias.length === 0) {
      alert('Agrega al menos una referencia');
      return;
    }

    for (const r of referencias) {
      if (r.edad_inicial === '' || r.edad_final === '') {
        alert('Completa Edad Inicial y Edad Final en todas las filas.');
        return;
      }
    }

    onGuardar(referencias);
    setReferencias([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay-referencias"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-contenedor-referencias" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-referencias">
          <h2>Referencias</h2>
          <button className="modal-btn-cerrar-referencias" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-referencias">
          <div className="acciones-referencias">
            <button
              type="button"
              className="btn-referencias-verde"
              onClick={agregarReferencia}
            >
              Agregar Referencia
            </button>

            <button
              type="button"
              className="btn-referencias-rojo"
              onClick={borrarTodo}
            >
              Borrar Referencias
            </button>
          </div>

          <div className="referencias-top-labels">
            {columnas.map((c) => (
              <div key={c.key} className="top-label">
                {c.label}
              </div>
            ))}
          </div>

          <div className="tabla-referencias-wrapper">
            <table className="tabla-referencias">
              <tbody>
                {referencias.map((ref, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        className="ref-input"
                        value={ref.edad_inicial}
                        onChange={(e) => actualizarCampo(index, 'edad_inicial', e.target.value)}
                        inputMode="numeric"
                      />
                    </td>

                    <td>
                      <input
                        className="ref-input"
                        value={ref.edad_final}
                        onChange={(e) => actualizarCampo(index, 'edad_final', e.target.value)}
                        inputMode="numeric"
                      />
                    </td>

                    <td>
                      <select
                        className="ref-select"
                        value={ref.unidad_edad}
                        onChange={(e) => actualizarCampo(index, 'unidad_edad', e.target.value)}
                      >
                        <option value="Años">Años</option>
                        <option value="Meses">Meses</option>
                        <option value="Días">Días</option>
                      </select>
                    </td>

                    <td>
                      <select
                        className="ref-select"
                        value={ref.sexo}
                        onChange={(e) => actualizarCampo(index, 'sexo', e.target.value)}
                      >
                        <option value="Ambos">Ambos</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>

                    <td>
                      <select
                        className="ref-select"
                        value={ref.condicion_especial}
                        onChange={(e) => actualizarCampo(index, 'condicion_especial', e.target.value)}
                        disabled={loadingNiveles}
                      >
                        <option value="">
                          {loadingNiveles ? 'Cargando...' : 'Condición especial'}
                        </option>

                        {nivelesMar.map((n, i) => (
                          <option key={`${n.nombre}-${i}`} value={n.nombre}>
                            {n.nombre}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        className="ref-input"
                        value={ref.vr_bajo}
                        onChange={(e) => actualizarCampo(index, 'vr_bajo', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        className="ref-input"
                        value={ref.vr_alto}
                        onChange={(e) => actualizarCampo(index, 'vr_alto', e.target.value)}
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-eliminar-ref"
                        onClick={() => eliminarReferencia(index)}
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}

                {referencias.length === 0 && (
                  <tr>
                    <td colSpan={8} className="ref-empty">
                      No hay referencias. Da click en <strong>Agregar Referencia</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer-referencias">
          <button type="button" className="btn-salir-ref" onClick={onClose}>
            Salir
          </button>
          <button type="button" className="btn-guardar-ref" onClick={handleGuardar}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalReferencias;