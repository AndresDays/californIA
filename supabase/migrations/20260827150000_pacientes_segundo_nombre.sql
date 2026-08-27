-- El alta capturaba un solo campo de nombre, así que "MARIA GUADALUPE" entraba
-- entero en primer_nombre y no había forma de distinguir el segundo nombre al
-- buscar o al armar el nombre completo. Se guarda aparte, como ya se hace con
-- los dos apellidos.
alter table public.pacientes
	add column if not exists segundo_nombre character varying(150);

comment on column public.pacientes.segundo_nombre is 'Segundo nombre del paciente; primer_nombre guarda el primero.';

NOTIFY pgrst, 'reload schema';
