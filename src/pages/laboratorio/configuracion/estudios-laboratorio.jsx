import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import './estudios-lab.css';

const EstudiosLab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [totalEstudios, setTotalEstudios] = useState(0);

  // Campos del formulario
  const [key, setKey] = useState('');
  const [clave, setClave] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [area, setArea] = useState('ANTIGENO COVID');
  const [tipoMuestra, setTipoMuestra] = useState('Cateter');
  const [recipiente, setRecipiente] = useState('Frasco');
  const [metodo, setMetodo] = useState('Floculación');
  const [tecnica, setTecnica] = useState('Tinción Especial');
  const [equipo, setEquipo] = useState('Biobas 10');
  const [condicionesPaciente, setCondicionesPaciente] = useState('');
  const [etiquetasExtra, setEtiquetasExtra] = useState('');
  const [diasProceso, setDiasProceso] = useState('');

  // Checkboxes
  const [imprimirMetodo, setImprimirMetodo] = useState(false);
  const [imprimirTecnica, setImprimirTecnica] = useState(false);
  const [imprimirEquipo, setImprimirEquipo] = useState(false);
  const [imprimirMuestra, setImprimirMuestra] = useState(false);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);

  useEffect(() => {
    cargarEstudios();
  }, [buscarEstudio]);

  const cargarEstudios = async () => {
    try {
      let query = supabase
        .from('estudios_catalogo')
        .select('*', { count: 'exact' });

      if (buscarEstudio.trim()) {
        query = query.or(
          `clave.ilike.%${buscarEstudio}%,` +
          `descripcion.ilike.%${buscarEstudio}%,` +
          `area.ilike.%${buscarEstudio}%`
        );
      }

      const { data, error, count } = await query.order('id', { ascending: true });

      if (error) throw error;

      setTotalEstudios(count || 0);
      setEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const limpiarFormulario = () => {
    setKey('');
    setClave('');
    setDescripcion('');
    setArea('ANTIGENO COVID');
    setTipoMuestra('Cateter');
    setRecipiente('Frasco');
    setMetodo('Floculación');
    setTecnica('Tinción Especial');
    setEquipo('Biobas 10');
    setCondicionesPaciente('');
    setEtiquetasExtra('');
    setDiasProceso('');
    setImprimirMetodo(false);
    setImprimirTecnica(false);
    setImprimirEquipo(false);
    setImprimirMuestra(false);
    setModoEdicion(false);
    setEstudioSeleccionado(null);
  };

  const handleGuardar = async () => {
    try {
      const estudioData = {
        key,
        clave,
        descripcion,
        area,
        tipo_muestra: tipoMuestra,
        recipiente,
        metodo,
        tecnica,
        equipo,
        condiciones_paciente: condicionesPaciente,
        etiquetas_extra: etiquetasExtra,
        dias_proceso: parseInt(diasProceso) || 0,
        imprimir_metodo: imprimirMetodo,
        imprimir_tecnica: imprimirTecnica,
        imprimir_equipo: imprimirEquipo,
        imprimir_muestra: imprimirMuestra
      };

      const { error } = await supabase
        .from('estudios_catalogo')
        .insert([estudioData]);

      if (error) throw error;

      alert('Estudio guardado correctamente');
      limpiarFormulario();
      cargarEstudios();
    } catch (error) {
      console.error('Error al guardar estudio:', error);
      alert('Error al guardar estudio');
    }
  };

  const handleEditar = async () => {
    if (!estudioSeleccionado) return;

    try {
      const estudioData = {
        key,
        clave,
        descripcion,
        area,
        tipo_muestra: tipoMuestra,
        recipiente,
        metodo,
        tecnica,
        equipo,
        condiciones_paciente: condicionesPaciente,
        etiquetas_extra: etiquetasExtra,
        dias_proceso: parseInt(diasProceso) || 0,
        imprimir_metodo: imprimirMetodo,
        imprimir_tecnica: imprimirTecnica,
        imprimir_equipo: imprimirEquipo,
        imprimir_muestra: imprimirMuestra
      };

      const { error } = await supabase
        .from('estudios_catalogo')
        .update(estudioData)
        .eq('id', estudioSeleccionado);

      if (error) throw error;

      alert('Estudio actualizado correctamente');
      limpiarFormulario();
      cargarEstudios();
    } catch (error) {
      console.error('Error al actualizar estudio:', error);
      alert('Error al actualizar estudio');
    }
  };

  const handleNuevo = () => {
    limpiarFormulario();
  };

  const cargarEstudioParaEditar = (estudio) => {
    setKey(estudio.key || '');
    setClave(estudio.clave || '');
    setDescripcion(estudio.descripcion || '');
    setArea(estudio.area || '');
    setTipoMuestra(estudio.tipo_muestra || '');
    setRecipiente(estudio.recipiente || '');
    setMetodo(estudio.metodo || '');
    setTecnica(estudio.tecnica || '');
    setEquipo(estudio.equipo || '');
    setCondicionesPaciente(estudio.condiciones_paciente || '');
    setEtiquetasExtra(estudio.etiquetas_extra || '');
    setDiasProceso(estudio.dias_proceso || '');
    setImprimirMetodo(estudio.imprimir_metodo || false);
    setImprimirTecnica(estudio.imprimir_tecnica || false);
    setImprimirEquipo(estudio.imprimir_equipo || false);
    setImprimirMuestra(estudio.imprimir_muestra || false);
    setModoEdicion(true);
    setEstudioSeleccionado(estudio.id);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este estudio?')) {
      try {
        const { error } = await supabase
          .from('estudios_catalogo')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Estudio eliminado correctamente');
        cargarEstudios();
      } catch (error) {
        console.error('Error al eliminar estudio:', error);
        alert('Error al eliminar estudio');
      }
    }
  };

  const handleExportarExcel = () => {
    alert('Exportar a Excel');
  };

  const handleExportarPDF = () => {
    alert('Exportar a PDF');
  };

  return (
    <Layout>
      <div className="admin-estudios-wrapper">
        <Header />

        <div className="admin-estudios-header">
          <h1 className="admin-estudios-title">Crear Estudios, Modificarlos o Borrarlos</h1>
        </div>

        <div className="admin-estudios-content">
          {/* Panel Izquierdo - Formulario */}
          <div className="panel-formulario-estudios">
            <div className="campo-estudio">
              <label>Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="input-estudio"
              />
            </div>

            <div className="campo-estudio">
              <label>Clave</label>
              <input
                type="text"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="input-estudio"
              />
            </div>

            <div className="campo-estudio">
              <label>Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="input-estudio"
              />
            </div>

            <div className="campo-estudio-doble">
              <div className="campo-estudio">
                <label>Area</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="select-estudio"
                >
                  <option value="ANTIGENO COVID">ANTIGENO COVID</option>
                  <option value="QUÍMICA CLÍNICA">QUÍMICA CLÍNICA</option>
                  <option value="HEMATOLOGÍA">HEMATOLOGÍA</option>
                  <option value="INMUNOLOGÍA">INMUNOLOGÍA</option>
                </select>
              </div>

              <div className="campo-estudio">
                <label>Tipo de Muestra</label>
                <select
                  value={tipoMuestra}
                  onChange={(e) => setTipoMuestra(e.target.value)}
                  className="select-estudio"
                >
                  <option value="Cateter">Cateter</option>
                  <option value="Sangre">Sangre</option>
                  <option value="Orina">Orina</option>
                  <option value="Suero">Suero</option>
                </select>
              </div>
            </div>

            <div className="campo-estudio-doble">
              <div className="campo-estudio">
                <label>Recipiente</label>
                <select
                  value={recipiente}
                  onChange={(e) => setRecipiente(e.target.value)}
                  className="select-estudio"
                >
                  <option value="Frasco">Frasco</option>
                  <option value="Tubo">Tubo</option>
                  <option value="Jeringa">Jeringa</option>
                </select>
              </div>

              <div className="campo-estudio">
                <label>Metodo</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="select-estudio"
                >
                  <option value="Floculación">Floculación</option>
                  <option value="Espectrofotometría">Espectrofotometría</option>
                  <option value="Colorimetría">Colorimetría</option>
                </select>
              </div>
            </div>

            <div className="campo-estudio-doble">
              <div className="campo-estudio">
                <label>Tecnica</label>
                <select
                  value={tecnica}
                  onChange={(e) => setTecnica(e.target.value)}
                  className="select-estudio"
                >
                  <option value="Tinción Especial">Tinción Especial</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatizada">Automatizada</option>
                </select>
              </div>

              <div className="campo-estudio">
                <label>Equipo</label>
                <select
                  value={equipo}
                  onChange={(e) => setEquipo(e.target.value)}
                  className="select-estudio"
                >
                  <option value="Biobas 10">Biobas 10</option>
                  <option value="Analizador">Analizador</option>
                  <option value="Microscopio">Microscopio</option>
                </select>
              </div>
            </div>

            <div className="campo-estudio">
              <label>Condiciones Del Paciente</label>
              <textarea
                value={condicionesPaciente}
                onChange={(e) => setCondicionesPaciente(e.target.value)}
                className="textarea-estudio"
                rows="3"
              />
            </div>

            <div className="campo-estudio">
              <label>Etiquetas Extra</label>
              <textarea
                value={etiquetasExtra}
                onChange={(e) => setEtiquetasExtra(e.target.value)}
                className="textarea-estudio"
                rows="3"
              />
            </div>

            <div className="campo-estudio">
              <label>Dias de Proceso</label>
              <input
                type="number"
                value={diasProceso}
                onChange={(e) => setDiasProceso(e.target.value)}
                className="input-estudio"
              />
            </div>

            <div className="checkboxes-impresion">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={imprimirMetodo}
                  onChange={(e) => setImprimirMetodo(e.target.checked)}
                />
                <span>Imprimir Metodo</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={imprimirTecnica}
                  onChange={(e) => setImprimirTecnica(e.target.checked)}
                />
                <span>Imprimir Tecnica</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={imprimirEquipo}
                  onChange={(e) => setImprimirEquipo(e.target.checked)}
                />
                <span>Imprimir Equipo</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={imprimirMuestra}
                  onChange={(e) => setImprimirMuestra(e.target.checked)}
                />
                <span>Imprimir Muestra</span>
              </label>
            </div>

            <div className="botones-formulario">
              <button className="btn-guardar-estudio" onClick={handleGuardar}>
                Guardar Estudio
              </button>
              <button className="btn-editar-estudio" onClick={handleEditar}>
                Editar
              </button>
              <button className="btn-nuevo-estudio" onClick={handleNuevo}>
                Nuevo
              </button>
            </div>
          </div>

          {/* Panel Derecho - Tabla */}
          <div className="panel-tabla-estudios">
            <div className="controles-tabla-estudios">
              <input
                type="text"
                placeholder="Busca Estudios Aqui..."
                value={buscarEstudio}
                onChange={(e) => setBuscarEstudio(e.target.value)}
                className="input-buscar-estudios-adm"
              />

              <div className="botones-exportar-estudios">
                <button className="btn-exportar-est" onClick={handleExportarExcel}>
                  Excel
                </button>
                <button className="btn-exportar-est" onClick={handleExportarPDF}>
                  PDF
                </button>
              </div>
            </div>

            <div className="tabla-estudios-adm-container">
              <table className="tabla-estudios-adm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Clave ⬍</th>
                    <th>Descripcion ⬍</th>
                    <th>Area ⬍</th>
                    <th>Acciones ⬍</th>
                  </tr>
                </thead>
                <tbody>
                  {estudios.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="sin-estudios-adm">
                        No hay estudios para mostrar
                      </td>
                    </tr>
                  ) : (
                    estudios.map((estudio, index) => (
                      <tr key={estudio.id}>
                        <td>{index + 1}</td>
                        <td>{estudio.clave}</td>
                        <td>{estudio.descripcion}</td>
                        <td>{estudio.area}</td>
                        <td>
                          <div className="acciones-estudios-adm">
                            <button
                              className="btn-editar-estudio-tabla"
                              onClick={() => cargarEstudioParaEditar(estudio)}
                              title="Editar estudio"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-eliminar-estudio-tabla"
                              onClick={() => handleEliminar(estudio.id)}
                              title="Eliminar estudio"
                            >
                              ✖
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="contador-estudios">
              Mostrando registros del 1 al {estudios.length} de un total de {totalEstudios}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EstudiosLab;