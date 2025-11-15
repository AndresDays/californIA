import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  // Mostrar loading mientras se verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2847] to-[#1a365d] flex items-center justify-center">
        <div className="text-[#6FB3D2] text-xl">Cargando...</div>
      </div>
    )
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si hay usuario, mostrar el contenido protegido
  return children
}

export default ProtectedRoute