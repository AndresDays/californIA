import React from 'react';
import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase-client'

const AuthContext = createContext({})

const esColumnaInexistente = (error, columna) =>
  error?.code === '42703' &&
  String(error?.message || '').toLowerCase().includes(String(columna).toLowerCase())

const seleccionarDoctorExterno = async (aplicarFiltro) => {
  let { data, error } = await aplicarFiltro(
    supabase
      .from('doctores')
      .select('id_doctor, nombre, auth_uuid, es_radiologo, especialidad'),
  )
    .maybeSingle()

  if (
    esColumnaInexistente(error, 'auth_uuid') ||
    esColumnaInexistente(error, 'es_radiologo') ||
    esColumnaInexistente(error, 'especialidad') ||
    error?.code === 'PGRST204'
  ) {
    const respuestaBase = await aplicarFiltro(
      supabase
        .from('doctores')
        .select('id_doctor, nombre, auth_uuid'),
    )
      .maybeSingle()
    data = respuestaBase.data
    error = respuestaBase.error
  }

  if (
    esColumnaInexistente(error, 'auth_uuid') ||
    error?.code === 'PGRST204'
  ) {
    const respuestaMinima = await aplicarFiltro(
      supabase
        .from('doctores')
        .select('id_doctor, nombre'),
    )
      .maybeSingle()
    data = respuestaMinima.data
    error = respuestaMinima.error
  }

  if (error) throw error
  return data
}

const cargarDoctorExternoAuth = (authUuid) =>
  seleccionarDoctorExterno(
    (query) => query.eq('auth_uuid', authUuid),
  )

const crearEmpleadoDoctorExterno = (doctor) => ({
  nombre: doctor.nombre,
  rol: 'doctor_externo',
  id_doctor: doctor.id_doctor,
  doctor_nombre: doctor.nombre,
  es_radiologo: doctor.es_radiologo === true,
  especialidad: doctor.especialidad || null,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [empleadoData, setEmpleadoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [empleadoLoading, setEmpleadoLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setEmpleadoLoading(true)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setEmpleadoLoading(true)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelado = false

    const cargarEmpleado = async () => {
      if (!user?.id) {
        setEmpleadoData(null)
        setEmpleadoLoading(false)
        return
      }

      setEmpleadoLoading(true)
      try {
        const doctorExterno = await cargarDoctorExternoAuth(user.id)
        if (doctorExterno) {
          if (!cancelado) setEmpleadoData(crearEmpleadoDoctorExterno(doctorExterno))
          return
        }

        const { data, error } = await supabase
          .from('empleados')
          .select('nombre, rol')
          .eq('auth_uuid', user.id)
          .maybeSingle()

        if (error) throw error
        if (!cancelado) setEmpleadoData((actual) => data || actual || null)
      } catch (error) {
        console.error('Error al cargar empleado autenticado:', error)
        if (!cancelado) setEmpleadoData(null)
      } finally {
        if (!cancelado) setEmpleadoLoading(false)
      }
    }

    cargarEmpleado()

    return () => {
      cancelado = true
    }
  }, [user])

  // Login con email y contraseña
  const signIn = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error

      const doctorExternoAuth = await cargarDoctorExternoAuth(data.user.id).catch(() => null)
      if (doctorExternoAuth) {
        const empleadoDoctor = crearEmpleadoDoctorExterno(doctorExternoAuth)
        setEmpleadoData(empleadoDoctor)
        setUser(data.user)
        setEmpleadoLoading(false)
        return {
          data: {
            ...data,
            empleadoData: empleadoDoctor,
            redirectTo: '/radiologia',
          },
          error: null,
        }
      }
      
      return { data: { ...data, redirectTo: '/dashboard' }, error: null }
    } catch (error) {
      setError(error.message)
      return { data: null, error }
    }
  }

  // Logout
  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setError(error.message)
    }
  }

  // Recuperar contraseña
  const resetPassword = async (email) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      setError(error.message)
      return { data: null, error }
    }
  }

  const value = {
    user,
    empleadoData,
    loading,
    empleadoLoading,
    error,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
