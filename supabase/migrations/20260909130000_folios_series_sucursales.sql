-- Series de folio de las sucursales foráneas.
--
-- Ixtapa y Mascota cobran todo en una sola caja: partir su orden en las series
-- por empresa -A imagen CDI, B imagen CDC, C laboratorio- no dice nada ahí y
-- deja al paciente con dos o tres folios de una misma visita. Cada una lleva su
-- serie corrida, y el folio dice de qué sucursal salió la orden sin abrirla:
--
--   D → Ixtapa
--   E → Mascota
--
-- Las dos facturan por CDC, que es la empresa de esas sucursales.

insert into public.folios_series (serie, empresa, descripcion)
values
	('D', 'CDC', 'Sucursal Ixtapa'),
	('E', 'CDC', 'Sucursal Mascota')
on conflict (serie) do nothing;

-- Por si alguna venta ya se guardó con un folio de estas series -captura
-- manual, pruebas-: el consecutivo arranca después del último usado, para no
-- chocar con la restricción de folio único.
update public.folios_series fs
set ultimo = greatest(fs.ultimo, coalesce((
	select max(substring(v.folio from '^[A-Z](\d+)$')::integer)
	from public.ventas v
	where v.folio ~ ('^' || fs.serie || '\d+$')
), 0))
where fs.serie in ('D', 'E');

NOTIFY pgrst, 'reload schema';
