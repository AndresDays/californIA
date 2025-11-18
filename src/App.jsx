import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/auth-context'
import Login from './pages/login'
import Dashboard from './pages/home'
import ForgotPassword from './pages/forgot-password'
import ProtectedRoute from './components/protected-route'
import Radiologia  from './pages/radiologia'
import Laboratorio from './pages/laboratorio'
import Usuarios from './pages/usuarios'
import Pacientes from './pages/pacientes'
import Perfil from './pages/perfil'
import './App.css';

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
                <Radiologia />
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
          
          {/* Ruta 404 - redirige al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App