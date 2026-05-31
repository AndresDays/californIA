import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { puedeAccederRuta } from '../utils/role-permissions'

const ProtectedRoute = ({ children }) => {
  const { user, loading, empleadoData, empleadoLoading } = useAuth()
  const { pathname } = useLocation()

  if (loading || (user && empleadoLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2847] to-[#1a365d] flex items-center justify-center">
        <div className="text-[#6FB3D2] text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!puedeAccederRuta(empleadoData?.rol, pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
