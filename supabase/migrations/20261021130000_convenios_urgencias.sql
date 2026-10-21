-- Las urgencias que un convenio tiene en su lista de precios son parte del
-- convenio. La regla de "toda su imagen" no las incluye a propósito -se asumió
-- que ningún convenio las traía, y ofrecerlas con el comodín las abría a
-- todos-, así que SSA y Medisim, que sí las tienen pactadas en su lista de
-- imagen 2026, no veían el tipo "Urgencias y otros" al capturar aunque sus
-- precios estuvieran cargados.
--
-- Se le da su propia regla de urgencias a todo convenio que tenga precio para
-- algún estudio de urgencias del catálogo. Va por CDI, que es la empresa de las
-- urgencias en el catálogo. Corre después de las listas de imagen 2026
-- (20261021120000 a 20261021124000), que son las que cargan esos precios.
--
-- Sólo a quien ya es convenio: un cliente sin reglas ve el catálogo completo, y
-- darle una lo dejaría viendo nada más las urgencias. Eso deja fuera a
-- particular y a los clientes de porcentaje.
insert into public.convenios_facturacion (id_cliente, modalidad, criterio, empresa)
select distinct c.id_cliente, 'urgencias_otros', '', 'CDI'
from public.clientes c
where exists (
		select 1
		from public.convenios_facturacion f
		where f.id_cliente = c.id_cliente
	)
	and exists (
		select 1
		from public.precios_estudios p
		join public.estudios_imagen_catalogo e
			on upper(btrim(e.clave)) = upper(btrim(p.clave))
		where e.modalidad = 'urgencias_otros'
			and upper(btrim(p.cliente)) = upper(btrim(c.nombre))
	)
on conflict (id_cliente, modalidad, criterio) do update
set empresa = excluded.empresa;

do $$
declare
	v_fila record;
begin
	for v_fila in
		select c.nombre
		from public.convenios_facturacion f
		join public.clientes c on c.id_cliente = f.id_cliente
		where f.modalidad = 'urgencias_otros'
		order by c.nombre
	loop
		raise notice 'Urgencias en convenio: %', v_fila.nombre;
	end loop;
end
$$;

NOTIFY pgrst, 'reload schema';
