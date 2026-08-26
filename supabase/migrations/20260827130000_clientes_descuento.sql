-- Hay pacientes a los que se les hace un descuento de mostrador. En lugar de
-- capturar el porcentaje a mano en cada orden, se dan de alta como clientes:
-- al elegirlos, la captura aplica su descuento sola.
--
-- La identidad de clientes viene de una secuencia heredada de cuando clientes y
-- empresas eran la misma tabla (por eso la llave se llama empresas_pkey), y
-- quedó atrás de los ids ya usados. Dejar que la asigne hacía chocar el insert
-- contra la llave primaria, así que los ids se calculan aquí y al final se
-- sincroniza la secuencia para que las altas desde la aplicación tampoco
-- fallen.

insert into public.clientes (id_cliente, nombre)
select
	(select coalesce(max(id_cliente), 0) from public.clientes)
		+ row_number() over (order by v.nombre),
	v.nombre
from (values ('10%'), ('20%'), ('30%')) as v(nombre)
where not exists (
	select 1 from public.clientes c where btrim(c.nombre) = v.nombre
);

do $$
declare
	v_secuencia text;
begin
	v_secuencia := pg_get_serial_sequence('public.clientes', 'id_cliente');

	if v_secuencia is null then
		select quote_ident(schemaname) || '.' || quote_ident(sequencename)
		into v_secuencia
		from pg_sequences
		where sequencename = 'empresas_id_empresa_seq'
		limit 1;
	end if;

	if v_secuencia is not null then
		perform setval(
			v_secuencia,
			coalesce((select max(id_cliente) from public.clientes), 0) + 1,
			false
		);
	end if;
end
$$;

NOTIFY pgrst, 'reload schema';
