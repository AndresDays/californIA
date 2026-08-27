-- Medisim se dio de alta a mano antes de que corriera su siembra, y el nombre
-- pudo quedar escrito distinto a como está en el tarifario ("MEDISIM" contra
-- "Medisim", o con un espacio de sobra). El precio pactado se busca cruzando
-- ese texto contra precios_estudios.cliente, así que con la mínima diferencia
-- no cruza nada: la captura ofrece todo el catálogo en vez de lo pactado y cada
-- estudio se cobra al precio por defecto.
--
-- Se empareja el nombre con el del tarifario. Sólo cuando hay un único renglón
-- que corresponde: si existieran dos, emparejarlos dejaría dos clientes
-- llamados igual en los selects, y eso se revisa a mano.
update public.clientes
set nombre = 'Medisim'
where upper(btrim(nombre)) = 'MEDISIM'
	and nombre <> 'Medisim'
	and (select count(*) from public.clientes c where upper(btrim(c.nombre)) = 'MEDISIM') = 1;

-- Un alta a mano tampoco dejó reglas de facturación, y sin ellas la captura no
-- sabe que su resonancia va por CDC y el resto de su imagen por CDI.
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
