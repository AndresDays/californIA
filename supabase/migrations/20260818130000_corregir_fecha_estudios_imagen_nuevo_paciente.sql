-- fecha_estudio no incluye zona horaria. Estas filas se crearon desde
-- nuevo-paciente con el mismo instante UTC que su venta y requieren
-- conservar la hora civil de Ciudad de México.
update public.estudios_radiologia as er
set fecha_estudio = er.fecha_estudio - interval '6 hours'
from public.ventas as v
where er.id_venta = v.id_venta
	and er.fecha_estudio = timezone('UTC', v.fecha_venta);
