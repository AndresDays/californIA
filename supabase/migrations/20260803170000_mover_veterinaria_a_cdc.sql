update public.estudios_imagen_catalogo
set empresa_operativa = 'CDC', updated_at = now()
where modalidad = 'veterinaria'
	and empresa_operativa <> 'CDC';

update public.estudios_imagen_catalogo estudio
set id_empresa = empresa.id_empresa, updated_at = now()
from public.empresas empresa
where estudio.modalidad = 'veterinaria'
	and upper(empresa.nombre) = 'CENTRAL DIAGNOSTICA CALIFORNIA'
	and estudio.id_empresa is distinct from empresa.id_empresa;

insert into public.tipos_estudio (nombre)
select 'Veterinaria'
where not exists (
	select 1
	from public.tipos_estudio
	where lower(nombre) = 'veterinaria'
);

insert into public.empresa_tipos_estudio (id_empresa, id_tipo_estudio)
select empresa.id_empresa, tipo.id_tipo_estudio
from public.empresas empresa
join public.tipos_estudio tipo on lower(tipo.nombre) = 'veterinaria'
where upper(empresa.nombre) = 'CENTRAL DIAGNOSTICA CALIFORNIA'
on conflict (id_empresa, id_tipo_estudio) do nothing;
