import { create } from 'zustand';
import { supabase } from '../lib/supabase-client';
import { esDoctorExterno } from '../utils/radiologia-permisos';
import { resolverSucursalEmpleado } from '../utils/sucursal-empleado';

const esColumnaInexistente = (error, columna) =>
  error?.code === '42703' &&
  String(error?.message || '').toLowerCase().includes(String(columna).toLowerCase());

const cargarDoctorExternoAuth = async (authId) => {
  let { data, error } = await supabase
    .from('doctores')
    .select('id_doctor, nombre, auth_uuid, es_radiologo, especialidad')
    .eq('auth_uuid', authId)
    .maybeSingle();

  if (
    esColumnaInexistente(error, 'es_radiologo') ||
    esColumnaInexistente(error, 'especialidad') ||
    error?.code === 'PGRST204'
  ) {
    const respuestaBase = await supabase
      .from('doctores')
      .select('id_doctor, nombre, auth_uuid')
      .eq('auth_uuid', authId)
      .maybeSingle();
    data = respuestaBase.data;
    error = respuestaBase.error;
  }

  if (error) throw error;
  return data;
};

const crearPerfilDoctorExterno = (doctor) => ({
  nombre: doctor.nombre,
  rol: 'doctor_externo',
  id_doctor: doctor.id_doctor,
  doctor_nombre: doctor.nombre,
  es_radiologo: doctor.es_radiologo === true,
  especialidad: doctor.especialidad || null,
});

export const useSessionStore = create((set, get) => ({
  user: null,
  empleadoData: null,
  loading: true,
  empleadoLoading: false,
  error: null,
  sucursalActual: null,

  setUser: (user) => {
    set({ user, empleadoLoading: Boolean(user) });
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
        .select('nombre, rol, id_doctor, sucursal')
        .eq('auth_uuid', authId)
        .maybeSingle();

      if (esColumnaInexistente(error, 'id_doctor')) {
        const respuestaBase = await supabase
          .from('empleados')
          .select('nombre, rol, sucursal')
          .eq('auth_uuid', authId)
          .maybeSingle();
        data = respuestaBase.data;
        error = respuestaBase.error;
      }

      if (error) throw error;

      if (get().user?.id !== authId) return null;

      let empleadoData = data || null;

      if (!empleadoData) {
        const doctorExterno = await cargarDoctorExternoAuth(authId);
        if (get().user?.id !== authId) return null;
        if (doctorExterno) empleadoData = crearPerfilDoctorExterno(doctorExterno);
      }

      if (empleadoData && esDoctorExterno(empleadoData.rol) && !empleadoData.id_doctor) {
        const doctorExterno = await cargarDoctorExternoAuth(authId);

        if (get().user?.id !== authId) return null;

        empleadoData = {
          ...empleadoData,
          id_doctor: doctorExterno?.id_doctor || null,
          doctor_nombre: doctorExterno?.nombre || null,
          es_radiologo: doctorExterno?.es_radiologo === true,
          especialidad: doctorExterno?.especialidad || null,
        };
      }

      if (empleadoData?.sucursal) {
        const { data: sucursales, error: sucursalesError } = await supabase
          .from('sucursales')
          .select('id_sucursal, nombre');
        if (sucursalesError) throw sucursalesError;
        empleadoData = { ...empleadoData, ...resolverSucursalEmpleado(empleadoData, sucursales) };
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
