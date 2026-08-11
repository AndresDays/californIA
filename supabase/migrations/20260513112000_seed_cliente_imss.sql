select setval(
	'public.empresas_id_empresa_seq',
	(select max(id_cliente) from public.clientes)
);

insert into public.clientes (nombre)
select 'IMSS'
where not exists (
	select 1 from public.clientes where nombre = 'IMSS'
);
