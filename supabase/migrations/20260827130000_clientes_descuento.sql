-- Hay pacientes a los que se les hace un descuento de mostrador. En lugar de
-- capturar el porcentaje a mano en cada orden, se dan de alta como clientes:
-- al elegirlos, la captura aplica su descuento sola.

insert into public.clientes (nombre)
select v.nombre
from (values ('10%'), ('20%'), ('30%')) as v(nombre)
where not exists (
	select 1 from public.clientes c where btrim(c.nombre) = v.nombre
);

NOTIFY pgrst, 'reload schema';
