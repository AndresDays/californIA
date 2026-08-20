import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page-layout.jsx';
import ModalConfirmarEliminacion from '../../components/ModalConfirmarEliminacion.jsx';
import { useEmpleadoActual } from '../../hooks/use-empleado-actual';
import { supabase } from '../../lib/supabase-client';
import { useClientes } from '../../hooks/use-clientes';
import { useBusquedaPersistente } from '../../hooks/use-busqueda-persistente';
import {
  buscarDuplicadoRegistro,
  crearMensajeRegistroDuplicado,
} from '../../utils/duplicados-registro.js';
import './clientes.css';
import ModalAgregarPaciente from './componentes/modal-agregar-paciente.jsx';
import { useModalPersistente } from '../../hooks/use-campo-persistente';

const Clientes = () => {
  const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [buscarCliente, setBuscarCliente] = useBusquedaPersistente('clientes:termino');
  const [paginaActual, setPaginaActual] = useState(1);
  const [pacienteEditar, setPacienteEditar] = useState(null);
  // Si el navegador descarta la página, el modal se reabre con lo capturado en
  // lugar de dejar al usuario en la lista creyendo que perdió el alta.
  const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] = useModalPersistente(
    'modal-paciente:abierto:clientes',
    { persistir: !pacienteEditar },
  );
  const [duplicadoPendiente, setDuplicadoPendiente] = useState(null);
  const clientesPorPagina = 500;

  const { data: clientesResult } = useClientes({ buscar: buscarCliente, pagina: paginaActual, porPagina: clientesPorPagina });
  const totalClientes = clientesResult?.count ?? 0;
  const clientesRaw = clientesResult?.data ?? [];

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

  const clientes = clientesRaw.map(cliente => ({
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
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }));

  const refrescarClientes = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes-lista'] });
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
    const insertarPaciente = async () => {
      const { error } = await supabase
        .from('pacientes')
        .insert([pacienteData]);

      if (error) throw error;
      globalThis.mostrarNotificacion('Cliente guardado correctamente');
      refrescarClientes();
      setModalAgregarPacienteOpen(false);
    };

    try {
      if (isEditMode) {
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
        globalThis.mostrarNotificacion('Cliente actualizado correctamente');
      } else {
        const duplicado = await buscarDuplicadoRegistro({
          supabase,
          tabla: 'pacientes',
          registro: pacienteData,
          idCampo: 'id_paciente',
        });
        if (duplicado) {
          setDuplicadoPendiente({
            mensaje: crearMensajeRegistroDuplicado({ tipo: 'paciente', duplicado }),
            onConfirm: insertarPaciente,
          });
          return;
        }

        await insertarPaciente();
      }

      if (isEditMode) {
        refrescarClientes();
        setModalAgregarPacienteOpen(false);
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      globalThis.mostrarNotificacion('Error al guardar cliente: ' + error.message, 'error');
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

  const clienteInicio = totalClientes ? (paginaActual - 1) * clientesPorPagina + 1 : 0;
  const clienteFin = Math.min(paginaActual * clientesPorPagina, totalClientes);

  return (
    <PageLayout
      empleadoData={empleadoData}
      formatRol={formatRol}
      getPrimerNombre={getPrimerNombre}>

      <div className="admin-clientes-wrapper">
        <div className="admin-clientes-header">
          <h1 className="admin-clientes-title">Administrar Clientes</h1>
        </div>

        <div className="admin-clientes-content">
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
        <ModalConfirmarEliminacion
          isOpen={Boolean(duplicadoPendiente)}
          onClose={() => setDuplicadoPendiente(null)}
          onConfirm={() => duplicadoPendiente?.onConfirm?.()}
          titulo="Registro duplicado"
          mensaje={duplicadoPendiente?.mensaje}
          textoConfirmar="Agregar de todos modos"
          textoCancelar="Cancelar"
          mostrarAdvertencia={false}
        />
      </div>

    </PageLayout>
  );
};

export default Clientes;
