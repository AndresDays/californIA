import React, { useState, useEffect } from 'react';
import './ModalAgregarUsuario.css';

const ModalAgregarUsuario = ({ isOpen, onClose, onGuardar, usuarioEditar }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    contrasena: '',
    rol: '',
    sucursal: '',
    email: '',
    telefono: '',
    activo: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (usuarioEditar) {
      setFormData({
        id: usuarioEditar.id,
        auth_uuid: usuarioEditar.auth_uuid || '',
        nombre: usuarioEditar.nombre || '',
        usuario: usuarioEditar.usuario || '',
        contrasena: '',
        rol: usuarioEditar.rol || '',
        sucursal: usuarioEditar.sucursal || '',
        email: usuarioEditar.email || '',
        telefono: usuarioEditar.telefono || '',
        activo: usuarioEditar.estado === 'Activado'
      });
    } else {
      setFormData({
        nombre: '',
        usuario: '',
        contrasena: '',
        rol: '',
        sucursal: '',
        email: '',
        telefono: '',
        activo: true
      });
    }
    setErrors({});
  }, [usuarioEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Validación especial para teléfono
    if (name === 'telefono') {
      const soloNumeros = value.replace(/\D/g, '');
      if (soloNumeros.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: soloNumeros
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.usuario.trim()) {
      newErrors.usuario = 'El usuario es requerido';
    }

    if (!usuarioEditar && !formData.email.trim()) {
      newErrors.email = 'El email es requerido para crear el acceso';
    }

    if (!usuarioEditar && !formData.contrasena.trim()) {
      newErrors.contrasena = 'La contraseña es requerida';
    }

    if (formData.contrasena.trim() && formData.contrasena.trim().length < 6) {
      newErrors.contrasena = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.rol) {
      newErrors.rol = 'El rol es requerido';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      await onGuardar(formData, !!usuarioEditar);
      handleClose();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      usuario: '',
      contrasena: '',
      rol: '',
      sucursal: '',
      email: '',
      telefono: '',
      activo: true
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-usuario-overlay" onClick={handleClose} />
      <div className="modal-usuario-container">
        <div className="modal-usuario-header">
          <h2 className="modal-usuario-titulo">
            {usuarioEditar ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
          </h2>
          <button className="modal-usuario-close" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-usuario-form">
          <div className="modal-usuario-body">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`form-input ${errors.nombre ? 'error' : ''}`}
                  placeholder="Nombre completo"
                />
                {errors.nombre && <span className="error-message">{errors.nombre}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Usuario *</label>
                <input
                  type="text"
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  className={`form-input ${errors.usuario ? 'error' : ''}`}
                  placeholder="Nombre de usuario"
                />
                {errors.usuario && <span className="error-message">{errors.usuario}</span>}
              </div>

              <div className="form-group">
                <label>{usuarioEditar ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                <input
                  type="password"
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={handleChange}
                  className={`form-input ${errors.contrasena ? 'error' : ''}`}
                  placeholder={usuarioEditar ? 'Dejar vacío para no cambiar' : 'Contraseña'}
                />
                {errors.contrasena && <span className="error-message">{errors.contrasena}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Rol *</label>
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className={`form-select ${errors.rol ? 'error' : ''}`}
                >
                  <option value="">Seleccionar rol</option>
                  <option value="admin">Administrador</option>
                  <option value="radiologo">Radiólogo - Director</option>
                  <option value="medico">Médico</option>
                  <option value="tecnico_radiologia">Técnico en Radiología</option>
                  <option value="quimico">Químico</option>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="desarrollador">Desarrollador</option>
                </select>
                {errors.rol && <span className="error-message">{errors.rol}</span>}
              </div>

              <div className="form-group">
                <label>Sucursal</label>
                <input
                  type="text"
                  name="sucursal"
                  value={formData.sucursal}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Nombre de la sucursal"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{usuarioEditar ? 'Email' : 'Email *'}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="correo@ejemplo.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Número de teléfono (10 dígitos)"
                  maxLength="10"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleChange}
                  />
                  <span>Usuario activo</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-usuario-footer">
            <button type="button" className="btn-cancelar" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              {usuarioEditar ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalAgregarUsuario;
