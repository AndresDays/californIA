import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout.jsx';
import Header from '../../../components/header-principal.jsx';
import SidebarHome from '../../../components/sidebar-home.jsx';
import './estudios-lab.css';

const EstudiosLab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [totalEstudios, setTotalEstudios] = useState(0);

  const [areas, setAreas] = useState([]);
  const [tiposMuestra, setTiposMuestra] = useState([]);
  const [recipientes, setRecipientes] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [tecnicas, setTecnicas] = useState([]);
  const [equipos, setEquipos] = useState([]);

  const [key, setKey] = useState('');
  const [clave, setClave] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [area, setArea] = useState('');
  const [tipoMuestra, setTipoMuestra] = useState('');
  const [recipiente, setRecipiente] = useState('');
  const [metodo, setMetodo] = useState('');
  const [tecnica, setTecnica] = useState('');
  const [equipo, setEquipo] = useState('');
  const [condicionesPaciente, setCondicionesPaciente] = useState('');
  const [etiquetasExtra, setEtiquetasExtra] = useState('');
  const [diasProceso, setDiasProceso] = useState('');

  const [imprimirMetodo, setImprimirMetodo] = useState(false);
  const [imprimirTecnica, setImprimirTecnica] = useState(false);
  const [imprimirEquipo, setImprimirEquipo] = useState(false);
  const [imprimirMuestra, setImprimirMuestra] = useState(false);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);

  const [empleadoData, setEmpleadoData] = useState(null);

        useEffect(() => {
            const fetchEmpleadoData = async () => {
              if (!user?.id) return;

              try {
                const { data: empleado, error } = await supabase
                  .from('empleados')
                  .select('nombre, rol')
                  .eq('auth_uuid', user.id)
                  .maybeSingle();

                if (error) {
                  console.error('Error al obtener empleado:', error);
                  return;
                }

                if (empleado) {
                  setEmpleadoData(empleado);
                }
              } catch (error) {
                console.error('Error al obtener datos del empleado:', error);
              }
            };

            fetchEmpleadoData();
          }, [user]);

  useEffect(() => {
    cargarCatalogos();
    cargarEstudios();
  }, []);

  useEffect(() => {
    cargarEstudios();
  }, [buscarEstudio]);

  const cargarCatalogos = async () => {
    await Promise.all([
      cargarAreas(),
      cargarTiposMuestra(),
      cargarRecipientes(),
      cargarMetodos(),
      cargarTecnicas(),
      cargarEquipos()
    ]);
  };

  const cargarAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id_area, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
      
      if (data && data.length > 0 && !area) {
        setArea(data[0].nombre);
      }
    } catch (error) {
      console.error('Error al cargar áreas:', error);
    }
  };

  const cargarTiposMuestra = async () => {
    try {
      const { data, error } = await supabase
        .from('tipo_muestra')
        .select('id, categoria')
        .order('categoria', { ascending: true });

      if (error) throw error;
      setTiposMuestra(data || []);
      
      if (data && data.length > 0 && !tipoMuestra) {
        setTipoMuestra(data[0].categoria);
      }
    } catch (error) {
      console.error('Error al cargar tipos de muestra:', error);
    }
  };

  const cargarRecipientes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipientes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setRecipientes(data || []);
      
      if (data && data.length > 0 && !recipiente) {
        setRecipiente(data[0].nombre);
      }
    } catch (error) {
      console.error('Error al cargar recipientes:', error);
    }
  };

  const cargarMetodos = async () => {
    try {
      const { data, error } = await supabase
        .from('metodos')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setMetodos(data || []);
      
      if (data && data.length > 0 && !metodo) {
        setMetodo(data[0].nombre);
      }
    } catch (error) {
      console.error('Error al cargar métodos:', error);
    }
  };

  const cargarTecnicas = async () => {
    try {
      const { data, error } = await supabase
        .from('tecnicas')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setTecnicas(data || []);
      
      if (data && data.length > 0 && !tecnica) {
        setTecnica(data[0].nombre);
      }
    } catch (error) {
      console.error('Error al cargar técnicas:', error);
    }
  };

  const cargarEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos_lab')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
      
      if (data && data.length > 0 && !equipo) {
        setEquipo(data[0].nombre);
      }
    } catch (error) {
      console.error('Error al cargar equipos:', error);
    }
  };

  const cargarEstudios = async () => {
    try {
      let query = supabase
        .from('estudios_lab_catalogo')
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
    setArea(areas.length > 0 ? areas[0].nombre : '');
    setTipoMuestra(tiposMuestra.length > 0 ? tiposMuestra[0].nombre : '');
    setRecipiente(recipientes.length > 0 ? recipientes[0].nombre : '');
    setMetodo(metodos.length > 0 ? metodos[0].nombre : '');
    setTecnica(tecnicas.length > 0 ? tecnicas[0].nombre : '');
    setEquipo(equipos.length > 0 ? equipos[0].nombre : '');
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
        .from('estudios_lab_catalogo')
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
        .from('estudios_lab_catalogo')
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
          .from('estudios_lab_catalogo')
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

  const getPrimerNombre = (nombreCompleto) => {
                     if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
                     return nombreCompleto;
                   };

         const formatRol = (rol) => {
             if (!rol) return 'Usuario';

             const roles = {
               'admin': 'Administrador',
               'administrador': 'Administrador',
               'radiologo': 'Radiólogo - Director',
               'doctor': 'Médico',
               'medico': 'Médico',
               'tecnico_radiologia': 'Técnico en Radiología',
               'tecnico': 'Técnico',
               'quimico': 'Químico',
               'recepcionista': 'Recepcionista',
               'desarrollador': 'Desarrollador'
             };

             return roles[rol] || rol;
           };

       const handleLogout = async () => {
         const { signOut } = useAuth();
         await signOut();
         navigate('/login');
       };

  return (
    <Layout>
      <div className="admin-estudios-wrapper">
        <Header
          empleadoData={empleadoData}
          formatRol={formatRol}
          getPrimerNombre={getPrimerNombre}
          user={user}
          handleLogout={handleLogout}
          currentPage="estudios"
        />

        <SidebarHome/>

        <div className="admin-estudios-header">
          <h1 className="admin-estudios-title">Crear Estudios, Modificarlos o Borrarlos</h1>
        </div>

        <div className="admin-estudios-content">
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
                  {areas.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    areas.map((a) => (
                      <option key={a.id} value={a.nombre}>
                        {a.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="campo-estudio">
                <label>Tipo de Muestra</label>
                <select
                  value={tipoMuestra}
                  onChange={(e) => setTipoMuestra(e.target.value)}
                  className="select-estudio"
                >
                  {tiposMuestra.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    tiposMuestra.map((tm) => (
                      <option key={tm.id} value={tm.categoria}>
                        {tm.categoria}
                      </option>
                    ))
                  )}
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
                  {recipientes.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    recipientes.map((r) => (
                      <option key={r.id} value={r.nombre}>
                        {r.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="campo-estudio">
                <label>Metodo</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="select-estudio"
                >
                  {metodos.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    metodos.map((m) => (
                      <option key={m.id_metodo} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))
                  )}
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
                  {tecnicas.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    tecnicas.map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="campo-estudio">
                <label>Equipo</label>
                <select
                  value={equipo}
                  onChange={(e) => setEquipo(e.target.value)}
                  className="select-estudio"
                >
                  {equipos.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    equipos.map((e) => (
                      <option key={e.id_equipo} value={e.nombre}>
                        {e.nombre}
                      </option>
                    ))
                  )}
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