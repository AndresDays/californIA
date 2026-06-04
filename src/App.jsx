import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import AppBoundary from './components/app-boundary';
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
import ReporteAdministrativo from './pages/laboratorio/reporte-administrativo';
import ReporteVentas from './pages/laboratorio/reporte-ventas';
import Turnos from './pages/laboratorio/turnos';
import Login from './pages/login';
import Pacientes from './pages/pacientes';
import Perfil from './pages/perfil';
import PortalResultados from './pages/portal-resultados';
import DashboardRadiologia from './pages/radiologia/pages/dashboard-radiologia';
import PlantillasRadiologia from './pages/radiologia/pages/plantillas-radiologia';
import ReporteRadiologia from './pages/radiologia/pages/ReporteRadiologia';
import VisorDicom from './pages/radiologia/pages/visor-dicom';
import SalaEspera from './pages/sala-espera';
import Usuarios from './pages/usuarios';

const P = ({ children }) => (
	<ProtectedRoute>
		<AppBoundary>{children}</AppBoundary>
	</ProtectedRoute>
);

function App() {
	return (
		<Router>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<Navigate to="/login" replace />} />

					<Route path="/login" element={<Login />} />
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/resultados" element={<PortalResultados />} />
					<Route path="/sala-espera" element={<SalaEspera />} />

					<Route path="/dashboard" element={<P><Dashboard /></P>} />

					<Route path="/radiologia" element={<P><DashboardRadiologia /></P>} />
					<Route path="/visor-dicom/:estudioId" element={<P><VisorDicom /></P>} />
					<Route path="/reporte" element={<P><ReporteRadiologia /></P>} />
					<Route path="/plantillas" element={<P><PlantillasRadiologia /></P>} />

					<Route path="/laboratorio" element={<P><Laboratorio /></P>} />
					<Route path="/usuarios" element={<P><Usuarios /></P>} />
					<Route path="/pacientes" element={<P><Pacientes /></P>} />
					<Route path="/perfil" element={<P><Perfil /></P>} />
					<Route path="/nuevo-paciente" element={<P><NuevoPaciente /></P>} />
					<Route path="/captura" element={<P><Captura /></P>} />
					<Route path="/entrega-resultados" element={<P><EntregaResultados /></P>} />
					<Route path="/editar-solicitud" element={<P><EditarSolicitud /></P>} />
					<Route path="/cotizacion" element={<P><Cotizacion /></P>} />
					<Route path="/historial" element={<P><Historial /></P>} />
					<Route path="/turnos" element={<P><Turnos /></P>} />
					<Route path="/cierre-caja" element={<P><CierreCaja /></P>} />
					<Route path="/clientes" element={<P><Clientes /></P>} />
					<Route path="/doctores" element={<P><Doctores /></P>} />
					<Route path="/reporte-ventas" element={<P><ReporteVentas /></P>} />
					<Route path="/reporte-administrativo" element={<P><ReporteAdministrativo /></P>} />

					<Route path="/configuracion/estudios" element={<P><EstudiosLab /></P>} />
					<Route path="/configuracion/analitos" element={<P><Analitos /></P>} />
					<Route path="/configuracion/paquetes" element={<P><Paquetes /></P>} />
					<Route path="/configuracion/precios" element={<P><Precios /></P>} />
					<Route path="/configuracion/areas" element={<P><AdministrarAreas /></P>} />
					<Route path="/configuracion/tipo-muestra" element={<P><TipoMuestra /></P>} />
					<Route path="/configuracion/recipientes" element={<P><AdministrarRecipientes /></P>} />
					<Route path="/configuracion/metodo" element={<P><AdministrarMetodos /></P>} />
					<Route path="/configuracion/tecnica" element={<P><AdministrarTecnicas /></P>} />
					<Route path="/configuracion/equipos" element={<P><AdministrarEquipos /></P>} />
					<Route path="/configuracion/nivel" element={<P><AdministrarNiveles /></P>} />

					<Route path="*" element={<Navigate to="/login" replace />} />
				</Routes>
			</AuthProvider>
		</Router>
	);
}

export default App;
