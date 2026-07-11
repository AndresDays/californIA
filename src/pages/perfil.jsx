import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import { useSessionStore } from '../store/session-store';
import { esEmailValido, esTelefono10Digitos, normalizarTelefono10 } from '../utils/form-validations';
import Header from '../components/header-principal';
import Sidebar from '../components/sidebar';
import SidebarHome from '../components/sidebar-home';
import ModalNotificacion from '../components/ModalNotificacion';
import useSidebar from '../utils/use-sidebar';
import './perfil.css';

const PERFIL_TABS = [
  { id: 'datos', label: 'Datos personales' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'firma', label: 'Firma digital' }
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const Perfil = () => {
  const { user, signOut } = useAuth();
  const setEmpleadoGlobal = useSessionStore((state) => state.setEmpleadoData);
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const canvasRef = useRef(null);
  const menuRef = useRef(null);

  const [empleadoData, setEmpleadoData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabActiva, setTabActiva] = useState('datos');
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    tipoUsuario: '',
    nuevaContrasena: '',
    confirmarContrasena: ''
  });
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [firmaArchivo, setFirmaArchivo] = useState(null);
  const [firmaExistente, setFirmaExistente] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [notificacion, setNotificacion] = useState({
    isOpen: false,
    mensaje: '',
    tipo: 'exito'
  });

  useEffect(() => {
    limpiarCanvas();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    cargarDatosUsuario();
  }, [user]);

  const limpiarCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const cargarDatosUsuario = async () => {
    if (!user?.id) return;

    try {
      const { data: empleado, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('auth_uuid', user.id)
        .single();

      if (error) throw error;

      if (empleado) {
        setEmpleadoData(empleado);
        setEmpleadoGlobal(empleado);
        setFormData({
          nombre: empleado.nombre?.split(' ')[0] || '',
          apellido: empleado.nombre?.split(' ').slice(1).join(' ') || '',
          email: empleado.email || user.email || '',
          telefono: empleado.telefono || '',
          tipoUsuario: formatRol(empleado.rol),
          nuevaContrasena: '',
          confirmarContrasena: ''
        });

        setFotoPerfil(empleado.foto_perfil || null);
        setFirmaExistente(empleado.firma_digital || null);
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      mostrarNotificacion('Error al cargar el perfil', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'telefono' ? normalizarTelefono10(value) : value
    }));
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      mostrarNotificacion('La imagen debe ser menor a 2MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      mostrarNotificacion('Solo se permiten imágenes', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPerfil(reader.result);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('perfiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('perfiles')
        .getPublicUrl(fileName);

      setFotoPerfil(publicUrl);
      mostrarNotificacion('Foto cargada correctamente', 'exito');
    } catch (error) {
      console.error('Error al cargar foto:', error);
      mostrarNotificacion('Error al cargar la foto', 'error');
    }
  };

  const guardarFirmaCanvas = async () => {
    if (!hasDrawn) return null;

    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png', 1.0);
      const response = await fetch(dataURL);
      const blob = await response.blob();

      if (blob.size === 0) {
        mostrarNotificacion('Error: La firma está vacía', 'error');
        return null;
      }

      return await subirFirma(blob, 'image/png');
    } catch (error) {
      console.error('Error al guardar firma:', error);
      mostrarNotificacion('Error al guardar la firma', 'error');
      return null;
    }
  };

  const subirFirma = async (archivo, contentType) => {
    const fileName = `${user.id}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('firmas')
      .upload(fileName, archivo, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('firmas')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFirmaArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      mostrarNotificacion('La firma debe ser una imagen PNG', 'error');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      mostrarNotificacion('La firma debe ser menor a 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFirmaDigital(reader.result);
    };
    reader.readAsDataURL(file);

    setFirmaArchivo(file);
    setHasDrawn(false);
    limpiarCanvas();
    mostrarNotificacion('Firma PNG lista para guardar', 'exito');
  };

  const handleGuardar = async () => {
    if (formData.email && !esEmailValido(formData.email)) {
      mostrarNotificacion('Ingresa un correo válido', 'error');
      setTabActiva('personal');
      return;
    }

    if (formData.telefono && !esTelefono10Digitos(formData.telefono)) {
      mostrarNotificacion('El teléfono debe tener 10 dígitos numéricos', 'error');
      setTabActiva('personal');
      return;
    }

    if (formData.nuevaContrasena || formData.confirmarContrasena) {
      if (formData.nuevaContrasena !== formData.confirmarContrasena) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        setTabActiva('seguridad');
        return;
      }
      if (formData.nuevaContrasena.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        setTabActiva('seguridad');
        return;
      }
    }

    try {
      setGuardando(true);
      const nombreCompleto = `${formData.nombre} ${formData.apellido}`.trim();
      let urlFirma = firmaExistente;

      if (firmaArchivo) {
        urlFirma = await subirFirma(firmaArchivo, 'image/png');
      } else if (hasDrawn) {
        const nuevaUrlFirma = await guardarFirmaCanvas();
        if (nuevaUrlFirma) {
          urlFirma = nuevaUrlFirma;
        }
      }

      const updateData = {
        nombre: nombreCompleto,
        email: formData.email,
        telefono: formData.telefono,
        updated_at: new Date().toISOString()
      };

      if (fotoPerfil && fotoPerfil !== empleadoData?.foto_perfil) {
        updateData.foto_perfil = fotoPerfil;
      }

      if (urlFirma) {
        updateData.firma_digital = urlFirma;
      }

      const { error: updateError } = await supabase
        .from('empleados')
        .update(updateData)
        .eq('auth_uuid', user.id);

      if (updateError) throw updateError;

      if (formData.nuevaContrasena) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.nuevaContrasena
        });

        if (passwordError) throw passwordError;
      }

      mostrarNotificacion('Perfil actualizado correctamente', 'exito');
      setFormData(prev => ({
        ...prev,
        nuevaContrasena: '',
        confirmarContrasena: ''
      }));
      setFirmaArchivo(null);
      setFirmaDigital(null);
      setHasDrawn(false);
      limpiarCanvas();
      await cargarDatosUsuario();
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      mostrarNotificacion('Error al guardar los cambios', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const getPointerPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPointerPosition(e);

    if (e.pointerId && canvas.setPointerCapture) {
      canvas.setPointerCapture(e.pointerId);
    }

    setIsDrawing(true);
    setHasDrawn(true);
    setFirmaArchivo(null);
    setFirmaDigital(null);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPointerPosition(e);

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setFirmaDigital(canvasRef.current.toDataURL('image/png'));
  };

  const limpiarFirma = () => {
    limpiarCanvas();
    setFirmaDigital(null);
    setFirmaArchivo(null);
    setHasDrawn(false);
  };

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({
      isOpen: true,
      mensaje,
      tipo
    });
  };

  const getPrimerNombre = (nombreCompleto) => {
    if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
    return nombreCompleto.split(' ')[0];
  };

  const getIniciales = () => {
    const nombre = `${formData.nombre} ${formData.apellido}`.trim() || user?.email || 'Usuario';
    return nombre
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('');
  };

  const formatRol = (rol) => {
    if (!rol) return 'Usuario';

    const roles = {
      admin: 'Administrador',
      administrador: 'Administrador',
      radiologo: 'Radiólogo',
      doctor: 'Médico',
      medico: 'Médico',
      tecnico_radiologia: 'Técnico en Radiología',
      tecnico: 'Técnico',
      quimico: 'Químico',
      recepcionista: 'Recepcionista',
      desarrollador: 'Desarrollador'
    };

    return roles[rol] || rol;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const firmaPreview = firmaDigital || firmaExistente;

  return (
    <div className="perfil-usuario-wrapper">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuRef={menuRef}
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="perfil"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {isMobile ? (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      ) : (
        <SidebarHome />
      )}

      <main className="perfil-usuario-content">
        <section className="perfil-container" aria-label="Perfil de usuario">
          <div className="perfil-hero">
            <div className="perfil-identidad">
              <div className="perfil-foto-container">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Foto de perfil" className="perfil-foto" />
                ) : (
                  <div className="perfil-foto-placeholder" aria-hidden="true">
                    {getIniciales()}
                  </div>
                )}
                <label className="btn-editar-foto" aria-label="Cambiar foto de perfil">
                  Cambiar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                  />
                </label>
              </div>

              <div className="perfil-hero-texto">
                <span>Mi perfil</span>
                <h1>{`${formData.nombre} ${formData.apellido}`.trim() || getPrimerNombre(empleadoData?.nombre)}</h1>
                <p>{formData.email || user?.email}</p>
              </div>
            </div>

            <div className="perfil-resumen">
              <div>
                <span>Rol</span>
                <strong>{formData.tipoUsuario || 'Usuario'}</strong>
              </div>
              <div>
                <span>Sucursal</span>
                <strong>{empleadoData?.sucursal || 'Sin sucursal'}</strong>
              </div>
            </div>
          </div>

          <div className="perfil-tabs" role="tablist" aria-label="Secciones de perfil">
            {PERFIL_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tabActiva === tab.id}
                className={tabActiva === tab.id ? 'activo' : ''}
                onClick={() => setTabActiva(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="perfil-panel">
            {tabActiva === 'datos' && (
              <div className="perfil-form-grid" role="tabpanel" aria-label="Datos personales">
                <div className="perfil-campo-grupo">
                  <label htmlFor="perfil-nombre">Nombre</label>
                  <input
                    id="perfil-nombre"
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="perfil-input"
                  />
                </div>

                <div className="perfil-campo-grupo">
                  <label htmlFor="perfil-apellido">Apellido</label>
                  <input
                    id="perfil-apellido"
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className="perfil-input"
                  />
                </div>

                <div className="perfil-campo-grupo">
                  <label htmlFor="perfil-email">Correo</label>
                  <input
                    id="perfil-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="perfil-input"
                  />
                </div>

                <div className="perfil-campo-grupo">
                  <label htmlFor="perfil-telefono">Teléfono</label>
                  <input
                    id="perfil-telefono"
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="perfil-input"
                    maxLength="10"
                    inputMode="numeric"
                  />
                </div>

                <div className="perfil-campo-grupo">
                  <label htmlFor="perfil-tipo">Tipo de usuario</label>
                  <input
                    id="perfil-tipo"
                    type="text"
                    value={formData.tipoUsuario}
                    className="perfil-input"
                    disabled
                  />
                </div>
              </div>
            )}

            {tabActiva === 'seguridad' && (
              <div className="perfil-seguridad" role="tabpanel" aria-label="Seguridad">
                <div className="perfil-panel-intro">
                  <h2>Cambiar contraseña</h2>
                  <p>Déjala vacía si no quieres actualizarla en este momento.</p>
                </div>

                <div className="perfil-form-grid compacto">
                  <div className="perfil-campo-grupo">
                    <label htmlFor="perfil-nueva-contrasena">Nueva contraseña</label>
                    <input
                      id="perfil-nueva-contrasena"
                      type="password"
                      name="nuevaContrasena"
                      value={formData.nuevaContrasena}
                      onChange={handleInputChange}
                      className="perfil-input"
                      placeholder="Dejar vacío para no cambiar"
                    />
                  </div>

                  <div className="perfil-campo-grupo">
                    <label htmlFor="perfil-confirmar-contrasena">Confirmar contraseña</label>
                    <input
                      id="perfil-confirmar-contrasena"
                      type="password"
                      name="confirmarContrasena"
                      value={formData.confirmarContrasena}
                      onChange={handleInputChange}
                      className="perfil-input"
                      placeholder="Confirmar nueva contraseña"
                    />
                  </div>
                </div>
              </div>
            )}

            {tabActiva === 'firma' && (
              <div className="perfil-firma-layout" role="tabpanel" aria-label="Firma digital">
                <div className="perfil-firma-preview">
                  <span>Firma actual</span>
                  {firmaPreview ? (
                    <img src={firmaPreview} alt="Firma digital" className="firma-preview-img" />
                  ) : (
                    <div className="firma-preview-vacia">Sin firma registrada</div>
                  )}
                </div>

                <div className="perfil-firma-editor">
                  <div className="perfil-panel-intro">
                    <h2>Dibujar firma</h2>
                    <p>También puedes subir una firma en PNG si ya la tienes lista.</p>
                  </div>

                  <div className="firma-canvas-container">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={200}
                      className="firma-canvas"
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      onPointerLeave={stopDrawing}
                    />
                  </div>

                  <div className="firma-acciones">
                    <label className="btn-subir-firma">
                      Subir firma PNG
                      <input
                        type="file"
                        accept="image/png,.png"
                        onChange={handleFirmaArchivoChange}
                      />
                    </label>
                    <button type="button" className="btn-limpiar-firma" onClick={limpiarFirma}>
                      Limpiar firma
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="perfil-footer-acciones">
            <button
              type="button"
              className="btn-guardar-perfil"
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </section>
      </main>

      <ModalNotificacion
        isOpen={notificacion.isOpen}
        onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
        mensaje={notificacion.mensaje}
        tipo={notificacion.tipo}
      />
    </div>
  );
};

export default Perfil;
