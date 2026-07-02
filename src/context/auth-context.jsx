import React from 'react';
import { createContext, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import { useSessionStore } from '../store/session-store';

const AuthContext = createContext({});

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
    if (!user?.id) return;
    fetchEmpleadoActual(user.id);
  }, [fetchEmpleadoActual, user?.id]);

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
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
