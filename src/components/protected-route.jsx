import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { puedeAccederRuta, rutaInicialPorRol } from '../utils/role-permissions'
import { LoadingSpinner } from './app-boundary'

const ProtectedRoute = ({ children }) => {
  const { user, loading, empleadoData, empleadoLoading } = useAuth()
  const { pathname } = useLocation()

  if (loading || (user && empleadoLoading)) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!empleadoData) {
    return <Navigate to="/login" replace />
  }

  if (!puedeAccederRuta(empleadoData.rol, pathname)) {
    return <Navigate to={rutaInicialPorRol(empleadoData.rol)} replace />
  }

  return children
}

export default ProtectedRoute
