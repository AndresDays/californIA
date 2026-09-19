import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { puedeAccederRuta, rutaInicialPorRol } from '../utils/role-permissions'
import { LoadingSpinner } from './app-boundary'

const ProtectedRoute = ({ children }) => {
  const { user, loading, empleadoData, empleadoLoading } = useAuth()
  const { pathname } = useLocation()

  // El spinner sólo mientras no hay perfil que enseñar. Si ya lo hay y se está
  // revalidando en segundo plano, la pantalla se queda: cambiarla por el
  // spinner la desmonta, y con ella cualquier modal abierto a medio llenar.
  if (loading || (user && empleadoLoading && !empleadoData)) {
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
