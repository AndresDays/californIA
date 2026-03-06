import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Header from '../../../components/header-principal';
import SidebarHome from '../../../components/sidebar-home';
import './VisorDicom.css';

import scrollIcon from '../../../assets/scrollIcono.png';
import ampliarIcon from '../../../assets/lupaIcono.png';
import moverIcon from '../../../assets/moverIcono.png';
import anguloIcono from '../../../assets/anguloIcono.png';
import restaurarIcon from '../../../assets/restaurarIcono.png';
import cineIcon from '../../../assets/cineIcono.png';
import descargarIcon from '../../../assets/descargarIcono.png';
import reporteIcon from '../../../assets/editarIcono.png';
import capturaIcon from '../../../assets/imprimirIcono.png';
import informacionIcon from '../../../assets/informacionIcono.png';
import compartirIcon from '../../../assets/compartirIcono.png';
import formatoIcon from '../../../assets/formatoIcono.png';

const VisorDicom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { estudoId } = useParams();

  const [empleadoData, setEmpleadoData] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [imagenActual, setImagenActual] = useState(0);
  const [zoom, setZoom] = useState(28);
  const [herramientaActiva, setHerramientaActiva] = useState('scroll');
  const [serieActual, setSerieActual] = useState(1);

  // Datos del paciente (ejemplo)
  const pacienteInfo = {
    nombre: 'GUTIERREZ AGUIRRE, BLANCA JUDITH',
    sexo: 'Femenino',
    fechaNacimiento: 'Aug 13, 1980',
    fecha: 'Mar 3, 2026 08:20:31'
  };

  const serieInfo = {
    numero: 1,
    resolucion: '3072 x 2560',
    dimensiones: 'W: 10075 L: 8555',
    compresion: 'Lossless / Uncompressed'
  };

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
    cargarImagenes();
  }, []);

  const cargarImagenes = () => {
    // Aquí cargarías las imágenes DICOM reales
    // Por ahora uso placeholders
    const imagenesEjemplo = [
      { id: 1, url: '/placeholder-radiografia.jpg', serie: 1 },
      { id: 2, url: '/placeholder-reporte.jpg', serie: 2 }
    ];
    setImagenes(imagenesEjemplo);
  };

  const handleHerramienta = (herramienta) => {
    setHerramientaActiva(herramienta);
  };

  const handleImagenAnterior = () => {
    if (imagenActual > 0) {
      setImagenActual(imagenActual - 1);
    }
  };

  const handleImagenSiguiente = () => {
    if (imagenActual < imagenes.length - 1) {
      setImagenActual(imagenActual + 1);
    }
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
    <div className="visor-dicom-wrapper">
      <Header
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="visor"
      />

      <SidebarHome />

      <div className="visor-dicom-content">
        {/* Barra de herramientas superior */}
        <div className="toolbar-superior">
          <button 
            className="btn-volver"
            onClick={() => navigate(-1)}
            title="Volver"
          >
            ← Atrás
          </button>

          <div className="herramientas-grupo">
            <button 
              className={`btn-herramienta ${herramientaActiva === 'imagenes' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('imagenes')}
              title="Más imágenes"
            >
              <span className="icon-grid">⊞</span>
              Más imágenes
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'scroll' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('scroll')}
              title="Scroll"
            >
              ☰ Scroll
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'ampliar' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('ampliar')}
              title="Ampliar"
            >
              🔍 Ampliar
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'wl' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('wl')}
              title="W/L"
            >
              ⚪ W/L
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'mover' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('mover')}
              title="Mover"
            >
              ✥ Mover
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'datos' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('datos')}
              title="Datos"
            >
              ≡ Datos
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'longitud' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('longitud')}
              title="Longitud"
            >
              📏 Longitud
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'annotate' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('annotate')}
              title="Annotate"
            >
              ✎ Annotate
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'angulo' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('angulo')}
              title="Ángulo"
            >
              ∠ Ángulo
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'restaurar' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('restaurar')}
              title="Restaurar"
            >
              ⟲ Restaurar
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'cine' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('cine')}
              title="CINE"
            >
              ▶ CINE
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'descargar' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('descargar')}
              title="Descargar"
            >
              ↓ Descargar
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'mas' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('mas')}
              title="Más"
            >
              ⋮ Más
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'detalle' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('detalle')}
              title="Detalle"
            >
              ⓘ Detalle
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'reporte' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('reporte')}
              title="Reporte"
            >
              ✎ Reporte
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'captura' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('captura')}
              title="Captura"
            >
              □ Captura
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'informacion' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('informacion')}
              title="Información"
            >
              ≣ Información
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'compartir' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('compartir')}
              title="Compartir"
            >
              ⇄ Compartir
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'atajos' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('atajos')}
              title="Atajos"
            >
              ⌨ Atajos
            </button>

            <button 
              className={`btn-herramienta ${herramientaActiva === 'formato' ? 'activo' : ''}`}
              onClick={() => handleHerramienta('formato')}
              title="Formato"
            >
              ⊞ Formato
            </button>
          </div>

          <button className="btn-medidas">
            ⌨ Medidas
          </button>
        </div>

        {/* Contenedor principal */}
        <div className="visor-container">
          {/* Panel izquierdo - Miniaturas */}
          <div className="panel-miniaturas">
            <button className="btn-expandir-miniaturas">
              ▲
            </button>

            <div className="lista-miniaturas">
              {imagenes.map((imagen, index) => (
                <div 
                  key={imagen.id}
                  className={`miniatura-item ${imagenActual === index ? 'activa' : ''}`}
                  onClick={() => setImagenActual(index)}
                >
                  <div className="miniatura-preview">
                    {index === 0 ? (
                      <div className="miniatura-placeholder">
                        <span className="miniatura-numero">S: {imagen.serie}</span>
                      </div>
                    ) : (
                      <div className="miniatura-reporte">
                        <span className="icono-reporte">📄</span>
                        <span className="texto-reporte">Reporte</span>
                      </div>
                    )}
                  </div>
                  <div className="miniatura-info">
                    <span className="miniatura-serie">S: {imagen.serie}</span>
                    <span className="miniatura-imagenes">📷 1</span>
                  </div>
                  <button className="btn-eliminar-miniatura">🗑</button>
                </div>
              ))}
            </div>

            <button className="btn-expandir-miniaturas-bottom">
              ▼
            </button>
          </div>

          {/* Visor central */}
          <div className="visor-principal">
            {/* Info del paciente */}
            <div className="info-paciente-overlay">
              <div className="info-paciente-texto">
                <p className="paciente-nombre">{pacienteInfo.nombre}</p>
                <p className="paciente-detalles">{pacienteInfo.sexo},</p>
                <p className="paciente-detalles">{pacienteInfo.fechaNacimiento}</p>
              </div>
              <div className="info-fecha">
                <p>{pacienteInfo.fecha}</p>
              </div>
            </div>

            {/* Imagen DICOM */}
            <div className="imagen-container">
              {imagenActual === 0 ? (
                <div className="imagen-placeholder">
                  <span className="marcador-lado">R</span>
                  {/* Aquí iría la imagen DICOM real */}
                  <div className="imagen-dicom-simulada"></div>
                </div>
              ) : (
                <div className="reporte-container">
                  <span className="icono-reporte-grande">📄</span>
                  <span className="texto-reporte-grande">Reporte</span>
                </div>
              )}
            </div>

            {/* Info de serie */}
            <div className="info-serie-overlay">
              <p>Ser: {serieInfo.numero}</p>
              <p>{serieInfo.resolucion}</p>
              <p className="zoom-info">Zoom: {zoom}%</p>
              <p>{serieInfo.dimensiones}</p>
              <p>{serieInfo.compresion}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisorDicom;