import { useNavigate } from 'react-router-dom'
import './CalifornIA.css'

const Radiologia = () => {
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
          <h1 className="title">Módulo de Radiología</h1>
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
          📊 Radiología
        </h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          Análisis de radiografías de tórax con IA
        </p>
        <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          Aquí se integra modulo para radiografías
        </p>
        <div style={{
          marginTop: '2rem',
          padding: '2rem',
          background: 'rgba(83, 185, 219, 0.1)',
          borderRadius: '15px',
          border: '2px solid #53b9db'
        }}>
          <h3 style={{ color: '#53b9db', marginBottom: '1rem' }}>Próximamente:</h3>
          <ul style={{ color: 'rgba(255, 255, 255, 0.7)', listStyle: 'none', padding: 0 }}>
            <li>✓ Subida de imágenes DICOM</li>
            <li>✓ Análisis con modelo Swin Transformer</li>
            <li>✓ Visualización de heatmaps</li>
            <li>✓ Detección de 14 patologías</li>
            <li>✓ Generación de reportes</li>
          </ul>
        </div>
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

export default Radiologia