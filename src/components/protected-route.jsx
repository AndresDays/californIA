import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2847] to-[#1a365d] flex items-center justify-center">
        <div className="text-[#6FB3D2] text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute