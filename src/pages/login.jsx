import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { esEmailValido } from '../utils/form-validations'
import { resolverCorreoDeAcceso } from '../utils/clientes-accesos'
import './Login.css'

let logoSrc
try {
  logoSrc = new URL('../assets/CalifornIA.png', import.meta.url).href
} catch {
  logoSrc = null
}

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('Por favor, completa todos los campos')
      setLoading(false)
      return
    }

    // Los convenios entran con usuario y el personal con su correo: lo que no
    // trae arroba se toma como usuario y se convierte al correo interno de la
    // cuenta, que nadie teclea.
    const correoAcceso = resolverCorreoDeAcceso(email)

    if (email.includes('@') && !esEmailValido(email)) {
      setErrorMessage('Por favor, ingresa un correo válido')
      setLoading(false)
      return
    }

    if (!correoAcceso) {
      setErrorMessage('Por favor, ingresa tu correo o usuario')
      setLoading(false)
      return
    }

    const { data, error } = await signIn(correoAcceso, password)

    if (error) {
      setErrorMessage('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate(data?.redirectTo || '/dashboard')
    }
  }

  return (
    <div className="login-container">
      <div className="login-header">
        {logoSrc ? (
          <img src={logoSrc} alt="CalifornIA" className="login-logo-img" />
        ) : (
          <h1 className="login-logo-text">
            <span className="login-logo-icon">⊚</span>CalifornIA
          </h1>
        )}
        <p className="login-subtitle">
          Confianza médica potenciada con Inteligencia Artificial
        </p>
      </div>

      <div className="login-card">
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="email" className="login-label">
              Correo o usuario:
            </label>
            <input
              id="email"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              disabled={loading}
            />
          </div>

          <div className="login-input-group">
            <label htmlFor="password" className="login-label">
              Contraseña:
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              disabled={loading}
            />
          </div>

          {errorMessage && (
            <div className="login-error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN'}
          </button>

          <div className="login-forgot-link">
            <Link to="/forgot-password">
              ¿Has olvidado tu contraseña?
            </Link>
          </div>
        </form>
      </div>

      <div className="login-disclaimer">
        <p>
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico. 
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </div>
    </div>
  )
}

export default Login
