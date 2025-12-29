import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout';
import Header from '../../components/header-laboratorio.jsx';
import ModalAgregarPaciente from './componentes/modal-agregar-paciente.jsx';
import './Clientes.css';

const Clientes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarCliente, setBuscarCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] = useState(false);
  const [pacienteEditar, setPacienteEditar] = useState(null);
  const clientesPorPagina = 500;

  useEffect(() => {
    cargarClientes();
  }, [paginaActual, buscarCliente]);

  const cargarClientes = async () => {
    try {
      let query = supabase
        .from('pacientes')
        .select('*', { count: 'exact' });

      // Filtro de búsqueda
      if (buscarCliente.trim()) {
        query = query.or(
          `nombre.ilike.%${buscarCliente}%,` +
          `apellido_paterno.ilike.%${buscarCliente}%,` +
          `apellido_materno.ilike.%${buscarCliente}%,` +
          `email.ilike.%${buscarCliente}%`
        );
      }

      // Paginación
      const desde = (paginaActual - 1) * clientesPorPagina;
      const hasta = desde + clientesPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id_paciente', { ascending: true });

      if (error) throw error;

      setTotalClientes(count || 0);
      
      const clientesFormateados = data?.map(cliente => ({
        id: cliente.id_paciente,
        apellidoPaterno: cliente.apellido_paterno || '',
        apellidoMaterno: cliente.apellido_materno || '',
        nombre: cliente.primer_nombre || cliente.nombre || '',
        edad: calcularEdad(cliente.fecha_nacimiento),
        sexo: cliente.sexo || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        fechaNacimiento: cliente.fecha_nacimiento || '',
        direccion: cliente.direccion || '',
        cedula: cliente.cedula || '',
        condicionEspecial: cliente.condicion_especial || '',
        pais: cliente.pais || 'México',
        fechaRegistro: new Date(cliente.created_at || Date.now()).toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      })) || [];

      setClientes(clientesFormateados);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleAgregarCliente = () => {
    setPacienteEditar(null);
    setModalAgregarPacienteOpen(true);
  };

  const handleEditarCliente = (cliente) => {
    setPacienteEditar(cliente);
    setModalAgregarPacienteOpen(true);
  };

  const handleGuardarPacienteModal = async (pacienteData, isEditMode) => {
    try {
      if (isEditMode) {
        // Actualizar paciente existente
        const { error } = await supabase
          .from('pacientes')
          .update({
            nombre: pacienteData.nombre,
            apellido_paterno: pacienteData.apellido_paterno,
            apellido_materno: pacienteData.apellido_materno,
            primer_nombre: pacienteData.primer_nombre,
            fecha_nacimiento: pacienteData.fecha_nacimiento,
            edad: pacienteData.edad,
            sexo: pacienteData.sexo,
            direccion: pacienteData.direccion,
            cedula: pacienteData.cedula,
            condicion_especial: pacienteData.condicion_especial,
            email: pacienteData.email,
            pais: pacienteData.pais,
            telefono: pacienteData.telefono,
            updated_at: new Date().toISOString()
          })
          .eq('id_paciente', pacienteData.id);

        if (error) throw error;
        alert('Cliente actualizado correctamente');
      } else {
        // Crear nuevo paciente
        const { error } = await supabase
          .from('pacientes')
          .insert([pacienteData]);

        if (error) throw error;
        alert('Cliente guardado correctamente');
      }

      cargarClientes();
      setModalAgregarPacienteOpen(false);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar cliente: ' + error.message);
    }
  };

  const handleImprimirTabla = () => {
    window.print();
  };

  const paginaSiguiente = () => {
    if (paginaActual * clientesPorPagina < totalClientes) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const clienteInicio = (paginaActual - 1) * clientesPorPagina + 1;
  const clienteFin = Math.min(paginaActual * clientesPorPagina, totalClientes);

  return (
    <Layout>
      <div className="admin-clientes-wrapper">
        <Header />

        <div className="admin-clientes-header">
          <h1 className="admin-clientes-title">Administrar Clientes</h1>
        </div>

        <div className="admin-clientes-content">
          {/* Controles Superiores */}
          <div className="controles-admin-clientes">
            <div className="botones-accion-admin">
              <button className="btn-agregar-cliente" onClick={handleAgregarCliente}>
                Agregar Cliente
              </button>
              <button className="btn-imprimir-tabla" onClick={handleImprimirTabla}>
                Imprimir tabla
              </button>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="busqueda-admin">
            <input
              type="text"
              placeholder="Busca Clientes Aqui..."
              value={buscarCliente}
              onChange={(e) => {
                setBuscarCliente(e.target.value);
                setPaginaActual(1);
              }}
              className="input-buscar-admin"
            />
          </div>

          {/* Paginación Superior */}
          <div className="paginacion-superior">
            <button 
              className="btn-paginacion"
              onClick={paginaAnterior}
              disabled={paginaActual === 1}
            >
              &#8249;
            </button>
            <span className="info-paginacion">
              Mostrando: {clienteInicio}-{clienteFin} de {totalClientes}
            </span>
            <button 
              className="btn-paginacion"
              onClick={paginaSiguiente}
              disabled={paginaActual * clientesPorPagina >= totalClientes}
            >
              &#8250;
            </button>
          </div>

          {/* Tabla de Clientes */}
          <div className="tabla-admin-clientes-container">
            <table className="tabla-admin-clientes">
              <thead>
                <tr>
                  <th>id</th>
                  <th>Apellido paterno</th>
                  <th>Apellido Materno</th>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Sexo</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>Fecha Registro</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="sin-clientes">
                      No hay clientes para mostrar
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.id}</td>
                      <td>{cliente.apellidoPaterno}</td>
                      <td>{cliente.apellidoMaterno}</td>
                      <td>{cliente.nombre}</td>
                      <td>{cliente.edad} años</td>
                      <td>{cliente.sexo}</td>
                      <td>{cliente.telefono}</td>
                      <td>{cliente.email}</td>
                      <td>{cliente.fechaRegistro}</td>
                      <td>
                        <button
                          className="btn-editar-cliente"
                          onClick={() => handleEditarCliente(cliente)}
                          title="Editar cliente"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <ModalAgregarPaciente
          isOpen={modalAgregarPacienteOpen}
          onClose={() => setModalAgregarPacienteOpen(false)}
          onGuardar={handleGuardarPacienteModal}
          pacienteEditar={pacienteEditar}
        />

      </div>
    </Layout>
  );
};

export default Clientes;