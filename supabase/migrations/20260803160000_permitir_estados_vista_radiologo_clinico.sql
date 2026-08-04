-- El radiólogo clínico puede persistir mediciones y ajustes del visor para los
-- estudios a los que ya tiene acceso mediante las políticas de radiología.
drop policy if exists estudio_dicom_estados_vista_operacion_interna
  on public.estudio_dicom_estados_vista;

create policy estudio_dicom_estados_vista_operacion_autorizada
  on public.estudio_dicom_estados_vista for all to authenticated
  using (
    public.es_empleado_interno_activo()
    or public.es_radiologo_clinico_activo()
  )
  with check (
    public.es_empleado_interno_activo()
    or public.es_radiologo_clinico_activo()
  );

notify pgrst, 'reload schema';
