alter table public.estudios_imagen_catalogo
	add column if not exists id_empresa integer references public.empresas(id_empresa) on update cascade on delete set null;

update public.estudios_imagen_catalogo eic
set id_empresa = emp.id_empresa
from public.empresas emp
where eic.id_empresa is null
	and (
		(eic.empresa_operativa = 'CDC' and emp.nombre = 'CENTRAL DIAGNOSTICA CALIFORNIA')
		or (eic.empresa_operativa = 'CDI' and emp.nombre = 'CENTRO DE DIAGNOSTICO POR IMAGEN PVR')
	);

create index if not exists idx_estudios_imagen_catalogo_id_empresa_modalidad
on public.estudios_imagen_catalogo (id_empresa, modalidad)
where activo = true;
