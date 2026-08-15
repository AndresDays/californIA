alter table public.ventas
	add column if not exists id_empresa integer references public.empresas(id_empresa)
	on update cascade on delete restrict;

update public.ventas venta
set id_empresa = cita.id_empresa
from public.citas cita
where venta.id_empresa is null
	and venta.id_cita = cita.id_cita
	and cita.id_empresa is not null;

update public.ventas venta
set id_empresa = empresa.id_empresa
from public.empresas empresa
where venta.id_empresa is null
	and upper(empresa.nombre) = 'CENTRAL DIAGNOSTICA CALIFORNIA';

alter table public.ventas
	alter column id_empresa set not null;
