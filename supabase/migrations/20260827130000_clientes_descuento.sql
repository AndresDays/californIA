-- Hay pacientes a los que se les hace un descuento de mostrador. En lugar de
-- capturar el porcentaje a mano en cada orden, se dan de alta como clientes:
-- al elegirlos, la captura aplica su descuento sola.

-- La identidad de clientes viene de una secuencia heredada (empresas_id_empresa_seq)
-- que quedó atrás de los ids ya usados, así que un insert nuevo chocaba contra
-- la llave primaria. Se adelanta al último id antes de insertar.
select setval(
	pg_get_serial_sequence('public.clientes', 'id_cliente'),
	coalesce((select max(id_cliente) from public.clientes), 0) + 1,
	false
);

insert into public.clientes (nombre)
select v.nombre
from (values ('10%'), ('20%'), ('30%')) as v(nombre)
where not exists (
	select 1 from public.clientes c where btrim(c.nombre) = v.nombre
);

NOTIFY pgrst, 'reload schema';
