import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import './Login.css'

// Importar logo (si existe, sino usará texto)
let logoSrc
try {
  logoSrc = new URL('../assets/CalifornIA.png', import.meta.url).href
} catch {
  logoSrc = null
}

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico')
      setLoading(false)
      return
    }

    const { error: resetError } = await resetPassword(email)
    
    if (resetError) {
      setError('Ocurrió un error. Verifica tu correo electrónico.')
    } else {
      setMessage('Te hemos enviado un correo con instrucciones para restablecer tu contraseña.')
    }
    
    setLoading(false)
  }

  return (
    <div className="login-container">
      {/* Logo y título */}
      <div className="login-header">
        {logoSrc ? (
          <img src={logoSrc} alt="CalifornIA" className="login-logo-img" />
        ) : (
          <h1 className="login-logo-text">
            <span className="login-logo-icon">⊚</span>CalifornIA
          </h1>
        )}
        <p className="login-subtitle">
          Recuperación de contraseña
        </p>
      </div>

      {/* Formulario */}
      <div className="login-card">
        <form onSubmit={handleSubmit} className="login-form">
          <p className="login-instructions">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </p>

          {/* Campo de correo electrónico */}
          <div className="login-input-group">
            <label htmlFor="email" className="login-label">
              Correo Electrónico:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              disabled={loading}
            />
          </div>

          {/* Mensaje de éxito */}
          {message && (
            <div className="login-success">
              {message}
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Botón de enviar */}
          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'ENVIANDO...' : 'ENVIAR INSTRUCCIONES'}
          </button>

          {/* Link para regresar al login */}
          <div className="login-forgot-link">
            <Link to="/login">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>

      {/* Disclaimer legal */}
      <div className="login-disclaimer">
        <p>
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico. 
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword