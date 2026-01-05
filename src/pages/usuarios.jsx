import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import Header from '../components/header-principal';
import editarIcono from '../assets/editarIcono.png';
import SidebarHome from '../components/sidebar-home';
import './usuarios.css';

const Usuarios = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [empleadoData, setEmpleadoData] = useState(null);
  const [buscarUsuario, setBuscarUsuario] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

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
    cargarUsuarios();
  }, [paginaActual, registrosPorPagina, buscarUsuario]);

  const cargarUsuarios = async () => {
    try {
      let query = supabase
        .from('empleados')
        .select('*', { count: 'exact' });

      if (buscarUsuario.trim()) {
        query = query.or(
          `nombre.ilike.%${buscarUsuario}%,` +
          `usuario.ilike.%${buscarUsuario}%,` +
          `rol.ilike.%${buscarUsuario}%,` +
          `sucursal.ilike.%${buscarUsuario}%`
        );
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id_empleado', { ascending: true });

      if (error) throw error;

      setTotalUsuarios(count || 0);

      const usuariosFormateados = data?.map(usuario => ({
        id: usuario.id_empleado,
        numero: usuario.id_empleado,
        nombre: usuario.nombre || '',
        usuario: usuario.usuario || '-',
        rol: formatRol(usuario.rol) || '-',
        sucursal: usuario.sucursal || '-',
        estado: usuario.activo ? 'Activado' : 'Desactivado',
        ultimoLogin: usuario.ultimo_login
          ? new Date(usuario.ultimo_login).toLocaleString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-'
      })) || [];

      setUsuarios(usuariosFormateados);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleAgregarUsuario = () => {
    alert('Agregar nuevo usuario');
  };

  const handleEditarUsuario = (id) => {
    alert(`Editar usuario ${id}`);
  };

  const handleEliminarUsuario = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        const { error } = await supabase
          .from('empleados')
          .delete()
          .eq('id_empleado', id);

        if (error) throw error;

        cargarUsuarios();
        alert('Usuario eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalUsuarios) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const irAPagina = (pagina) => {
    setPaginaActual(pagina);
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

  const usuarioInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const usuarioFin = Math.min(paginaActual * registrosPorPagina, totalUsuarios);
  const totalPaginas = Math.ceil(totalUsuarios / registrosPorPagina);

  return (
    <div className="admin-usuarios-wrapper">
      <Header
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="usuarios"
      />

      <SidebarHome />

      <div className="admin-usuarios-header">
        <h1 className="admin-usuarios-title">Administrar usuarios</h1>
      </div>

      <div className="admin-usuarios-content">
        <div className="controles-usuarios-top">
          <button className="btn-agregar-usuario" onClick={handleAgregarUsuario}>
            Agregar usuario
          </button>
        </div>

        <div className="controles-mostrar-buscar">
          <div className="mostrar-registros">
            <span>Mostrar</span>
            <select
              value={registrosPorPagina}
              onChange={(e) => {
                setRegistrosPorPagina(parseInt(e.target.value));
                setPaginaActual(1);
              }}
              className="select-registros"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>registros</span>
          </div>

          <div className="buscar-usuarios-grupo">
            <span>Buscar:</span>
            <input
              type="text"
              value={buscarUsuario}
              onChange={(e) => {
                setBuscarUsuario(e.target.value);
                setPaginaActual(1);
              }}
              className="input-buscar-usuarios"
            />
          </div>
        </div>

        <div className="tabla-usuarios-container">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Ultimo login</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan="8" className="sin-usuarios">
                    No hay usuarios para mostrar
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario, index) => (
                  <tr key={usuario.id}>
                    <td>{usuarioInicio + index}</td>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.usuario}</td>
                    <td>{usuario.rol}</td>
                    <td>{usuario.sucursal}</td>
                    <td>
                      <span className={`estado-badge ${usuario.estado === 'Activado' ? 'activado' : 'desactivado'}`}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td>{usuario.ultimoLogin}</td>
                    <td>
                      <div className="acciones-usuarios">
                        <button
                          className="btn-editar-usuario"
                          onClick={() => handleEditarUsuario(usuario.id)}
                          title="Editar usuario"
                        >
                          <img src={editarIcono} alt="Editar" className="btn-edit-icon" />
                        </button>
                        <button
                          className="btn-eliminar-usuario"
                          onClick={() => handleEliminarUsuario(usuario.id)}
                          title="Eliminar usuario"
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

        <div className="paginacion-inferior">
          <div className="contador-usuarios">
            Mostrando registros del {usuarioInicio} al {usuarioFin} de un total de {totalUsuarios}
          </div>

          <div className="botones-paginacion">
            <button
              className="btn-pag"
              onClick={paginaAnterior}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>

            {[...Array(totalPaginas)].map((_, i) => (
              <button
                key={i + 1}
                className={`btn-pag-numero ${paginaActual === i + 1 ? 'activo' : ''}`}
                onClick={() => irAPagina(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn-pag"
              onClick={paginaSiguiente}
              disabled={paginaActual >= totalPaginas}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;