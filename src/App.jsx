import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/protected-route';
import { AuthProvider } from './context/auth-context';
import ForgotPassword from './pages/forgot-password';
import Dashboard from './pages/home';
import Captura from './pages/laboratorio/captura';
import CierreCaja from './pages/laboratorio/cierre-caja';
import Clientes from './pages/laboratorio/clientes';
import AdministrarAreas from './pages/laboratorio/configuracion/administrar-areas';
import AdministrarEquipos from './pages/laboratorio/configuracion/administrar-equipos';
import AdministrarMetodos from './pages/laboratorio/configuracion/administrar-metodos';
import AdministrarNiveles from './pages/laboratorio/configuracion/administrar-niveles';
import AdministrarRecipientes from './pages/laboratorio/configuracion/administrar-recipientes';
import AdministrarTecnicas from './pages/laboratorio/configuracion/administrar-tecnicas';
import Analitos from './pages/laboratorio/configuracion/analitos';
import EstudiosLab from './pages/laboratorio/configuracion/estudios-laboratorio';
import Paquetes from './pages/laboratorio/configuracion/paquetes';
import Precios from './pages/laboratorio/configuracion/precios';
import TipoMuestra from './pages/laboratorio/configuracion/tipo_muestra';
import Doctores from './pages/laboratorio/doctores';
import EntregaResultados from './pages/laboratorio/entrega-resultados';
import Laboratorio from './pages/laboratorio/laboratorio';
import NuevoPaciente from './pages/laboratorio/nuevo-paciente';
import Cotizacion from './pages/laboratorio/recepcion/cotizacion';
import EditarSolicitud from './pages/laboratorio/recepcion/editar-solicitud';
import Historial from './pages/laboratorio/recepcion/historial';
import ReporteVentas from './pages/laboratorio/reporte-ventas';
import Login from './pages/login';
import Pacientes from './pages/pacientes';
import Perfil from './pages/perfil';
import DashboardRadiologia from './pages/radiologia/pages/dashboard-radiologia';
import PlantillasRadiologia from './pages/radiologia/pages/plantillas-radiologia';
import ReporteRadiologia from './pages/radiologia/pages/ReporteRadiologia';
import VisorDicom from './pages/radiologia/pages/visor-dicom';
import Usuarios from './pages/usuarios';

function App() {
  return (
		<Router>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<Navigate to="/login" replace />} />

					<Route path="/login" element={<Login />} />

					<Route path="/forgot-password" element={<ForgotPassword />} />

					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/radiologia"
						element={
							<ProtectedRoute>
								<DashboardRadiologia />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/visor-dicom/:estudioId"
						element={
							<ProtectedRoute>
								<VisorDicom />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/reporte"
						element={
							<ProtectedRoute>
								<ReporteRadiologia />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/plantillas"
						element={
							<ProtectedRoute>
								<PlantillasRadiologia />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/laboratorio"
						element={
							<ProtectedRoute>
								<Laboratorio />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/usuarios"
						element={
							<ProtectedRoute>
								<Usuarios />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/pacientes"
						element={
							<ProtectedRoute>
								<Pacientes />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/perfil"
						element={
							<ProtectedRoute>
								<Perfil />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/nuevo-paciente"
						element={
							<ProtectedRoute>
								<NuevoPaciente />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/captura"
						element={
							<ProtectedRoute>
								<Captura />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/entrega-resultados"
						element={
							<ProtectedRoute>
								<EntregaResultados />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/editar-solicitud"
						element={
							<ProtectedRoute>
								<EditarSolicitud />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/cotizacion"
						element={
							<ProtectedRoute>
								<Cotizacion />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/historial"
						element={
							<ProtectedRoute>
								<Historial />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/cierre-caja"
						element={
							<ProtectedRoute>
								<CierreCaja />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/clientes"
						element={
							<ProtectedRoute>
								<Clientes />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/doctores"
						element={
							<ProtectedRoute>
								<Doctores />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/reporte-ventas"
						element={
							<ProtectedRoute>
								<ReporteVentas />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/estudios"
						element={
							<ProtectedRoute>
								<EstudiosLab />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/analitos"
						element={
							<ProtectedRoute>
								<Analitos />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/paquetes"
						element={
							<ProtectedRoute>
								<Paquetes />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/precios"
						element={
							<ProtectedRoute>
								<Precios />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/areas"
						element={
							<ProtectedRoute>
								<AdministrarAreas />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/tipo-muestra"
						element={
							<ProtectedRoute>
								<TipoMuestra />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/recipientes"
						element={
							<ProtectedRoute>
								<AdministrarRecipientes />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/metodo"
						element={
							<ProtectedRoute>
								<AdministrarMetodos />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/tecnica"
						element={
							<ProtectedRoute>
								<AdministrarTecnicas />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/equipos"
						element={
							<ProtectedRoute>
								<AdministrarEquipos />
							</ProtectedRoute>
						}
					/>

					<Route
						path="/configuracion/nivel"
						element={
							<ProtectedRoute>
								<AdministrarNiveles />
							</ProtectedRoute>
						}
					/>
					{/* Ruta 404 - redirige al login */}
					<Route path="*" element={<Navigate to="/login" replace />} />
				</Routes>
			</AuthProvider>
		</Router>
	);
}

export default App
