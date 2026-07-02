import { create } from 'zustand';
import { supabase } from '../lib/supabase-client';
import { esDoctorExterno } from '../utils/radiologia-permisos';

const esColumnaInexistente = (error, columna) =>
  error?.code === '42703' &&
  String(error?.message || '').toLowerCase().includes(String(columna).toLowerCase());

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
      let { data, error } = await supabase
        .from('empleados')
        .select('nombre, rol, id_doctor')
        .eq('auth_uuid', authId)
        .maybeSingle();

      if (esColumnaInexistente(error, 'id_doctor')) {
        const respuestaBase = await supabase
          .from('empleados')
          .select('nombre, rol')
          .eq('auth_uuid', authId)
          .maybeSingle();
        data = respuestaBase.data;
        error = respuestaBase.error;
      }

      if (error) throw error;

      if (get().user?.id !== authId) return null;

      let empleadoData = data || null;

      if (empleadoData && esDoctorExterno(empleadoData.rol) && !empleadoData.id_doctor) {
        const { data: doctorExterno } = await supabase
          .from('doctores')
          .select('id_doctor, nombre, auth_uuid')
          .eq('auth_uuid', authId)
          .maybeSingle();

        if (get().user?.id !== authId) return null;

        empleadoData = {
          ...empleadoData,
          id_doctor: doctorExterno?.id_doctor || null,
          doctor_nombre: doctorExterno?.nombre || null,
        };
      }

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
