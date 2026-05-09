alter table public.ventas
add column if not exists id_cita integer;

create index if not exists idx_ventas_id_cita
on public.ventas (id_cita);

create unique index if not exists ventas_id_cita_unique
on public.ventas (id_cita)
where id_cita is not null;

do $$
begin
	if not exists (
		select 1
		from information_schema.table_constraints
		where constraint_schema = 'public'
			and table_name = 'ventas'
			and constraint_name = 'ventas_id_cita_fkey'
	) then
		alter table public.ventas
		add constraint ventas_id_cita_fkey
		foreign key (id_cita)
		references public.citas (id_cita)
		on update cascade
		on delete set null;
	end if;
end $$;

notify pgrst, 'reload schema';
