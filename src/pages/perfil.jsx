import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabase-client'
import './CalifornIA.css'

const Perfil = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [empleadoData, setEmpleadoData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user) return

      try {
        const { data: perfil } = await supabase
          .from('perfiles_usuario')
          .select('id_empleado')
          .eq('id', user.id)
          .single()

        if (perfil && perfil.id_empleado) {
          const { data: empleado } = await supabase
            .from('empleados')
            .select('*')
            .eq('id_empleado', perfil.id_empleado)
            .single()

          setEmpleadoData(empleado)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmpleadoData()
  }, [user])

  const formatPuesto = (puesto) => {
    const puestos = {
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo',
      'medico': 'Médico',
      'tecnico_radiologia': 'Técnico en Radiología',
      'quimico': 'Químico',
      'recepcionista': 'Recepcionista'
    }
    return puestos[puesto] || puesto
  }

  const formatEstado = (estado) => {
    const estados = {
      'activo': '🟢 Activo',
      'inactivo': '🔴 Inactivo',
      'vacaciones': '🟡 Vacaciones',
      'licencia': '🟠 Licencia'
    }
    return estados[estado] || estado
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'white'
        }}>
          Cargando perfil...
        </div>
      </div>
    )
  }

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
          <h1 className="title">Mi Perfil</h1>
        </div>
      </header>

      <main style={{ 
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          background: 'rgba(80, 95, 110, 0.3)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '3rem',
          border: '2px solid rgba(83, 185, 219, 0.3)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #53b9db 0%, #3a8fa8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: 'white',
              margin: '0 auto 1rem',
              fontWeight: 'bold'
            }}>
              {empleadoData?.nombre?.[0]?.toUpperCase() || 'U'}
            </div>
            <h2 style={{ color: 'white', fontSize: '2rem', marginBottom: '0.5rem' }}>
              {empleadoData?.nombre || 'Usuario'}
            </h2>
            <p style={{ color: '#53b9db', fontSize: '1.2rem' }}>
              {empleadoData ? formatPuesto(empleadoData.puesto) : 'Sin puesto asignado'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Email
              </p>
              <p style={{ color: 'white', fontSize: '1rem' }}>
                {empleadoData?.email || user?.email || 'No disponible'}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Teléfono
              </p>
              <p style={{ color: 'white', fontSize: '1rem' }}>
                {empleadoData?.telefono || 'No disponible'}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Cédula Profesional
              </p>
              <p style={{ color: 'white', fontSize: '1rem' }}>
                {empleadoData?.cedula_profesional || 'No disponible'}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Estado
              </p>
              <p style={{ color: 'white', fontSize: '1rem' }}>
                {empleadoData ? formatEstado(empleadoData.estado) : 'No disponible'}
              </p>
            </div>

            {empleadoData?.turno && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Turno
                </p>
                <p style={{ color: 'white', fontSize: '1rem', textTransform: 'capitalize' }}>
                  {empleadoData.turno}
                </p>
              </div>
            )}

            {empleadoData?.fecha_contratacion && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Fecha de contratación
                </p>
                <p style={{ color: 'white', fontSize: '1rem' }}>
                  {new Date(empleadoData.fecha_contratacion).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
          </div>
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

export default Perfil