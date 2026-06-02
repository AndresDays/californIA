import React from 'react';
import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase-client'

const AuthContext = createContext({})

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
        const { data, error } = await supabase
          .from('empleados')
          .select('nombre, rol')
          .eq('auth_uuid', user.id)
          .maybeSingle()

        if (error) throw error
        if (!cancelado) setEmpleadoData(data || null)
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
      
      return { data, error: null }
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
