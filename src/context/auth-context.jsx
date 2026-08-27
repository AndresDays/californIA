import React from 'react';
import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase-client'
import { useSessionStore } from '../store/session-store'
import { rutaInicialPorRol } from '../utils/role-permissions'

const AuthContext = createContext({});

const esColumnaInexistente = (error, columna) =>
  error?.code === '42703' &&
  String(error?.message || '').toLowerCase().includes(String(columna).toLowerCase());

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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const user = useSessionStore((state) => state.user);
  const empleadoData = useSessionStore((state) => state.empleadoData);
  const loading = useSessionStore((state) => state.loading);
  const empleadoLoading = useSessionStore((state) => state.empleadoLoading);
  const error = useSessionStore((state) => state.error);
  const setUser = useSessionStore((state) => state.setUser);
  const setLoading = useSessionStore((state) => state.setLoading);
  const setError = useSessionStore((state) => state.setError);
  const fetchEmpleadoActual = useSessionStore((state) => state.fetchEmpleadoActual);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setLoading, setUser]);

  useEffect(() => {
    fetchEmpleadoActual(user?.id ?? null)
  }, [user, fetchEmpleadoActual])

  // Login con email y contraseña
  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error

      setUser(data.user)
      const perfil = await fetchEmpleadoActual(data.user.id)
      return {
        data: {
          ...data,
          redirectTo: rutaInicialPorRol(perfil?.rol),
        },
        error: null,
      }
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearSession();
    } catch (error) {
      setError(error.message);
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    }
  };

  const value = {
    user,
    empleadoData,
    loading,
    empleadoLoading,
    error,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
