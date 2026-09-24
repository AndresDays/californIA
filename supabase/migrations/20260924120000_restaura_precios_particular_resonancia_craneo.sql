-- La resonancia de cráneo se cotizaba a particular en $150 -el precio por
-- defecto- en lugar de su precio de lista.
--
-- La siembra de precios de veterinaria (20260912130000) borra los renglones de
-- particular antes de volver a insertarlos, y para encontrarlos compara también
-- por descripción. El estudio de la mascota y el de la persona se llaman igual
-- -"RM CRANEO SIMPLE" es VET-RM-CRANEO-SIMPLE y RM-CRANEO-SIMPLE-, así que ese
-- borrado se llevó de paso el renglón humano y sólo se volvió a insertar el de
-- veterinaria. Sin renglón, la cotización y la captura caen al precio por
-- defecto.
--
-- Aquí se reponen los dos únicos estudios a los que les pasó: son los que
-- comparten descripción exacta con uno de veterinaria. Se inserta sólo si
-- falta, para no pisar un precio que se haya actualizado después.
--
-- El precio es el de la lista de particular con la que se sembraron
-- (20260511133000), que sigue siendo el vigente.

insert into public.precios_estudios (tipo, clave, descripcion, cliente, precio, fecha)
select v.tipo, v.clave, v.descripcion, v.cliente, v.precio, now()
from (values
	('Estudio', 'RM-CRANEO-SIMPLE', 'RM CRANEO SIMPLE', 'Particular', 4970.00),
	('Estudio', 'RM-CRANEO-CONTRASTADA', 'RM CRANEO CONTRASTADA', 'Particular', 7290.00)
) as v(tipo, clave, descripcion, cliente, precio)
where not exists (
	select 1
	from public.precios_estudios pe
	where pe.clave = v.clave
		and upper(btrim(pe.cliente)) = upper(v.cliente)
);

do $$
declare
	v_fila record;
begin
	for v_fila in
		select v.clave, v.descripcion
		from (values
			('RM-CRANEO-SIMPLE', 'RM CRANEO SIMPLE'),
			('RM-CRANEO-CONTRASTADA', 'RM CRANEO CONTRASTADA')
		) as v(clave, descripcion)
	loop
		if exists (
			select 1
			from public.precios_estudios pe
			where pe.clave = v_fila.clave
				and upper(btrim(pe.cliente)) = 'PARTICULAR'
		) then
			raise notice 'Precio de particular presente para % (%)', v_fila.clave, v_fila.descripcion;
		else
			raise notice 'ATENCION: % sigue sin precio de particular', v_fila.clave;
		end if;
	end loop;
end
$$;

NOTIFY pgrst, 'reload schema';
