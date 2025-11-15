import { useNavigate } from 'react-router-dom'
import './CalifornIA.css'

const Pacientes = () => {
  const navigate = useNavigate()

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#53b9db',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            ← Volver
          </button>
          <h1 className="title">Gestión de Pacientes</h1>
        </div>
      </header>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <h2 style={{ fontSize: '2.5rem', color: '#53b9db' }}>
          🏥 Pacientes
        </h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          Módulo de gestión de pacientes en desarrollo
        </p>
        <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          Aquí podrás registrar pacientes, ver expedientes y gestionar estudios
        </p>
      </main>

      <footer className="footer">
        <p className="disclaimer">
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico. 
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </footer>
    </div>
  )
}

export default Pacientes