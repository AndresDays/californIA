import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import AppBoundary, { LoadingSpinner } from './components/app-boundary';
import ProtectedRoute from './components/protected-route';
import PwaUpdatePrompt from './components/pwa-update-prompt';
import { AuthProvider } from './context/auth-context';

const ForgotPassword = lazy(() => import('./pages/forgot-password'));
const Dashboard = lazy(() => import('./pages/home'));
const Captura = lazy(() => import('./pages/laboratorio/captura'));
const CalendarioCitas = lazy(() => import('./pages/laboratorio/calendario-citas'));
const CierreCaja = lazy(() => import('./pages/laboratorio/cierre-caja'));
const Clientes = lazy(() => import('./pages/laboratorio/clientes'));
const AdministrarAreas = lazy(() => import('./pages/laboratorio/configuracion/administrar-areas'));
const AdministrarEquipos = lazy(() => import('./pages/laboratorio/configuracion/administrar-equipos'));
const AdministrarMetodos = lazy(() => import('./pages/laboratorio/configuracion/administrar-metodos'));
const AdministrarNiveles = lazy(() => import('./pages/laboratorio/configuracion/administrar-niveles'));
const AdministrarRecipientes = lazy(() => import('./pages/laboratorio/configuracion/administrar-recipientes'));
const AdministrarTecnicas = lazy(() => import('./pages/laboratorio/configuracion/administrar-tecnicas'));
const Analitos = lazy(() => import('./pages/laboratorio/configuracion/analitos'));
const EstudiosLab = lazy(() => import('./pages/laboratorio/configuracion/estudios-laboratorio'));
const Paquetes = lazy(() => import('./pages/laboratorio/configuracion/paquetes'));
const Precios = lazy(() => import('./pages/laboratorio/configuracion/precios'));
const TipoMuestra = lazy(() => import('./pages/laboratorio/configuracion/tipo_muestra'));
const Doctores = lazy(() => import('./pages/laboratorio/doctores'));
const EntregaResultados = lazy(() => import('./pages/laboratorio/entrega-resultados'));
const Laboratorio = lazy(() => import('./pages/laboratorio/laboratorio'));
const NuevoPaciente = lazy(() => import('./pages/laboratorio/nuevo-paciente'));
const Cotizacion = lazy(() => import('./pages/laboratorio/recepcion/cotizacion'));
const EditarSolicitud = lazy(() => import('./pages/laboratorio/recepcion/editar-solicitud'));
const Historial = lazy(() => import('./pages/laboratorio/recepcion/historial'));
const CortesDia = lazy(() => import('./pages/laboratorio/cortes-dia'));
const ReporteAdministrativo = lazy(() => import('./pages/laboratorio/reporte-administrativo'));
const ReporteVentas = lazy(() => import('./pages/laboratorio/reporte-ventas'));
const Turnos = lazy(() => import('./pages/laboratorio/turnos'));
const Login = lazy(() => import('./pages/login'));
const Pacientes = lazy(() => import('./pages/pacientes'));
const Perfil = lazy(() => import('./pages/perfil'));
const PortalResultados = lazy(() => import('./pages/portal-resultados'));
const DashboardRadiologia = lazy(() => import('./pages/radiologia/pages/dashboard-radiologia'));
const PlantillasRadiologia = lazy(() => import('./pages/radiologia/pages/plantillas-radiologia'));
const ReporteRadiologia = lazy(() => import('./pages/radiologia/pages/ReporteRadiologia'));
const VisorDicom = lazy(() => import('./pages/radiologia/pages/visor-dicom'));
const VisorPaciente = lazy(() => import('./pages/radiologia/pages/visor-paciente'));
const SalaEspera = lazy(() => import('./pages/sala-espera'));
const Usuarios = lazy(() => import('./pages/usuarios'));

const B = ({ children }) => <AppBoundary>{children}</AppBoundary>;

const P = ({ children }) => (
	<ProtectedRoute>
		<AppBoundary>{children}</AppBoundary>
	</ProtectedRoute>
);

function App() {
	return (
		<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<AuthProvider>
				<Suspense fallback={<LoadingSpinner texto="Cargando pantalla..." />}>
					<Routes>
						<Route path="/" element={<Navigate to="/login" replace />} />

						<Route path="/login" element={<B><Login /></B>} />
						<Route path="/forgot-password" element={<B><ForgotPassword /></B>} />
						<Route path="/resultados" element={<B><PortalResultados /></B>} />
						<Route path="/visor-paciente/:estudioId" element={<B><VisorPaciente /></B>} />
						<Route path="/sala-espera" element={<B><SalaEspera /></B>} />

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
						<Route path="/calendario" element={<P><CalendarioCitas /></P>} />
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
						<Route path="/cortes-dia" element={<P><CortesDia /></P>} />
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
				</Suspense>
				<PwaUpdatePrompt />
			</AuthProvider>
		</Router>
	);
}

export default App;
