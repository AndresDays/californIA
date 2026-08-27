-- Medisim tiene convenio y su tarifario ya está cargado en precios_estudios,
-- pero nunca se dio de alta en clientes: por eso no sale en los selects de
-- nuevo paciente, nueva cita, cotización ni en los reportes, y la siembra de
-- convenios_facturacion no encontró a quién colgarle sus reglas.
--
-- El nombre se captura tal cual "Medisim" porque la búsqueda de precios cruza
-- por igualdad exacta contra precios_estudios.cliente, donde quedó así.
--
-- El id se calcula aquí y al final se sincroniza la secuencia, por lo mismo que
-- en la siembra de los clientes de descuento: la identidad viene de una
-- secuencia heredada de cuando clientes y empresas eran la misma tabla y quedó
-- atrás de los ids ya usados, así que dejársela a la base hace chocar el insert
-- contra la llave primaria.

insert into public.clientes (id_cliente, nombre)
select
	(select coalesce(max(id_cliente), 0) from public.clientes) + 1,
	'Medisim'
where not exists (
	select 1 from public.clientes c where upper(btrim(c.nombre)) = 'MEDISIM'
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

-- Con el cliente ya dado de alta se vuelven a sembrar sus reglas de
-- facturación: toda su imagen se factura por CDI (tomografía, ultrasonido,
-- contrastados, otros estudios y rayos X) salvo la resonancia, que va por CDC.
-- La regla de la modalidad concreta gana sobre la del convenio completo.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select c.id_cliente, m.modalidad, m.criterio, m.empresa
from public.clientes c
join (
	values
		('*', '', 'CDI'),
		('resonancia', '', 'CDC')
) as m(modalidad, criterio, empresa) on true
where upper(btrim(c.nombre)) like '%MEDISIM%'
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

NOTIFY pgrst, 'reload schema';
