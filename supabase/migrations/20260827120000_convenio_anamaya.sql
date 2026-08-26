-- Odile y Anamaya son el mismo convenio y en clientes está dado de alta como
-- "CENTRO MEDICO ANAMAYA", que la siembra anterior no reconocía: sin regla, su
-- imagen se facturaba con la empresa del catálogo y en la captura sólo salían
-- los estudios que CDC tiene por su cuenta (laboratorio, resonancia y
-- veterinaria).
--
-- Se busca por coincidencia para que las variantes del nombre queden cubiertas.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select c.id_cliente, '*', '', 'CDC'
from public.clientes c
where upper(btrim(c.nombre)) like '%ANAMAYA%'
	or upper(btrim(c.nombre)) like '%ODILE%'
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

NOTIFY pgrst, 'reload schema';
