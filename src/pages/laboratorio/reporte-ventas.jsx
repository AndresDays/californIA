import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout.jsx';
import Header from '../../components/header-principal.jsx';
import SidebarHome from '../../components/sidebar-home.jsx';
import './reporte-ventas.css';

const ReporteVentas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fechaInicial, setFechaInicial] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('');
  const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState('');
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [doctorSeleccionado, setDoctorSeleccionado] = useState('');

  const [productosVendidos, setProductosVendidos] = useState([
    { color: '#dc3545', porcentaje: 'NaN' },
    { color: '#28a745', porcentaje: 'NaN' },
    { color: '#ffc107', porcentaje: 'NaN' },
    { color: '#17a2b8', porcentaje: 'NaN' },
    { color: '#6c757d', porcentaje: 'NaN' },
    { color: '#007bff', porcentaje: 'NaN' },
    { color: '#6c757d', porcentaje: 'NaN' },
    { color: '#6c757d', porcentaje: 'NaN' },
    { color: '#fd7e14', porcentaje: 'NaN' },
    { color: '#6c757d', porcentaje: 'NaN' }
  ]);

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

  const handleGenerarGraficas = () => {
    alert('Generando gráficas...');
  };

  const handleReporteGeneral = () => {
    alert('Generando Reporte General...');
  };

  const handleReportePorEstudio = () => {
    alert('Generando Reporte por Estudio...');
  };

  const handleReportePorSumatoria = () => {
    alert('Generando Reporte por Sumatoria...');
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
      <div className="reporte-ventas-wrapper">
          <Header
            empleadoData={empleadoData}
            formatRol={formatRol}
            getPrimerNombre={getPrimerNombre}
            user={user}
            handleLogout={handleLogout}
            currentPage="reporte-ventas"
          />
        <SidebarHome/>

        <div className="reporte-ventas-header">
          <h1 className="reporte-ventas-title">Reporte de ventas</h1>
        </div>

        <div className="reporte-ventas-content">
          <div className="controles-reporte-fila1">
            <div className="fecha-grupo-reporte">
              <label>📅 Fecha Inicial:</label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="input-fecha-reporte"
              />
            </div>

            <div className="fecha-grupo-reporte">
              <label>📅 Fecha Final:</label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="input-fecha-reporte"
              />
            </div>

            <select
              value={sucursalSeleccionada}
              onChange={(e) => setSucursalSeleccionada(e.target.value)}
              className="select-reporte"
            >
              <option value="">Todas las Sucursales</option>
              <option value="matriz">Matriz</option>
              <option value="sucursal1">Sucursal 1</option>
            </select>

            <select
              value={vendedorSeleccionado}
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
              className="select-reporte"
            >
              <option value="">Todos los Vendedores</option>
              <option value="vendedor1">Vendedor 1</option>
              <option value="vendedor2">Vendedor 2</option>
            </select>

            <select
              value={formaPagoSeleccionada}
              onChange={(e) => setFormaPagoSeleccionada(e.target.value)}
              className="select-reporte"
            >
              <option value="">Todas las formas de pago</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>

            <select
              value={areaSeleccionada}
              onChange={(e) => setAreaSeleccionada(e.target.value)}
              className="select-reporte"
            >
              <option value="">Selecciona un Area</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="radiologia">Radiología</option>
            </select>
          </div>

          <div className="controles-reporte-fila2">
            <input
              type="text"
              placeholder="Buscar por Estudio..."
              value={buscarEstudio}
              onChange={(e) => setBuscarEstudio(e.target.value)}
              className="input-buscar-estudio-reporte"
            />

            <select
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="select-reporte"
            >
              <option value="">Todas las Empresas</option>
              <option value="issste">ISSSTE</option>
              <option value="imss">IMSS</option>
            </select>

            <select
              value={doctorSeleccionado}
              onChange={(e) => setDoctorSeleccionado(e.target.value)}
              className="select-reporte"
            >
              <option value="">Todos los Doctores</option>
              <option value="doctor1">Doctor 1</option>
              <option value="doctor2">Doctor 2</option>
            </select>

            <button className="btn-generar-graficas" onClick={handleGenerarGraficas}>
              Generar graficas
            </button>
          </div>

          <div className="botones-reportes">
            <button className="btn-reporte verde" onClick={handleReporteGeneral}>
              Reporte General
            </button>
            <button className="btn-reporte verde" onClick={handleReportePorEstudio}>
              Reporte por Estudio
            </button>
            <button className="btn-reporte verde" onClick={handleReportePorSumatoria}>
              Reporte por Sumatoria
            </button>
          </div>

          <div className="area-graficas">
            <div className="grafico-ventas-header">
              <span className="icon-grafico">📊</span>
              <span>Grafico de Ventas</span>
            </div>
            <div className="grafico-ventas-contenido">
            </div>
          </div>

          <div className="secciones-inferiores">
            <div className="productos-vendidos-section">
              <h3 className="titulo-seccion">Productos mas Vendidos</h3>
              <div className="lista-productos">
                {productosVendidos.map((producto, index) => (
                  <div key={index} className="producto-item">
                    <span 
                      className="producto-circulo" 
                      style={{ backgroundColor: producto.color }}
                    ></span>
                    <span className="producto-porcentaje">
                      <span className="icono-flecha">↓</span> % {producto.porcentaje}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ventas-vendedores-section">
              <h3 className="titulo-seccion">Ventas Vendedores</h3>
              <div className="lista-vendedores">
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReporteVentas;