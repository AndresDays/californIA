import { create } from 'zustand';
import { supabase } from '../lib/supabase-client';

export const useSessionStore = create((set, get) => ({
  user: null,
  empleadoData: null,
  loading: true,
  empleadoLoading: false,
  error: null,
  sucursalActual: null,

  setUser: (user) => {
    set({ user });
    if (!user) {
      set({
        empleadoData: null,
        empleadoLoading: false,
        sucursalActual: null,
      });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setEmpleadoData: (empleadoData) => set({ empleadoData }),
  setSucursalActual: (sucursalActual) => set({ sucursalActual }),

  fetchEmpleadoActual: async (authId) => {
    if (!authId) {
      set({ empleadoData: null, empleadoLoading: false });
      return null;
    }

    set({ empleadoLoading: true });

    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('nombre, rol')
        .eq('auth_uuid', authId)
        .maybeSingle();

      if (error) throw error;

      if (get().user?.id !== authId) return null;

      const empleadoData = data || null;
      set({ empleadoData, empleadoLoading: false });
      return empleadoData;
    } catch (error) {
      console.error('Error al cargar empleado autenticado:', error);
      if (get().user?.id === authId) {
        set({ empleadoData: null, empleadoLoading: false });
      }
      return null;
    }
  },

  clearSession: () =>
    set({
      user: null,
      empleadoData: null,
      loading: false,
      empleadoLoading: false,
      error: null,
      sucursalActual: null,
    }),
}));
