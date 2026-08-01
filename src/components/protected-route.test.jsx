import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from './protected-route'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to }) => { mockNavigate(to); return null }
}))

jest.mock('../context/auth-context', () => ({
  useAuth: jest.fn()
}))

jest.mock('./app-boundary', () => ({
  LoadingSpinner: () => <div>Cargando...</div>,
}))

const { useAuth } = require('../context/auth-context')

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('muestra loading cuando loading es true', () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    render(<MemoryRouter><ProtectedRoute><div>Contenido</div></ProtectedRoute></MemoryRouter>)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('redirige a /login cuando no hay usuario', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    render(<MemoryRouter><ProtectedRoute><div>Contenido</div></ProtectedRoute></MemoryRouter>)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('renderiza children cuando hay usuario autenticado', () => {
    useAuth.mockReturnValue({ user: { id: 1, name: 'Doctor' }, loading: false })
    render(<MemoryRouter><ProtectedRoute><div>Contenido protegido</div></ProtectedRoute></MemoryRouter>)
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('no muestra loading cuando loading es false', () => {
    useAuth.mockReturnValue({ user: { id: 1 }, loading: false })
    render(<MemoryRouter><ProtectedRoute><div>Contenido</div></ProtectedRoute></MemoryRouter>)
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()
  })

  it('redirige al módulo de radiología al radiólogo clínico fuera de su alcance', () => {
    useAuth.mockReturnValue({
      user: { id: 1 },
      loading: false,
      empleadoLoading: false,
      empleadoData: { rol: 'radiologo_clinico' },
    })
    render(<MemoryRouter initialEntries={['/dashboard']}><ProtectedRoute><div>Contenido</div></ProtectedRoute></MemoryRouter>)
    expect(mockNavigate).toHaveBeenCalledWith('/radiologia')
  })
})
