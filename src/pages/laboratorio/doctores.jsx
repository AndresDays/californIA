import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout';
import Header from '../../components/header-laboratorio.jsx';
import './doctores.css';

const Doctores = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarDoctor, setBuscarDoctor] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [totalDoctores, setTotalDoctores] = useState(0);

  useEffect(() => {
    cargarDoctores();
  }, [buscarDoctor]);

  const cargarDoctores = async () => {
    try {
      let query = supabase
        .from('medicos')
        .select('*', { count: 'exact' });

      // Filtro de búsqueda
      if (buscarDoctor.trim()) {
        query = query.or(
          `nombre.ilike.%${buscarDoctor}%,` +
          `apellido_paterno.ilike.%${buscarDoctor}%,` +
          `apellido_materno.ilike.%${buscarDoctor}%,` +
          `email.ilike.%${buscarDoctor}%`
        );
      }

      const { data, error, count } = await query.order('id_medico', { ascending: true });

      if (error) throw error;

      setTotalDoctores(count || 0);
      
      const doctoresFormateados = data?.map(doctor => ({
        id: doctor.id_medico,
        apellidoPaterno: doctor.apellido_paterno || '',
        apellidoMaterno: doctor.apellido_materno || '',
        nombre: doctor.nombre || '',
        edad: calcularEdad(doctor.fecha_nacimiento),
        sexo: doctor.sexo || '',
        fechaNacimiento: doctor.fecha_nacimiento || '',
        telefono: doctor.telefono || '',
        email: doctor.email || '',
        usuario: doctor.usuario || '',
        contrasena: doctor.contrasena || '',
        fechaRegistro: new Date(doctor.created_at || Date.now()).toLocaleString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      })) || [];

      setDoctores(doctoresFormateados);
    } catch (error) {
      console.error('Error al cargar doctores:', error);
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

  const handleAgregarDoctor = () => {
    alert('Agregar nuevo doctor');
  };

  const handleImprimirTabla = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    alert('Exportar a Excel');
  };

  const handleExportarPDF = () => {
    alert('Exportar a PDF');
  };

  const handleEditarDoctor = (id) => {
    alert(`Editar doctor ${id}`);
  };

  const handleEliminarDoctor = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este doctor?')) {
      try {
        const { error } = await supabase
          .from('medicos')
          .delete()
          .eq('id_medico', id);

        if (error) throw error;

        cargarDoctores();
        alert('Doctor eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar doctor:', error);
        alert('Error al eliminar doctor');
      }
    }
  };

  return (
    <Layout>
      <div className="admin-doctores-wrapper">
        <Header />

        <div className="admin-doctores-header">
          <h1 className="admin-doctores-title">Administrar Doctores</h1>
        </div>

        <div className="admin-doctores-content">
          {/* Controles Superiores */}
          <div className="controles-admin-doctores">
            <div className="botones-accion-doctores">
              <button className="btn-agregar-doctor" onClick={handleAgregarDoctor}>
                Agregar Doctor
              </button>
              <button className="btn-imprimir-tabla-doc" onClick={handleImprimirTabla}>
                Imprimir tabla
              </button>
            </div>
          </div>

          {/* Exportación y Búsqueda */}
          <div className="exportacion-busqueda">
            <div className="botones-exportacion">
              <button className="btn-exportar" onClick={handleExportarExcel}>
                Excel
              </button>
              <button className="btn-exportar" onClick={handleExportarPDF}>
                PDF
              </button>
            </div>

            <div className="busqueda-doctores">
              <label>Buscar:</label>
              <input
                type="text"
                value={buscarDoctor}
                onChange={(e) => setBuscarDoctor(e.target.value)}
                className="input-buscar-doctores"
              />
            </div>
          </div>

          {/* Tabla de Doctores */}
          <div className="tabla-admin-doctores-container">
            <table className="tabla-admin-doctores">
              <thead>
                <tr>
                  <th>Apellido paterno ⬍</th>
                  <th>Apellido Materno ⬍</th>
                  <th>Nombre ⬍</th>
                  <th>Edad ⬍</th>
                  <th>Sexo ⬍</th>
                  <th>Fecha nacimiento ⬍</th>
                  <th>Telefono ⬍</th>
                  <th>Email ⬍</th>
                  <th>Usuario ⬍</th>
                  <th>Contraseña ⬍</th>
                  <th>Fecha registro ⬍</th>
                  <th>Accion ⬍</th>
                </tr>
              </thead>
              <tbody>
                {doctores.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="sin-doctores">
                      No hay doctores para mostrar
                    </td>
                  </tr>
                ) : (
                  doctores.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>{doctor.apellidoPaterno}</td>
                      <td>{doctor.apellidoMaterno}</td>
                      <td>{doctor.nombre}</td>
                      <td>{doctor.edad}</td>
                      <td>{doctor.sexo}</td>
                      <td>{doctor.fechaNacimiento}</td>
                      <td>{doctor.telefono}</td>
                      <td>{doctor.email}</td>
                      <td>{doctor.usuario}</td>
                      <td>{doctor.contrasena}</td>
                      <td>{doctor.fechaRegistro}</td>
                      <td>
                        <div className="acciones-doctores">
                          <button
                            className="btn-editar-doctor"
                            onClick={() => handleEditarDoctor(doctor.id)}
                            title="Editar doctor"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-eliminar-doctor"
                            onClick={() => handleEliminarDoctor(doctor.id)}
                            title="Eliminar doctor"
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

          {/* Contador de Registros */}
          <div className="contador-registros">
            Mostrando registros del 1 al {doctores.length} de un total de {totalDoctores}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Doctores;