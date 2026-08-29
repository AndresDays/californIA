-- El laboratorio se factura por CDC aunque la imagen del convenio vaya por CDI.
-- La regla de "toda su imagen" no arrastra el laboratorio a propósito —se
-- captura como particular salvo que el convenio lo tenga pactado con su propia
-- regla—, así que a los convenios cuya imagen va por CDI no les aparecía ningún
-- tipo de estudio al elegir CDC, y su tarifario de laboratorio, que sí está
-- cargado, quedaba inservible.
--
-- Se le da su regla a todo convenio que tenga precios de laboratorio pactados.
-- El laboratorio se reconoce cruzando la clave contra el catálogo, que es lo que
-- distingue un estudio de laboratorio de uno de imagen.
--
-- Sólo a quien ya es convenio: un cliente sin reglas ve el catálogo completo de
-- la empresa elegida, y darle una lo dejaría viendo nada más el laboratorio.
-- Eso deja fuera a particular y a los clientes de porcentaje, que no son un
-- convenio sino un descuento de mostrador.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select distinct c.id_cliente, 'laboratorio', '', 'CDC'
from public.clientes c
where exists (
		select 1
		from public.convenios_facturacion f
		where f.id_cliente = c.id_cliente
	)
	and exists (
		select 1
		from public.precios_estudios p
		join public.estudios_lab_catalogo e
			on upper(btrim(e.clave)) = upper(btrim(p.clave))
		where upper(btrim(p.cliente)) = upper(btrim(c.nombre))
	)
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

NOTIFY pgrst, 'reload schema';
