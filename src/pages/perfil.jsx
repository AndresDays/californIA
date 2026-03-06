import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import Header from '../components/header-principal';
import SidebarHome from '../components/sidebar-home';
import ModalNotificacion from '../components/ModalNotificacion';
import './perfil.css';

const Perfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const menuRef = useRef(null); // Agregar ref para el menú

  const [empleadoData, setEmpleadoData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // Agregar estado del menú
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
  const [firmaExistente, setFirmaExistente] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [notificacion, setNotificacion] = useState({
    isOpen: false,
    mensaje: '',
    tipo: 'exito'
  });

  // Inicializar canvas sin fondo blanco
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Cerrar menú al hacer clic fuera
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
        setFormData({
          nombre: empleado.nombre?.split(' ')[0] || '',
          apellido: empleado.nombre?.split(' ').slice(1).join(' ') || '',
          email: empleado.email || user.email || '',
          telefono: empleado.telefono || '',
          tipoUsuario: formatRol(empleado.rol),
          nuevaContrasena: '',
          confirmarContrasena: ''
        });
        
        if (empleado.foto_perfil) {
          setFotoPerfil(empleado.foto_perfil);
        }
        
        if (empleado.firma_digital) {
          setFirmaExistente(empleado.firma_digital);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
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

  const guardarFirma = async () => {
    if (!hasDrawn) return null;

    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      const response = await fetch(dataURL);
      const blob = await response.blob();

      if (blob.size === 0) {
        console.error('El blob de la firma está vacío');
        mostrarNotificacion('Error: La firma está vacía', 'error');
        return null;
      }

      const fileName = `${user.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('firmas')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error al guardar firma:', error);
      mostrarNotificacion('Error al guardar la firma', 'error');
      return null;
    }
  };

  const handleGuardar = async () => {
    if (formData.nuevaContrasena || formData.confirmarContrasena) {
      if (formData.nuevaContrasena !== formData.confirmarContrasena) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        return;
      }
      if (formData.nuevaContrasena.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }
    }

    try {
      const nombreCompleto = `${formData.nombre} ${formData.apellido}`.trim();

      let urlFirma = firmaExistente;
      
      if (hasDrawn) {
        const nuevaUrlFirma = await guardarFirma();
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

      await cargarDatosUsuario();
      setHasDrawn(false);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      mostrarNotificacion('Error al guardar los cambios', 'error');
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    setIsDrawing(true);
    setHasDrawn(true);
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      setFirmaDigital(canvas.toDataURL('image/png'));
    }
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDigital(null);
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

  const formatRol = (rol) => {
    if (!rol) return 'Usuario';

    const roles = {
      'admin': 'Administrador',
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo',
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
      />

      <SidebarHome />

      <div className="perfil-usuario-content">
        <div className="perfil-container">
          <div className="perfil-seccion-izquierda">
            <div className="perfil-foto-container">
              {fotoPerfil ? (
                <img src={fotoPerfil} alt="Foto de perfil" className="perfil-foto" />
              ) : (
                <div className="perfil-foto-placeholder">
                  <span className="perfil-icono-usuario">👤</span>
                </div>
              )}
            </div>
            <label className="btn-editar-foto">
              Editar foto
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="perfil-seccion-central">
            <div className="perfil-campo-grupo">
              <label>Nombre:</label>
              <div className="perfil-input-con-editar">
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="perfil-input"
                />
                <span className="icono-editar">✏️</span>
              </div>
            </div>

            <div className="perfil-campo-grupo">
              <label>Apellido:</label>
              <div className="perfil-input-con-editar">
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="perfil-input"
                />
                <span className="icono-editar">✏️</span>
              </div>
            </div>

            <div className="perfil-campo-grupo">
              <label>Correo:</label>
              <div className="perfil-input-con-editar">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="perfil-input"
                />
                <span className="icono-editar">✏️</span>
              </div>
            </div>

            <div className="perfil-campo-grupo">
              <label>Teléfono:</label>
              <div className="perfil-input-con-editar">
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="perfil-input"
                  maxLength="10"
                />
                <span className="icono-editar">✏️</span>
              </div>
            </div>

            <div className="perfil-campo-grupo">
              <label>Tipo de usuario:</label>
              <div className="perfil-input-con-editar">
                <input
                  type="text"
                  value={formData.tipoUsuario}
                  className="perfil-input"
                  disabled
                />
                <span className="icono-editar">✏️</span>
              </div>
            </div>

            <div className="perfil-divisor"></div>

            <div className="perfil-campo-grupo">
              <label>Nueva contraseña:</label>
              <input
                type="password"
                name="nuevaContrasena"
                value={formData.nuevaContrasena}
                onChange={handleInputChange}
                className="perfil-input"
                placeholder="Dejar vacío para no cambiar"
              />
            </div>

            <div className="perfil-campo-grupo">
              <label>Confirmar contraseña:</label>
              <input
                type="password"
                name="confirmarContrasena"
                value={formData.confirmarContrasena}
                onChange={handleInputChange}
                className="perfil-input"
                placeholder="Confirmar nueva contraseña"
              />
            </div>

            <button className="btn-guardar-perfil" onClick={handleGuardar}>
              GUARDAR
            </button>
          </div>

          <div className="perfil-seccion-derecha">
            <h3 className="firma-titulo">Editar firma digital</h3>
            <p className="firma-descripcion">
              Es necesario contar con una firma digital para realizar los reportes digitales.
            </p>

            {firmaExistente && !hasDrawn && (
              <div className="firma-preview">
                <p className="firma-preview-label">Firma actual:</p>
                <img src={firmaExistente} alt="Firma existente" className="firma-preview-img" />
              </div>
            )}

            <div className="firma-canvas-container">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="firma-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <button className="btn-limpiar-firma" onClick={limpiarFirma}>
              Limpiar firma
            </button>
          </div>
        </div>
      </div>

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