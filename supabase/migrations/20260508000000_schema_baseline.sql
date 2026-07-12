create extension if not exists pgcrypto;
set check_function_bodies = false;
set row_security = off;

--
-- Name: analitos_enforce_campos_por_tipo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analitos_enforce_campos_por_tipo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.tipo_resultado is null or new.tipo_resultado = '' then
    new.vr_bajo := null;
    new.vr_alto := null;
    new.referencia := null;
    new.valores_predeterminados := null;
    new.modo_texto := null;
    new.ancho := null;
    new.alto := null;
    new.alineacion := null;
    new.saltar_pagina := false;
    new.nombre_archivo := null;
    return new;
  end if;

  if new.tipo_resultado = 'Numerico' then
    new.referencia := null;
    new.valores_predeterminados := null;
    new.modo_texto := null;
    new.ancho := null;
    new.alto := null;
    new.alineacion := null;
    new.saltar_pagina := false;
    new.nombre_archivo := null;
    return new;
  end if;

  if new.tipo_resultado = 'Subtitulo' then
    new.vr_bajo := null;
    new.vr_alto := null;
    new.valores_predeterminados := null;
    new.modo_texto := null;
    new.ancho := null;
    new.alto := null;
    new.alineacion := null;
    new.saltar_pagina := false;
    new.nombre_archivo := null;
    return new;
  end if;

  if new.tipo_resultado = 'Texto' then
    new.vr_bajo := null;
    new.vr_alto := null;
    new.ancho := null;
    new.alto := null;
    new.alineacion := null;
    new.saltar_pagina := false;
    new.nombre_archivo := null;
    if new.modo_texto is null or new.modo_texto = '' then
      new.modo_texto := 'Abierto';
    end if;
    return new;
  end if;

  if new.tipo_resultado = 'Valor Referenciado' or new.tipo_resultado = 'Documento' then
    new.vr_bajo := null;
    new.vr_alto := null;
    new.referencia := null;
    new.valores_predeterminados := null;
    new.modo_texto := null;
    new.ancho := null;
    new.alto := null;
    new.alineacion := null;
    new.saltar_pagina := false;
    new.nombre_archivo := null;
    return new;
  end if;

  if new.tipo_resultado = 'Imagen' then
    new.vr_bajo := null;
    new.vr_alto := null;
    new.referencia := null;
    new.valores_predeterminados := null;
    new.modo_texto := null;
    if new.alineacion is null or new.alineacion = '' then
      new.alineacion := 'Centro';
    end if;
    return new;
  end if;

  return new;
end;
$$;



--
-- Name: buscar_resultados_portal(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buscar_resultados_portal(p_folio text, p_telefono text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
	v_venta record;
	v_telefono text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
	v_saldo numeric := 0;
	v_laboratorio jsonb := '[]'::jsonb;
	v_radiologia jsonb := '[]'::jsonb;
begin
	select
		v.id_venta,
		v.folio,
		v.fecha_venta,
		coalesce(v.total, 0) as total,
		coalesce(v.pago_recibido, 0) as pago_recibido,
		p.id_paciente,
		p.nombre as paciente_nombre,
		p.fecha_nacimiento,
		p.sexo,
		p.telefono,
		p.email,
		c.nombre as cliente_nombre
	into v_venta
	from public.ventas v
	join public.pacientes p on p.id_paciente = v.id_paciente
	left join public.clientes c on c.id_cliente = v.id_cliente
	where v.estado = 'activo'
		and v.folio = btrim(coalesce(p_folio, ''))
		and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') = v_telefono
	limit 1;

	if v_venta.id_venta is null then
		return jsonb_build_object(
			'encontrado', false,
			'mensaje', 'No encontramos resultados con ese folio y telefono.'
		);
	end if;

	v_saldo := greatest(coalesce(v_venta.total, 0) - coalesce(v_venta.pago_recibido, 0), 0);

	if v_saldo > 0 then
		return jsonb_build_object(
			'encontrado', true,
			'autorizado', false,
			'mensaje', 'La solicitud tiene adeudo pendiente. Favor de pasar a recepcion.',
			'saldo', v_saldo,
			'venta', jsonb_build_object(
				'id_venta', v_venta.id_venta,
				'folio', v_venta.folio,
				'fecha_venta', v_venta.fecha_venta,
				'paciente', v_venta.paciente_nombre,
				'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
			)
		);
	end if;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_laboratorio
	from (
		select jsonb_build_object(
			'id', ev.id_estudio_venta,
			'tipo', 'laboratorio',
			'clave', ev.clave_estudio,
			'descripcion', ev.descripcion_estudio,
			'estado', ev.estado_validacion,
			'fecha_entrega', ev.fecha_entrega,
			'analitos', coalesce((
				select jsonb_agg(
					jsonb_build_object(
						'clave', r.clave,
						'descripcion', coalesce(a.descripcion, r.clave),
						'resultado', r.valor,
						'unidades', coalesce(a.unidad, ''),
						'referencia',
							case
								when a.tipo_resultado = 'Subtitulo' then ''
								when a.vr_bajo is not null and a.vr_alto is not null then concat(a.vr_bajo, ' - ', a.vr_alto)
								when a.vr_bajo is not null then concat('>', a.vr_bajo)
								else coalesce(a.referencia, '')
							end
					)
					order by coalesce(ea.orden, 9999), r.clave
				)
				from jsonb_each_text(
					case
						when coalesce(btrim(ev.resultados), '') = '' then '{}'::jsonb
						else ev.resultados::jsonb
					end
				) as r(clave, valor)
				left join public.analitos a on a.clave = r.clave
				left join public.estudio_analitos ea
					on ea.clave_estudio = ev.clave_estudio
					and ea.id_analito = a.id_analito
			), '[]'::jsonb)
		) as estudio
		from public.estudios_venta ev
		where ev.id_venta = v_venta.id_venta
			and ev.estado_validacion = 'validado'
			and coalesce(ev.muestra_pendiente, false) = false
			and coalesce(btrim(ev.resultados), '') not in ('', '{}')
	) estudios;

	select coalesce(jsonb_agg(estudio order by estudio->>'descripcion'), '[]'::jsonb)
	into v_radiologia
	from (
		select jsonb_build_object(
			'id', er.id_estudio,
			'tipo', 'imagen',
			'clave', concat('IMG-', er.id_estudio),
			'descripcion', coalesce(er.descripcion, er.tipo_estudio),
			'estado', case when er.entregado then 'entregado' else 'interpretado' end,
			'fecha_estudio', er.fecha_estudio,
			'fecha_entrega', er.fecha_entrega,
			'reporte', er.reporte
		) as estudio
		from public.estudios_radiologia er
		where er.id_venta = v_venta.id_venta
			and (coalesce(er.listo_entrega, false) = true or coalesce(er.entregado, false) = true)
			and coalesce(btrim(er.reporte), '') <> ''
	) estudios;

	return jsonb_build_object(
		'encontrado', true,
		'autorizado', true,
		'saldo', 0,
		'venta', jsonb_build_object(
			'id_venta', v_venta.id_venta,
			'folio', v_venta.folio,
			'fecha_venta', v_venta.fecha_venta,
			'paciente', v_venta.paciente_nombre,
			'fecha_nacimiento', v_venta.fecha_nacimiento,
			'sexo', v_venta.sexo,
			'telefono', v_venta.telefono,
			'email', v_venta.email,
			'cliente', coalesce(v_venta.cliente_nombre, 'Particular')
		),
		'estudios', v_laboratorio || v_radiologia
	);
end;
$$;



--
-- Name: buscar_resultados_portal_seguro(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buscar_resultados_portal_seguro(p_folio text, p_telefono text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
	v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
	v_origen text;
	v_origen_hash text;
	v_intentos integer;
	v_resultado jsonb;
begin
	v_origen := coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', v_headers->>'x-client-info', 'sin_origen');
	v_origen_hash := encode(digest(v_origen, 'sha256'), 'hex');

	select count(*) into v_intentos
	from public.portal_resultados_accesos
	where origen_hash = v_origen_hash
		and created_at > now() - interval '15 minutes';

	if v_intentos >= 8 then
		insert into public.portal_resultados_accesos (origen_hash, bloqueado)
		values (v_origen_hash, true);
		return jsonb_build_object(
			'encontrado', false,
			'autorizado', false,
			'mensaje', 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
		);
	end if;

	v_resultado := public.buscar_resultados_portal(p_folio, p_telefono);
	insert into public.portal_resultados_accesos (origen_hash, exitoso)
	values (v_origen_hash, coalesce((v_resultado->>'autorizado')::boolean, false));
	return v_resultado;
end;
$$;



--
-- Name: calcular_edad_doctor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_edad_doctor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL THEN
    NEW.edad := DATE_PART('year', AGE(NEW.fecha_nacimiento));
  END IF;
  RETURN NEW;
END;
$$;



--
-- Name: calcular_edad_empleado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_edad_empleado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL THEN
    NEW.edad := DATE_PART('year', AGE(NEW.fecha_nacimiento));
  END IF;
  RETURN NEW;
END;
$$;



--
-- Name: calcular_edad_paciente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_edad_paciente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL THEN
    NEW.edad := DATE_PART('year', AGE(NEW.fecha_nacimiento));
  END IF;
  RETURN NEW;
END;
$$;



--
-- Name: es_destinatario_notificacion(uuid, text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_destinatario_notificacion(p_usuario_destino uuid, p_rol_destino text, p_canal_destino text, p_id_sucursal integer, p_sucursal text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
	with empleado_actual as (
		select
			e.auth_uuid,
			public.normalizar_texto_notificacion(e.rol) as rol,
			s.id_sucursal,
			public.normalizar_texto_notificacion(e.sucursal) as sucursal
		from public.empleados e
		left join public.sucursales s
			on public.normalizar_texto_notificacion(s.nombre) = public.normalizar_texto_notificacion(e.sucursal)
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) = true
		limit 1
	),
	destino as (
		select
			public.normalizar_texto_notificacion(p_rol_destino) as rol_destino,
			public.normalizar_texto_notificacion(coalesce(p_canal_destino, 'todos')) as canal_destino,
			public.normalizar_texto_notificacion(p_sucursal) as sucursal_destino
	)
	select exists (
		select 1
		from empleado_actual e
		cross join destino d
		where (p_usuario_destino is null or p_usuario_destino = auth.uid())
			and (p_id_sucursal is null or e.id_sucursal is null or p_id_sucursal = e.id_sucursal)
			and (d.sucursal_destino = '' or e.sucursal = '' or d.sucursal_destino = e.sucursal)
			and (
				d.rol_destino in ('', 'todos', e.rol)
				or d.canal_destino in ('', 'todos')
				or (
					d.canal_destino in ('captura', 'laboratorio')
					and e.rol in ('quimico', 'tecnico', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino = 'radiologia'
					and e.rol in ('radiologo', 'tecnico_radiologia', 'tecnico', 'administrador', 'admin', 'desarrollador')
				)
				or (
					d.canal_destino in ('entrega', 'recepcion')
					and e.rol in ('recepcionista', 'administrador', 'admin', 'desarrollador')
				)
			)
	);
$$;



--
-- Name: es_empleado_interno_activo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_empleado_interno_activo() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and coalesce(e.activo, true) is true
	);
$$;



--
-- Name: es_usuario_plantillas_radiologia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_usuario_plantillas_radiologia() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
	select exists (
		select 1
		from public.empleados e
		where e.auth_uuid = auth.uid()
			and translate(lower(coalesce(e.rol, '')), 'áéíóúü', 'aeiouu') in ('desarrollador', 'radiologo')
			and coalesce(e.activo, true) = true
	);
$$;



--
-- Name: estudios_imagen_catalogo_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.estudios_imagen_catalogo_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
	new.updated_at = now();
	return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    id_empleado integer NOT NULL,
    nombre character varying(255) NOT NULL,
    fecha_nacimiento date,
    edad integer,
    sexo character varying(20),
    direccion text,
    telefono character varying(50),
    email character varying(150),
    rol character varying(50) DEFAULT 'empleado'::character varying,
    sucursal character varying(150),
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    auth_uuid uuid,
    usuario character varying(100),
    ultimo_login timestamp with time zone,
    foto_perfil text,
    firma_digital text,
    cedula text,
    especialidad text,
    firma_url text,
    id_doctor bigint
);



--
-- Name: COLUMN empleados.sucursal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.sucursal IS 'Sucursal donde trabaja el empleado';



--
-- Name: COLUMN empleados.auth_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.auth_uuid IS 'UUID del usuario en Supabase Auth. Vincula empleado con cuenta de autenticación.';



--
-- Name: COLUMN empleados.usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.usuario IS 'Nombre de usuario para login en el sistema';



--
-- Name: COLUMN empleados.ultimo_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.ultimo_login IS 'Fecha y hora del último inicio de sesión';



--
-- Name: COLUMN empleados.foto_perfil; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.foto_perfil IS 'URL o base64 de la foto de perfil del empleado';



--
-- Name: COLUMN empleados.firma_digital; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.firma_digital IS 'Imagen base64 de la firma digital del empleado para reportes';



--
-- Name: get_empleado_actual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_empleado_actual() RETURNS public.empleados
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT * FROM empleados 
  WHERE auth_uuid = auth.uid()
  LIMIT 1;
$$;



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.perfiles_usuario (id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;



--
-- Name: marcar_estudio_analizado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marcar_estudio_analizado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.estudio_radiologia
    SET analizado_ia = true
    WHERE id_radiologia = NEW.id_radiologia;
    RETURN NEW;
END;
$$;



--
-- Name: normalizar_texto_notificacion(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalizar_texto_notificacion(valor text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
	select regexp_replace(
		translate(lower(trim(coalesce(valor, ''))), 'áéíóúüñ', 'aeiouun'),
		'[^a-z0-9]+',
		'_',
		'g'
	);
$$;



--
-- Name: plantillas_radiologia_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.plantillas_radiologia_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
	new.updated_at = now();
	return new;
end;
$$;



--
-- Name: set_paciente_edad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_paciente_edad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NULL THEN
    NEW.edad := NULL;
  ELSE
    NEW.edad := date_part('year', age(NEW.fecha_nacimiento))::integer;
  END IF;
  RETURN NEW;
END;
$$;



--
-- Name: set_turnos_pacientes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_turnos_pacientes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
	new.updated_at = now();
	return new;
end;
$$;



--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;



--
-- Name: update_cotizaciones_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cotizaciones_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;



--
-- Name: update_doctores_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_doctores_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;



--
-- Name: update_empleados_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_empleados_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;



--
-- Name: update_fecha_ultima_visita(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_fecha_ultima_visita() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.paciente
    SET fecha_ultima_visita = NEW.fecha_hora
    WHERE id_paciente = NEW.id_paciente;
    RETURN NEW;
END;
$$;



--
-- Name: update_pacientes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pacientes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



--
-- Name: analisis_ia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analisis_ia (
    id_diagnostico uuid DEFAULT gen_random_uuid() NOT NULL,
    id_radiologia uuid,
    atelectasis numeric(6,4),
    cardiomegaly numeric(6,4),
    effusion numeric(6,4),
    infiltration numeric(6,4),
    mass numeric(6,4),
    nodule numeric(6,4),
    pneumonia numeric(6,4),
    pneumothorax numeric(6,4),
    consolidation numeric(6,4),
    edema numeric(6,4),
    emphysema numeric(6,4),
    fibrosis numeric(6,4),
    hernia numeric(6,4),
    modelo_version text DEFAULT 'swin-transformer-v1.0'::text,
    confianza_promedio numeric(6,4),
    timestamp_analisis timestamp with time zone DEFAULT now(),
    tiempo_procesamiento_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT analisis_ia_atelectasis_check CHECK (((atelectasis >= (0)::numeric) AND (atelectasis <= (1)::numeric))),
    CONSTRAINT analisis_ia_cardiomegaly_check CHECK (((cardiomegaly >= (0)::numeric) AND (cardiomegaly <= (1)::numeric))),
    CONSTRAINT analisis_ia_consolidation_check CHECK (((consolidation >= (0)::numeric) AND (consolidation <= (1)::numeric))),
    CONSTRAINT analisis_ia_edema_check CHECK (((edema >= (0)::numeric) AND (edema <= (1)::numeric))),
    CONSTRAINT analisis_ia_effusion_check CHECK (((effusion >= (0)::numeric) AND (effusion <= (1)::numeric))),
    CONSTRAINT analisis_ia_emphysema_check CHECK (((emphysema >= (0)::numeric) AND (emphysema <= (1)::numeric))),
    CONSTRAINT analisis_ia_fibrosis_check CHECK (((fibrosis >= (0)::numeric) AND (fibrosis <= (1)::numeric))),
    CONSTRAINT analisis_ia_hernia_check CHECK (((hernia >= (0)::numeric) AND (hernia <= (1)::numeric))),
    CONSTRAINT analisis_ia_infiltration_check CHECK (((infiltration >= (0)::numeric) AND (infiltration <= (1)::numeric))),
    CONSTRAINT analisis_ia_mass_check CHECK (((mass >= (0)::numeric) AND (mass <= (1)::numeric))),
    CONSTRAINT analisis_ia_nodule_check CHECK (((nodule >= (0)::numeric) AND (nodule <= (1)::numeric))),
    CONSTRAINT analisis_ia_pneumonia_check CHECK (((pneumonia >= (0)::numeric) AND (pneumonia <= (1)::numeric))),
    CONSTRAINT analisis_ia_pneumothorax_check CHECK (((pneumothorax >= (0)::numeric) AND (pneumothorax <= (1)::numeric)))
);



--
-- Name: analito_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analito_documentos (
    id_documento bigint NOT NULL,
    id_analito bigint NOT NULL,
    contenido_html text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: analito_documentos_id_documento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analito_documentos_id_documento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: analito_documentos_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analito_documentos_id_documento_seq OWNED BY public.analito_documentos.id_documento;



--
-- Name: analito_referencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analito_referencias (
    id_referencia bigint NOT NULL,
    id_analito bigint NOT NULL,
    edad_inicial integer NOT NULL,
    edad_final integer NOT NULL,
    unidad_edad character varying(20) NOT NULL,
    sexo character varying(10) NOT NULL,
    condicion_especial character varying(100),
    vr_bajo numeric(10,2),
    vr_alto numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT analito_referencias_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['M'::character varying, 'F'::character varying, 'Ambos'::character varying])::text[]))),
    CONSTRAINT analito_referencias_unidad_edad_check CHECK (((unidad_edad)::text = ANY ((ARRAY['Años'::character varying, 'Meses'::character varying, 'Días'::character varying])::text[])))
);



--
-- Name: analito_referencias_id_referencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analito_referencias_id_referencia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: analito_referencias_id_referencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analito_referencias_id_referencia_seq OWNED BY public.analito_referencias.id_referencia;



--
-- Name: analitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analitos (
    id_analito integer NOT NULL,
    clave character varying(100) NOT NULL,
    bitacora character varying(100),
    descripcion text NOT NULL,
    resultado_defecto text,
    unidad character varying(50),
    digitos character varying(20),
    tipo_resultado character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    vr_bajo character varying(50),
    vr_alto character varying(50),
    referencia text,
    valores_predeterminados text,
    modo_texto text,
    ancho text,
    alto text,
    alineacion text,
    saltar_pagina boolean DEFAULT false NOT NULL,
    nombre_archivo text,
    CONSTRAINT analitos_alineacion_check CHECK ((alineacion = ANY (ARRAY['Izquierda'::text, 'Centro'::text, 'Derecha'::text]))),
    CONSTRAINT analitos_modo_texto_check CHECK ((modo_texto = ANY (ARRAY['Abierto'::text, 'Restringido'::text])))
);



--
-- Name: analitos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analitos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: analitos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analitos_id_seq OWNED BY public.analitos.id_analito;



--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id_area integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id_area;



--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id_log uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario uuid,
    accion text NOT NULL,
    tabla text NOT NULL,
    registro_id uuid,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT now()
);



--
-- Name: autorizaciones_entrega_adeudo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autorizaciones_entrega_adeudo (
    id_autorizacion bigint NOT NULL,
    id_venta integer,
    folio text,
    saldo_autorizado numeric(12,2) NOT NULL,
    motivo text NOT NULL,
    autorizado_por_nombre text,
    autorizado_por_rol text,
    autorizado_por_auth_uuid uuid,
    usado boolean DEFAULT false NOT NULL,
    usado_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: autorizaciones_entrega_adeudo_id_autorizacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.autorizaciones_entrega_adeudo_id_autorizacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: autorizaciones_entrega_adeudo_id_autorizacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.autorizaciones_entrega_adeudo_id_autorizacion_seq OWNED BY public.autorizaciones_entrega_adeudo.id_autorizacion;



--
-- Name: citas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.citas (
    id_cita integer NOT NULL,
    id_paciente integer,
    tipo_estudio character varying(255),
    fecha_estudio timestamp without time zone NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    monto numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    id_sucursal integer,
    id_cliente integer,
    nombre_paciente character varying(255),
    telefono_paciente character varying(20),
    id_empresa bigint,
    id_tipo_estudio bigint,
    whatsapp_recordatorio_enviado_at timestamp with time zone,
    whatsapp_confirmacion_estado text DEFAULT 'pendiente'::text,
    whatsapp_confirmacion_respuesta text,
    whatsapp_confirmacion_at timestamp with time zone,
    whatsapp_recordatorio_sid text,
    whatsapp_respuesta_sid text,
    CONSTRAINT citas_whatsapp_confirmacion_estado_check CHECK ((whatsapp_confirmacion_estado = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'cancelada'::text, 'sin_telefono'::text, 'error_envio'::text])))
);



--
-- Name: TABLE citas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.citas IS 'Citas médicas agendadas';



--
-- Name: COLUMN citas.id_paciente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.citas.id_paciente IS 'ID del paciente en tabla pacientes (NULL si no está registrado)';



--
-- Name: COLUMN citas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.citas.estado IS 'Estados: pendiente, confirmada, en_proceso, completada, cancelada';



--
-- Name: COLUMN citas.nombre_paciente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.citas.nombre_paciente IS 'Nombre del paciente (puede existir sin registro en tabla pacientes)';



--
-- Name: COLUMN citas.telefono_paciente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.citas.telefono_paciente IS 'Teléfono del paciente (puede existir sin registro en tabla pacientes)';



--
-- Name: citas_id_cita_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.citas_id_cita_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: citas_id_cita_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.citas_id_cita_seq OWNED BY public.citas.id_cita;



--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id_cliente bigint NOT NULL,
    nombre character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: comentarios_estudio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comentarios_estudio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_estudio integer NOT NULL,
    texto text NOT NULL,
    autor_nombre text,
    autor_iniciales text,
    autor_uuid uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);



--
-- Name: cotizaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizaciones (
    id_cotizacion integer NOT NULL,
    numero_cotizacion character varying(20) NOT NULL,
    nombre_paciente character varying(200) NOT NULL,
    id_cliente integer,
    condiciones_paciente text,
    estudios jsonb NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    fecha_cotizacion timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: TABLE cotizaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cotizaciones IS 'Almacena las cotizaciones generadas para pacientes';



--
-- Name: COLUMN cotizaciones.numero_cotizacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.numero_cotizacion IS 'Número único de cotización (ej: COT-001)';



--
-- Name: COLUMN cotizaciones.estudios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.estudios IS 'Array JSON con estudios [{clave, descripcion, precio}]';



--
-- Name: COLUMN cotizaciones.subtotal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.subtotal IS 'Suma de precios de estudios';



--
-- Name: COLUMN cotizaciones.descuento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.descuento IS 'Monto de descuento aplicado';



--
-- Name: COLUMN cotizaciones.descuento_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.descuento_porcentaje IS 'Porcentaje de descuento aplicado';



--
-- Name: COLUMN cotizaciones.total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.total IS 'Total final (subtotal - descuento)';



--
-- Name: cotizaciones_id_cotizacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizaciones_id_cotizacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: cotizaciones_id_cotizacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizaciones_id_cotizacion_seq OWNED BY public.cotizaciones.id_cotizacion;



--
-- Name: doctores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctores (
    id_doctor integer NOT NULL,
    nombre character varying(255) NOT NULL,
    apellido_paterno character varying(150),
    apellido_materno character varying(150),
    primer_nombre character varying(150),
    fecha_nacimiento date,
    edad integer,
    sexo character varying(20),
    telefono character varying(50),
    email character varying(150),
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    usuario character varying,
    contrasena character varying,
    es_radiologo boolean DEFAULT false NOT NULL,
    especialidad text,
    auth_uuid uuid,
    tipo_doctor text DEFAULT 'particular'::text NOT NULL,
    institucion text,
    CONSTRAINT doctores_tipo_doctor_check CHECK ((tipo_doctor = ANY (ARRAY['interno'::text, 'particular'::text, 'institucion'::text])))
);



--
-- Name: doctores_id_doctor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctores_id_doctor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: doctores_id_doctor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctores_id_doctor_seq OWNED BY public.doctores.id_doctor;



--
-- Name: empleados_id_empleado_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleados_id_empleado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: empleados_id_empleado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleados_id_empleado_seq OWNED BY public.empleados.id_empleado;



--
-- Name: empresa_tipos_estudio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_tipos_estudio (
    id integer NOT NULL,
    id_empresa integer,
    id_tipo_estudio integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: empresa_tipos_estudio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresa_tipos_estudio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: empresa_tipos_estudio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresa_tipos_estudio_id_seq OWNED BY public.empresa_tipos_estudio.id;



--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id_empresa integer NOT NULL,
    nombre character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: empresas_id_empresa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clientes ALTER COLUMN id_cliente ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.empresas_id_empresa_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- Name: empresas_id_empresa_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_empresa_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: empresas_id_empresa_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_empresa_seq1 OWNED BY public.empresas.id_empresa;



--
-- Name: equipos_lab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos_lab (
    id integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: equipos_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_lab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: equipos_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_lab_id_seq OWNED BY public.equipos_lab.id;



--
-- Name: estudio_analitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudio_analitos (
    id_estudio_analito integer NOT NULL,
    clave_estudio character varying(50) NOT NULL,
    id_analito integer,
    orden integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);



--
-- Name: estudio_analitos_id_estudio_analito_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudio_analitos_id_estudio_analito_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: estudio_analitos_id_estudio_analito_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudio_analitos_id_estudio_analito_seq OWNED BY public.estudio_analitos.id_estudio_analito;



--
-- Name: estudio_dicom_imagenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudio_dicom_imagenes (
    id_imagen bigint NOT NULL,
    id_estudio integer NOT NULL,
    bucket text DEFAULT 'radiologia'::text NOT NULL,
    storage_path text NOT NULL,
    file_name text,
    file_size bigint,
    mime_type text,
    modality text,
    study_instance_uid text,
    series_instance_uid text,
    series_description text,
    instance_number integer,
    frame_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: estudio_dicom_imagenes_id_imagen_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estudio_dicom_imagenes ALTER COLUMN id_imagen ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.estudio_dicom_imagenes_id_imagen_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- Name: estudios_imagen_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios_imagen_catalogo (
    id bigint NOT NULL,
    clave text NOT NULL,
    descripcion text NOT NULL,
    empresa_operativa text NOT NULL,
    modalidad text NOT NULL,
    area text,
    region_anatomica text,
    requiere_contraste boolean DEFAULT false NOT NULL,
    requiere_interpretacion boolean DEFAULT true NOT NULL,
    dias_proceso integer DEFAULT 1 NOT NULL,
    preparacion text,
    duracion_minutos integer,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id_empresa integer,
    CONSTRAINT estudios_imagen_catalogo_dias_proceso_check CHECK ((dias_proceso >= 0)),
    CONSTRAINT estudios_imagen_catalogo_duracion_check CHECK (((duracion_minutos IS NULL) OR (duracion_minutos > 0))),
    CONSTRAINT estudios_imagen_catalogo_empresa_check CHECK ((empresa_operativa = ANY (ARRAY['CDC'::text, 'CDI'::text])))
);



--
-- Name: estudios_imagen_catalogo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudios_imagen_catalogo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: estudios_imagen_catalogo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudios_imagen_catalogo_id_seq OWNED BY public.estudios_imagen_catalogo.id;



--
-- Name: estudios_lab_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios_lab_catalogo (
    id integer NOT NULL,
    key character varying(50),
    clave character varying(50),
    descripcion character varying(500),
    area character varying(100),
    tipo_muestra character varying(100),
    recipiente character varying(100),
    metodo character varying(100),
    tecnica character varying(100),
    equipo character varying(100),
    condiciones_paciente text,
    etiquetas_extra text,
    dias_proceso integer DEFAULT 0,
    imprimir_metodo boolean DEFAULT false,
    imprimir_tecnica boolean DEFAULT false,
    imprimir_equipo boolean DEFAULT false,
    imprimir_muestra boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: estudios_lab_catalogo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudios_lab_catalogo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: estudios_lab_catalogo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudios_lab_catalogo_id_seq OWNED BY public.estudios_lab_catalogo.id;



--
-- Name: estudios_radiologia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios_radiologia (
    id_estudio integer NOT NULL,
    id_paciente integer,
    tipo_estudio character varying(20) NOT NULL,
    estado character varying(50) DEFAULT 'POR ASIGNAR'::character varying,
    id_doctor_asignado integer,
    sucursal character varying(100),
    fecha_estudio timestamp without time zone DEFAULT now(),
    reporte text,
    prioridad character varying(20) DEFAULT 'NORMAL'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    storage_path text,
    id_referente uuid,
    id_radiologo integer,
    id_tecnico integer,
    alta_prioridad boolean DEFAULT false NOT NULL,
    etiquetas text[] DEFAULT '{}'::text[] NOT NULL,
    primer_reporte_at timestamp with time zone,
    primer_reporte_usuario text,
    descripcion text,
    solicitud_url text,
    id_venta integer,
    id_estudio_venta integer,
    listo_entrega boolean DEFAULT false NOT NULL,
    entregado boolean DEFAULT false NOT NULL,
    fecha_entrega timestamp with time zone,
    id_doctor integer
);



--
-- Name: TABLE estudios_radiologia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.estudios_radiologia IS 'Tabla principal de estudios radiológicos (DX, US, CT, XR, MR)';



--
-- Name: estudios_radiologia_id_estudio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudios_radiologia_id_estudio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: estudios_radiologia_id_estudio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudios_radiologia_id_estudio_seq OWNED BY public.estudios_radiologia.id_estudio;



--
-- Name: estudios_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios_venta (
    id_estudio_venta integer NOT NULL,
    id_venta integer,
    clave_estudio character varying(80) NOT NULL,
    descripcion_estudio text NOT NULL,
    precio numeric(10,2) NOT NULL,
    area character varying(100),
    dias_proceso integer DEFAULT 1,
    estado_captura character varying(50) DEFAULT 'pendiente'::character varying,
    resultados text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    estado_validacion character varying(50) DEFAULT 'captura'::character varying,
    entregado boolean DEFAULT false,
    fecha_entrega timestamp without time zone,
    id_sucursal integer,
    sucursal text,
    muestra_pendiente boolean DEFAULT false NOT NULL
);



--
-- Name: COLUMN estudios_venta.entregado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estudios_venta.entregado IS 'Indica si el estudio fue entregado al paciente';



--
-- Name: COLUMN estudios_venta.fecha_entrega; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estudios_venta.fecha_entrega IS 'Fecha y hora en que se entregó el estudio';



--
-- Name: estudios_venta_id_estudio_venta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudios_venta_id_estudio_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: estudios_venta_id_estudio_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudios_venta_id_estudio_venta_seq OWNED BY public.estudios_venta.id_estudio_venta;



--
-- Name: imagenes_dicom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imagenes_dicom (
    id_imagen integer NOT NULL,
    id_estudio integer,
    url_imagen text NOT NULL,
    serie integer DEFAULT 1,
    numero_imagen integer DEFAULT 1,
    resolucion character varying(50),
    tamanio_mb numeric(10,2),
    formato character varying(20) DEFAULT 'DICOM'::character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: TABLE imagenes_dicom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.imagenes_dicom IS 'Imágenes DICOM asociadas a cada estudio';



--
-- Name: imagenes_dicom_id_imagen_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imagenes_dicom_id_imagen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: imagenes_dicom_id_imagen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imagenes_dicom_id_imagen_seq OWNED BY public.imagenes_dicom.id_imagen;



--
-- Name: medicos_referentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicos_referentes (
    id_referente uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    especialidad text,
    cedula text,
    telefono text,
    email text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: metodos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos (
    id integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: metodos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: metodos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_id_seq OWNED BY public.metodos.id;



--
-- Name: movimientos_pago_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_pago_venta (
    id_movimiento bigint NOT NULL,
    id_venta integer,
    folio text,
    tipo_movimiento text NOT NULL,
    monto numeric(12,2) NOT NULL,
    forma_pago text,
    referencia text,
    motivo text,
    id_sucursal integer,
    sucursal text,
    actor_nombre text,
    actor_rol text,
    actor_auth_uuid uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_pago_venta_tipo_movimiento_check CHECK ((tipo_movimiento = ANY (ARRAY['pago_inicial'::text, 'abono'::text, 'devolucion'::text, 'cancelacion'::text, 'ajuste'::text])))
);



--
-- Name: movimientos_pago_venta_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_pago_venta_id_movimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: movimientos_pago_venta_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_pago_venta_id_movimiento_seq OWNED BY public.movimientos_pago_venta.id_movimiento;



--
-- Name: niveles_mar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.niveles_mar (
    id integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: niveles_mar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.niveles_mar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: niveles_mar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.niveles_mar_id_seq OWNED BY public.niveles_mar.id;



--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id bigint NOT NULL,
    titulo text NOT NULL,
    mensaje text,
    tipo text DEFAULT 'info'::text NOT NULL,
    canal_destino text DEFAULT 'todos'::text NOT NULL,
    rol_destino text,
    usuario_destino uuid,
    entidad_tipo text,
    entidad_id bigint,
    id_venta integer,
    id_sucursal integer,
    sucursal text,
    action_path text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notificaciones_canal_destino_check CHECK ((canal_destino = ANY (ARRAY['todos'::text, 'rol'::text, 'usuario'::text, 'sucursal'::text]))),
    CONSTRAINT notificaciones_tipo_check CHECK ((tipo = ANY (ARRAY['info'::text, 'exito'::text, 'advertencia'::text, 'error'::text])))
);



--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;



--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacientes (
    id_paciente integer NOT NULL,
    nombre character varying(255) NOT NULL,
    apellido_paterno character varying(150),
    apellido_materno character varying(150),
    primer_nombre character varying(150),
    fecha_nacimiento date,
    edad integer,
    sexo character varying(20),
    direccion text,
    telefono character varying(50),
    email character varying(150),
    pais character varying(100) DEFAULT 'México'::character varying,
    cedula character varying(50),
    condicion_especial character varying(100),
    tipo character varying(50) DEFAULT 'particular'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    rfc character varying(13),
    CONSTRAINT check_rfc_format CHECK (((rfc IS NULL) OR ((rfc)::text ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$'::text)))
);



--
-- Name: pacientes_id_paciente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pacientes_id_paciente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: pacientes_id_paciente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pacientes_id_paciente_seq OWNED BY public.pacientes.id_paciente;



--
-- Name: paquetes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paquetes (
    id integer NOT NULL,
    clave character varying(50),
    descripcion character varying(500),
    condiciones text,
    dias_proceso integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: TABLE paquetes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.paquetes IS 'Tabla de paquetes de estudios de laboratorio';



--
-- Name: paquetes_estudios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paquetes_estudios (
    id integer NOT NULL,
    id_paquete integer NOT NULL,
    id_estudio integer NOT NULL,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: TABLE paquetes_estudios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.paquetes_estudios IS 'Relación entre paquetes y estudios (tabla intermedia)';



--
-- Name: COLUMN paquetes_estudios.id_paquete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.paquetes_estudios.id_paquete IS 'ID del paquete';



--
-- Name: COLUMN paquetes_estudios.id_estudio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.paquetes_estudios.id_estudio IS 'ID del estudio del catálogo';



--
-- Name: COLUMN paquetes_estudios.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.paquetes_estudios.orden IS 'Orden de aparición del estudio en el paquete';



--
-- Name: paquetes_estudios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paquetes_estudios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: paquetes_estudios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paquetes_estudios_id_seq OWNED BY public.paquetes_estudios.id;



--
-- Name: paquetes_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paquetes_lab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: paquetes_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paquetes_lab_id_seq OWNED BY public.paquetes.id;



--
-- Name: perfiles_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles_usuario (
    id uuid NOT NULL,
    id_empleado uuid,
    ultimo_acceso timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nombre text
);



--
-- Name: plantillas_radiologia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantillas_radiologia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    tipo text DEFAULT 'membrete'::text NOT NULL,
    visibilidad text DEFAULT 'organizacion'::text NOT NULL,
    categoria text,
    archivo_url text,
    archivo_path text,
    mime_type text,
    contenido_html text,
    membrete_base64 text,
    creado_por uuid,
    creado_por_empleado integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plantillas_radiologia_tipo_check CHECK ((tipo = ANY (ARRAY['membrete'::text, 'documento'::text]))),
    CONSTRAINT plantillas_radiologia_visibilidad_check CHECK ((visibilidad = ANY (ARRAY['privado'::text, 'organizacion'::text])))
);



--
-- Name: portal_resultados_accesos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_resultados_accesos (
    id bigint NOT NULL,
    origen_hash text NOT NULL,
    exitoso boolean DEFAULT false NOT NULL,
    bloqueado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: portal_resultados_accesos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.portal_resultados_accesos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.portal_resultados_accesos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- Name: precios_estudios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precios_estudios (
    id integer NOT NULL,
    tipo character varying(50) DEFAULT 'Estudio'::character varying,
    clave character varying(50),
    descripcion character varying(500),
    cliente character varying(100),
    precio numeric(10,2),
    fecha timestamp without time zone DEFAULT now()
);



--
-- Name: precios_estudios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precios_estudios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: precios_estudios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precios_estudios_id_seq OWNED BY public.precios_estudios.id;



--
-- Name: recipientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipientes (
    id integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: recipientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: recipientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipientes_id_seq OWNED BY public.recipientes.id;



--
-- Name: reporte_radiologia_adjuntos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reporte_radiologia_adjuntos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_estudio integer,
    nombre_archivo text NOT NULL,
    archivo_path text NOT NULL,
    archivo_url text,
    mime_type text,
    size_bytes bigint,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: reportes_radiologia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reportes_radiologia (
    id_reporte integer NOT NULL,
    id_estudio integer,
    id_doctor integer,
    contenido_reporte text,
    hallazgos text,
    conclusion text,
    estado_reporte character varying(50) DEFAULT 'BORRADOR'::character varying,
    fecha_reporte timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);



--
-- Name: TABLE reportes_radiologia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reportes_radiologia IS 'Reportes médicos de los estudios radiológicos';



--
-- Name: reportes_radiologia_id_reporte_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reportes_radiologia_id_reporte_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: reportes_radiologia_id_reporte_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reportes_radiologia_id_reporte_seq OWNED BY public.reportes_radiologia.id_reporte;



--
-- Name: solicitudes_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_auditoria (
    id_evento bigint NOT NULL,
    id_venta integer,
    folio text,
    evento text NOT NULL,
    descripcion text NOT NULL,
    actor_nombre text,
    actor_rol text,
    actor_auth_uuid uuid,
    entidad_tipo text,
    entidad_id integer,
    detalles jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: solicitudes_auditoria_id_evento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_auditoria_id_evento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: solicitudes_auditoria_id_evento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_auditoria_id_evento_seq OWNED BY public.solicitudes_auditoria.id_evento;



--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sucursales (
    id_sucursal bigint NOT NULL,
    nombre character varying DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: sucursales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sucursales ALTER COLUMN id_sucursal ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sucursales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- Name: tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tecnicas (
    id integer NOT NULL,
    nombre character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: tecnicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tecnicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: tecnicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tecnicas_id_seq OWNED BY public.tecnicas.id;



--
-- Name: tipo_muestra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_muestra (
    id integer NOT NULL,
    categoria character varying(200),
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: tipo_muestra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_muestra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: tipo_muestra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_muestra_id_seq OWNED BY public.tipo_muestra.id;



--
-- Name: tipos_estudio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_estudio (
    id_tipo_estudio integer NOT NULL,
    nombre character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: tipos_estudio_id_tipo_estudio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_estudio_id_tipo_estudio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: tipos_estudio_id_tipo_estudio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_estudio_id_tipo_estudio_seq OWNED BY public.tipos_estudio.id_tipo_estudio;



--
-- Name: turnos_pacientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos_pacientes (
    id_turno bigint NOT NULL,
    id_paciente integer,
    id_cita integer,
    codigo_turno text NOT NULL,
    nombre_paciente text NOT NULL,
    area text DEFAULT 'Recepcion'::text NOT NULL,
    destino text,
    estado text DEFAULT 'esperando'::text NOT NULL,
    prioridad integer DEFAULT 0 NOT NULL,
    fecha_programada timestamp with time zone DEFAULT now() NOT NULL,
    llamado_en timestamp with time zone,
    atendido_en timestamp with time zone,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT turnos_pacientes_estado_check CHECK ((estado = ANY (ARRAY['esperando'::text, 'llamado'::text, 'en_atencion'::text, 'atendido'::text, 'ausente'::text, 'cancelado'::text])))
);



--
-- Name: turnos_pacientes_id_turno_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.turnos_pacientes ALTER COLUMN id_turno ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.turnos_pacientes_id_turno_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id_venta integer NOT NULL,
    folio character varying(50) NOT NULL,
    id_paciente integer,
    id_doctor integer,
    id_cliente integer,
    id_empleado integer,
    fecha_venta timestamp with time zone,
    subtotal numeric(10,2) NOT NULL,
    iva numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    forma_pago character varying(50),
    pago_recibido numeric(10,2) NOT NULL,
    cambio numeric(10,2) DEFAULT 0,
    observaciones text,
    estado character varying(50) DEFAULT 'activo'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    id_cita integer,
    id_sucursal integer,
    sucursal text
);



--
-- Name: ventas_id_venta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: ventas_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_venta_seq OWNED BY public.ventas.id_venta;



--
-- Name: analito_documentos id_documento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_documentos ALTER COLUMN id_documento SET DEFAULT nextval('public.analito_documentos_id_documento_seq'::regclass);



--
-- Name: analito_referencias id_referencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_referencias ALTER COLUMN id_referencia SET DEFAULT nextval('public.analito_referencias_id_referencia_seq'::regclass);



--
-- Name: analitos id_analito; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analitos ALTER COLUMN id_analito SET DEFAULT nextval('public.analitos_id_seq'::regclass);



--
-- Name: areas id_area; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas ALTER COLUMN id_area SET DEFAULT nextval('public.areas_id_seq'::regclass);



--
-- Name: autorizaciones_entrega_adeudo id_autorizacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_entrega_adeudo ALTER COLUMN id_autorizacion SET DEFAULT nextval('public.autorizaciones_entrega_adeudo_id_autorizacion_seq'::regclass);



--
-- Name: citas id_cita; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas ALTER COLUMN id_cita SET DEFAULT nextval('public.citas_id_cita_seq'::regclass);



--
-- Name: cotizaciones id_cotizacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones ALTER COLUMN id_cotizacion SET DEFAULT nextval('public.cotizaciones_id_cotizacion_seq'::regclass);



--
-- Name: doctores id_doctor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores ALTER COLUMN id_doctor SET DEFAULT nextval('public.doctores_id_doctor_seq'::regclass);



--
-- Name: empleados id_empleado; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id_empleado SET DEFAULT nextval('public.empleados_id_empleado_seq'::regclass);



--
-- Name: empresa_tipos_estudio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_tipos_estudio ALTER COLUMN id SET DEFAULT nextval('public.empresa_tipos_estudio_id_seq'::regclass);



--
-- Name: empresas id_empresa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id_empresa SET DEFAULT nextval('public.empresas_id_empresa_seq1'::regclass);



--
-- Name: equipos_lab id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_lab ALTER COLUMN id SET DEFAULT nextval('public.equipos_lab_id_seq'::regclass);



--
-- Name: estudio_analitos id_estudio_analito; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_analitos ALTER COLUMN id_estudio_analito SET DEFAULT nextval('public.estudio_analitos_id_estudio_analito_seq'::regclass);



--
-- Name: estudios_imagen_catalogo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_imagen_catalogo ALTER COLUMN id SET DEFAULT nextval('public.estudios_imagen_catalogo_id_seq'::regclass);



--
-- Name: estudios_lab_catalogo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_lab_catalogo ALTER COLUMN id SET DEFAULT nextval('public.estudios_lab_catalogo_id_seq'::regclass);



--
-- Name: estudios_radiologia id_estudio; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia ALTER COLUMN id_estudio SET DEFAULT nextval('public.estudios_radiologia_id_estudio_seq'::regclass);



--
-- Name: estudios_venta id_estudio_venta; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_venta ALTER COLUMN id_estudio_venta SET DEFAULT nextval('public.estudios_venta_id_estudio_venta_seq'::regclass);



--
-- Name: imagenes_dicom id_imagen; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes_dicom ALTER COLUMN id_imagen SET DEFAULT nextval('public.imagenes_dicom_id_imagen_seq'::regclass);



--
-- Name: metodos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos ALTER COLUMN id SET DEFAULT nextval('public.metodos_id_seq'::regclass);



--
-- Name: movimientos_pago_venta id_movimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_pago_venta ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimientos_pago_venta_id_movimiento_seq'::regclass);



--
-- Name: niveles_mar id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.niveles_mar ALTER COLUMN id SET DEFAULT nextval('public.niveles_mar_id_seq'::regclass);



--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);



--
-- Name: pacientes id_paciente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes ALTER COLUMN id_paciente SET DEFAULT nextval('public.pacientes_id_paciente_seq'::regclass);



--
-- Name: paquetes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes ALTER COLUMN id SET DEFAULT nextval('public.paquetes_lab_id_seq'::regclass);



--
-- Name: paquetes_estudios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes_estudios ALTER COLUMN id SET DEFAULT nextval('public.paquetes_estudios_id_seq'::regclass);



--
-- Name: precios_estudios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_estudios ALTER COLUMN id SET DEFAULT nextval('public.precios_estudios_id_seq'::regclass);



--
-- Name: recipientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipientes ALTER COLUMN id SET DEFAULT nextval('public.recipientes_id_seq'::regclass);



--
-- Name: reportes_radiologia id_reporte; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes_radiologia ALTER COLUMN id_reporte SET DEFAULT nextval('public.reportes_radiologia_id_reporte_seq'::regclass);



--
-- Name: solicitudes_auditoria id_evento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_auditoria ALTER COLUMN id_evento SET DEFAULT nextval('public.solicitudes_auditoria_id_evento_seq'::regclass);



--
-- Name: tecnicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tecnicas ALTER COLUMN id SET DEFAULT nextval('public.tecnicas_id_seq'::regclass);



--
-- Name: tipo_muestra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_muestra ALTER COLUMN id SET DEFAULT nextval('public.tipo_muestra_id_seq'::regclass);



--
-- Name: tipos_estudio id_tipo_estudio; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_estudio ALTER COLUMN id_tipo_estudio SET DEFAULT nextval('public.tipos_estudio_id_tipo_estudio_seq'::regclass);



--
-- Name: ventas id_venta; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id_venta SET DEFAULT nextval('public.ventas_id_venta_seq'::regclass);



--
-- Name: analisis_ia analisis_ia_id_radiologia_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analisis_ia
    ADD CONSTRAINT analisis_ia_id_radiologia_key UNIQUE (id_radiologia);



--
-- Name: analisis_ia analisis_ia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analisis_ia
    ADD CONSTRAINT analisis_ia_pkey PRIMARY KEY (id_diagnostico);



--
-- Name: analito_documentos analito_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_documentos
    ADD CONSTRAINT analito_documentos_pkey PRIMARY KEY (id_documento);



--
-- Name: analito_referencias analito_referencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_referencias
    ADD CONSTRAINT analito_referencias_pkey PRIMARY KEY (id_referencia);



--
-- Name: analitos analitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analitos
    ADD CONSTRAINT analitos_pkey PRIMARY KEY (id_analito);



--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id_area);



--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id_log);



--
-- Name: autorizaciones_entrega_adeudo autorizaciones_entrega_adeudo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_entrega_adeudo
    ADD CONSTRAINT autorizaciones_entrega_adeudo_pkey PRIMARY KEY (id_autorizacion);



--
-- Name: citas citas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_pkey PRIMARY KEY (id_cita);



--
-- Name: comentarios_estudio comentarios_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comentarios_estudio
    ADD CONSTRAINT comentarios_estudio_pkey PRIMARY KEY (id);



--
-- Name: cotizaciones cotizaciones_numero_cotizacion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_numero_cotizacion_key UNIQUE (numero_cotizacion);



--
-- Name: cotizaciones cotizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_pkey PRIMARY KEY (id_cotizacion);



--
-- Name: doctores doctores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores
    ADD CONSTRAINT doctores_pkey PRIMARY KEY (id_doctor);



--
-- Name: empleados empleados_auth_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_auth_uuid_key UNIQUE (auth_uuid);



--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id_empleado);



--
-- Name: empleados empleados_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_usuario_key UNIQUE (usuario);



--
-- Name: empresa_tipos_estudio empresa_tipos_estudio_id_empresa_id_tipo_estudio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_tipos_estudio
    ADD CONSTRAINT empresa_tipos_estudio_id_empresa_id_tipo_estudio_key UNIQUE (id_empresa, id_tipo_estudio);



--
-- Name: empresa_tipos_estudio empresa_tipos_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_tipos_estudio
    ADD CONSTRAINT empresa_tipos_estudio_pkey PRIMARY KEY (id);



--
-- Name: clientes empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id_cliente);



--
-- Name: empresas empresas_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey1 PRIMARY KEY (id_empresa);



--
-- Name: equipos_lab equipos_lab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_lab
    ADD CONSTRAINT equipos_lab_pkey PRIMARY KEY (id);



--
-- Name: estudio_analitos estudio_analitos_clave_estudio_id_analito_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_analitos
    ADD CONSTRAINT estudio_analitos_clave_estudio_id_analito_key UNIQUE (clave_estudio, id_analito);



--
-- Name: estudio_analitos estudio_analitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_analitos
    ADD CONSTRAINT estudio_analitos_pkey PRIMARY KEY (id_estudio_analito);



--
-- Name: estudio_dicom_imagenes estudio_dicom_imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_dicom_imagenes
    ADD CONSTRAINT estudio_dicom_imagenes_pkey PRIMARY KEY (id_imagen);



--
-- Name: estudios_imagen_catalogo estudios_imagen_catalogo_clave_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_imagen_catalogo
    ADD CONSTRAINT estudios_imagen_catalogo_clave_unique UNIQUE (clave);



--
-- Name: estudios_imagen_catalogo estudios_imagen_catalogo_modalidad_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.estudios_imagen_catalogo
    ADD CONSTRAINT estudios_imagen_catalogo_modalidad_check CHECK ((modalidad = ANY (ARRAY['resonancia'::text, 'radiografia'::text, 'tomografia'::text, 'ultrasonido'::text, 'mastografia'::text, 'estudios_contrastados'::text, 'urgencias_otros'::text, 'veterinaria'::text, 'otro'::text]))) NOT VALID;



--
-- Name: estudios_imagen_catalogo estudios_imagen_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_imagen_catalogo
    ADD CONSTRAINT estudios_imagen_catalogo_pkey PRIMARY KEY (id);



--
-- Name: estudios_lab_catalogo estudios_lab_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_lab_catalogo
    ADD CONSTRAINT estudios_lab_catalogo_pkey PRIMARY KEY (id);



--
-- Name: estudios_radiologia estudios_radiologia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_pkey PRIMARY KEY (id_estudio);



--
-- Name: estudios_venta estudios_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_venta
    ADD CONSTRAINT estudios_venta_pkey PRIMARY KEY (id_estudio_venta);



--
-- Name: imagenes_dicom imagenes_dicom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes_dicom
    ADD CONSTRAINT imagenes_dicom_pkey PRIMARY KEY (id_imagen);



--
-- Name: medicos_referentes medicos_referentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicos_referentes
    ADD CONSTRAINT medicos_referentes_pkey PRIMARY KEY (id_referente);



--
-- Name: metodos metodos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos
    ADD CONSTRAINT metodos_pkey PRIMARY KEY (id);



--
-- Name: movimientos_pago_venta movimientos_pago_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_pago_venta
    ADD CONSTRAINT movimientos_pago_venta_pkey PRIMARY KEY (id_movimiento);



--
-- Name: niveles_mar niveles_mar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.niveles_mar
    ADD CONSTRAINT niveles_mar_pkey PRIMARY KEY (id);



--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);



--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id_paciente);



--
-- Name: paquetes_estudios paquetes_estudios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes_estudios
    ADD CONSTRAINT paquetes_estudios_pkey PRIMARY KEY (id);



--
-- Name: paquetes paquetes_lab_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_lab_clave_key UNIQUE (clave);



--
-- Name: paquetes paquetes_lab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_lab_pkey PRIMARY KEY (id);



--
-- Name: perfiles_usuario perfiles_usuario_id_empleado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_usuario
    ADD CONSTRAINT perfiles_usuario_id_empleado_key UNIQUE (id_empleado);



--
-- Name: perfiles_usuario perfiles_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_usuario
    ADD CONSTRAINT perfiles_usuario_pkey PRIMARY KEY (id);



--
-- Name: plantillas_radiologia plantillas_radiologia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantillas_radiologia
    ADD CONSTRAINT plantillas_radiologia_pkey PRIMARY KEY (id);



--
-- Name: portal_resultados_accesos portal_resultados_accesos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_resultados_accesos
    ADD CONSTRAINT portal_resultados_accesos_pkey PRIMARY KEY (id);



--
-- Name: precios_estudios precios_estudios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_estudios
    ADD CONSTRAINT precios_estudios_pkey PRIMARY KEY (id);



--
-- Name: recipientes recipientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipientes
    ADD CONSTRAINT recipientes_pkey PRIMARY KEY (id);



--
-- Name: reporte_radiologia_adjuntos reporte_radiologia_adjuntos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_radiologia_adjuntos
    ADD CONSTRAINT reporte_radiologia_adjuntos_pkey PRIMARY KEY (id);



--
-- Name: reportes_radiologia reportes_radiologia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes_radiologia
    ADD CONSTRAINT reportes_radiologia_pkey PRIMARY KEY (id_reporte);



--
-- Name: solicitudes_auditoria solicitudes_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_auditoria
    ADD CONSTRAINT solicitudes_auditoria_pkey PRIMARY KEY (id_evento);



--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id_sucursal);



--
-- Name: tecnicas tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tecnicas
    ADD CONSTRAINT tecnicas_pkey PRIMARY KEY (id);



--
-- Name: tipo_muestra tipo_muestra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_muestra
    ADD CONSTRAINT tipo_muestra_pkey PRIMARY KEY (id);



--
-- Name: tipos_estudio tipos_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_estudio
    ADD CONSTRAINT tipos_estudio_pkey PRIMARY KEY (id_tipo_estudio);



--
-- Name: turnos_pacientes turnos_pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_pacientes
    ADD CONSTRAINT turnos_pacientes_pkey PRIMARY KEY (id_turno);



--
-- Name: paquetes_estudios unique_paquete_estudio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes_estudios
    ADD CONSTRAINT unique_paquete_estudio UNIQUE (id_paquete, id_estudio);



--
-- Name: analito_documentos uq_analito_documentos_id_analito; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_documentos
    ADD CONSTRAINT uq_analito_documentos_id_analito UNIQUE (id_analito);



--
-- Name: ventas ventas_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_folio_key UNIQUE (folio);



--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id_venta);



--
-- Name: empleados_auth_uuid_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX empleados_auth_uuid_unique ON public.empleados USING btree (auth_uuid) WHERE (auth_uuid IS NOT NULL);



--
-- Name: idx_analisis_radiologia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analisis_radiologia ON public.analisis_ia USING btree (id_radiologia);



--
-- Name: idx_analisis_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analisis_timestamp ON public.analisis_ia USING btree (timestamp_analisis);



--
-- Name: idx_analito_documentos_id_analito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analito_documentos_id_analito ON public.analito_documentos USING btree (id_analito);



--
-- Name: idx_analito_referencias_analito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analito_referencias_analito ON public.analito_referencias USING btree (id_analito);



--
-- Name: idx_analitos_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analitos_clave ON public.analitos USING btree (clave);



--
-- Name: idx_analitos_tipo_resultado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analitos_tipo_resultado ON public.analitos USING btree (tipo_resultado);



--
-- Name: idx_audit_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_tabla ON public.audit_logs USING btree (tabla);



--
-- Name: idx_audit_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_timestamp ON public.audit_logs USING btree ("timestamp");



--
-- Name: idx_audit_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_usuario ON public.audit_logs USING btree (id_usuario);



--
-- Name: idx_autorizaciones_entrega_adeudo_id_venta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorizaciones_entrega_adeudo_id_venta ON public.autorizaciones_entrega_adeudo USING btree (id_venta, created_at DESC);



--
-- Name: idx_citas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_estado ON public.citas USING btree (estado);



--
-- Name: idx_citas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_fecha ON public.citas USING btree (fecha_estudio);



--
-- Name: idx_citas_id_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_id_cliente ON public.citas USING btree (id_cliente);



--
-- Name: idx_citas_id_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_id_empresa ON public.citas USING btree (id_empresa);



--
-- Name: idx_citas_id_tipo_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_id_tipo_estudio ON public.citas USING btree (id_tipo_estudio);



--
-- Name: idx_citas_nombre_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_nombre_paciente ON public.citas USING btree (nombre_paciente);



--
-- Name: idx_citas_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_paciente ON public.citas USING btree (id_paciente);



--
-- Name: idx_citas_telefono_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_telefono_paciente ON public.citas USING btree (telefono_paciente);



--
-- Name: idx_citas_whatsapp_recordatorio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_whatsapp_recordatorio ON public.citas USING btree (fecha_estudio, whatsapp_recordatorio_enviado_at) WHERE (whatsapp_recordatorio_enviado_at IS NULL);



--
-- Name: idx_comentarios_id_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comentarios_id_estudio ON public.comentarios_estudio USING btree (id_estudio, created_at);



--
-- Name: idx_cotizaciones_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizaciones_fecha ON public.cotizaciones USING btree (fecha_cotizacion DESC);



--
-- Name: idx_cotizaciones_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizaciones_numero ON public.cotizaciones USING btree (numero_cotizacion);



--
-- Name: idx_cotizaciones_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizaciones_paciente ON public.cotizaciones USING btree (nombre_paciente);



--
-- Name: idx_doctores_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_activo ON public.doctores USING btree (activo);



--
-- Name: idx_doctores_auth_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_auth_uuid ON public.doctores USING btree (auth_uuid) WHERE (auth_uuid IS NOT NULL);



--
-- Name: idx_doctores_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_email ON public.doctores USING btree (email);



--
-- Name: idx_doctores_es_radiologo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_es_radiologo ON public.doctores USING btree (es_radiologo) WHERE (es_radiologo IS TRUE);



--
-- Name: idx_doctores_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_nombre ON public.doctores USING btree (nombre);



--
-- Name: idx_doctores_telefono; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_telefono ON public.doctores USING btree (telefono);



--
-- Name: idx_doctores_tipo_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctores_tipo_doctor ON public.doctores USING btree (tipo_doctor);



--
-- Name: idx_empleados_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_activo ON public.empleados USING btree (activo);



--
-- Name: idx_empleados_auth_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_auth_uuid ON public.empleados USING btree (auth_uuid);



--
-- Name: idx_empleados_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_email ON public.empleados USING btree (email);



--
-- Name: idx_empleados_id_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_id_doctor ON public.empleados USING btree (id_doctor) WHERE (id_doctor IS NOT NULL);



--
-- Name: idx_empleados_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_nombre ON public.empleados USING btree (nombre);



--
-- Name: idx_empleados_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_rol ON public.empleados USING btree (rol);



--
-- Name: idx_empleados_sucursal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_sucursal ON public.empleados USING btree (sucursal);



--
-- Name: idx_empleados_telefono; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_telefono ON public.empleados USING btree (telefono);



--
-- Name: idx_empleados_ultimo_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_ultimo_login ON public.empleados USING btree (ultimo_login);



--
-- Name: idx_empleados_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_usuario ON public.empleados USING btree (usuario);



--
-- Name: idx_empresa_tipos_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_tipos_empresa ON public.empresa_tipos_estudio USING btree (id_empresa);



--
-- Name: idx_empresa_tipos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_tipos_tipo ON public.empresa_tipos_estudio USING btree (id_tipo_estudio);



--
-- Name: idx_empresas_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresas_nombre ON public.empresas USING btree (nombre);



--
-- Name: idx_estudio_analitos_analito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudio_analitos_analito ON public.estudio_analitos USING btree (id_analito);



--
-- Name: idx_estudio_analitos_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudio_analitos_clave ON public.estudio_analitos USING btree (clave_estudio);



--
-- Name: idx_estudio_analitos_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudio_analitos_orden ON public.estudio_analitos USING btree (clave_estudio, orden);



--
-- Name: idx_estudio_dicom_imagenes_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudio_dicom_imagenes_estudio ON public.estudio_dicom_imagenes USING btree (id_estudio, created_at);



--
-- Name: idx_estudio_dicom_imagenes_serie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudio_dicom_imagenes_serie ON public.estudio_dicom_imagenes USING btree (id_estudio, series_instance_uid, instance_number);



--
-- Name: idx_estudios_alta_prioridad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_alta_prioridad ON public.estudios_radiologia USING btree (alta_prioridad) WHERE (alta_prioridad = true);



--
-- Name: idx_estudios_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_estado ON public.estudios_radiologia USING btree (estado);



--
-- Name: idx_estudios_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_fecha ON public.estudios_radiologia USING btree (fecha_estudio DESC);



--
-- Name: idx_estudios_imagen_catalogo_busqueda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_imagen_catalogo_busqueda ON public.estudios_imagen_catalogo USING btree (clave, descripcion);



--
-- Name: idx_estudios_imagen_catalogo_empresa_modalidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_imagen_catalogo_empresa_modalidad ON public.estudios_imagen_catalogo USING btree (empresa_operativa, modalidad) WHERE (activo = true);



--
-- Name: idx_estudios_imagen_catalogo_id_empresa_modalidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_imagen_catalogo_id_empresa_modalidad ON public.estudios_imagen_catalogo USING btree (id_empresa, modalidad) WHERE (activo = true);



--
-- Name: idx_estudios_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_paciente ON public.estudios_radiologia USING btree (id_paciente);



--
-- Name: idx_estudios_radiologia_entrega; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_radiologia_entrega ON public.estudios_radiologia USING btree (listo_entrega, entregado);



--
-- Name: idx_estudios_radiologia_id_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_radiologia_id_doctor ON public.estudios_radiologia USING btree (id_doctor) WHERE (id_doctor IS NOT NULL);



--
-- Name: idx_estudios_radiologia_id_estudio_venta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_radiologia_id_estudio_venta ON public.estudios_radiologia USING btree (id_estudio_venta);



--
-- Name: idx_estudios_radiologia_id_venta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_radiologia_id_venta ON public.estudios_radiologia USING btree (id_venta);



--
-- Name: idx_estudios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_tipo ON public.estudios_radiologia USING btree (tipo_estudio);



--
-- Name: idx_estudios_venta_entregado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_venta_entregado ON public.estudios_venta USING btree (entregado);



--
-- Name: idx_estudios_venta_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_venta_estado ON public.estudios_venta USING btree (estado_captura);



--
-- Name: idx_estudios_venta_id_sucursal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_venta_id_sucursal ON public.estudios_venta USING btree (id_sucursal);



--
-- Name: idx_imagenes_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imagenes_estudio ON public.imagenes_dicom USING btree (id_estudio);



--
-- Name: idx_movimientos_pago_venta_corte; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_pago_venta_corte ON public.movimientos_pago_venta USING btree (created_at, id_sucursal, actor_auth_uuid, forma_pago);



--
-- Name: idx_movimientos_pago_venta_id_venta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_pago_venta_id_venta ON public.movimientos_pago_venta USING btree (id_venta, created_at DESC);



--
-- Name: idx_notificaciones_canal_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_canal_destino ON public.notificaciones USING btree (canal_destino);



--
-- Name: idx_notificaciones_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_created_at ON public.notificaciones USING btree (created_at DESC);



--
-- Name: idx_notificaciones_id_sucursal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_id_sucursal ON public.notificaciones USING btree (id_sucursal);



--
-- Name: idx_notificaciones_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_read_at ON public.notificaciones USING btree (read_at);



--
-- Name: idx_notificaciones_rol_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_rol_destino ON public.notificaciones USING btree (rol_destino, read_at);



--
-- Name: idx_notificaciones_usuario_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_usuario_destino ON public.notificaciones USING btree (usuario_destino, read_at);



--
-- Name: idx_pacientes_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacientes_cedula ON public.pacientes USING btree (cedula);



--
-- Name: idx_pacientes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacientes_email ON public.pacientes USING btree (email);



--
-- Name: idx_pacientes_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacientes_nombre ON public.pacientes USING btree (nombre);



--
-- Name: idx_pacientes_rfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacientes_rfc ON public.pacientes USING btree (rfc);



--
-- Name: idx_pacientes_telefono; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacientes_telefono ON public.pacientes USING btree (telefono);



--
-- Name: idx_paquetes_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paquetes_clave ON public.paquetes USING btree (clave);



--
-- Name: idx_paquetes_descripcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paquetes_descripcion ON public.paquetes USING btree (descripcion);



--
-- Name: idx_paquetes_estudios_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paquetes_estudios_estudio ON public.paquetes_estudios USING btree (id_estudio);



--
-- Name: idx_paquetes_estudios_paquete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paquetes_estudios_paquete ON public.paquetes_estudios USING btree (id_paquete);



--
-- Name: idx_perfiles_empleado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perfiles_empleado ON public.perfiles_usuario USING btree (id_empleado);



--
-- Name: idx_plantillas_radiologia_creado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantillas_radiologia_creado_por ON public.plantillas_radiologia USING btree (creado_por);



--
-- Name: idx_plantillas_radiologia_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantillas_radiologia_tipo ON public.plantillas_radiologia USING btree (tipo);



--
-- Name: idx_plantillas_radiologia_visibilidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantillas_radiologia_visibilidad ON public.plantillas_radiologia USING btree (visibilidad);



--
-- Name: idx_portal_resultados_accesos_origen_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_resultados_accesos_origen_created ON public.portal_resultados_accesos USING btree (origen_hash, created_at DESC);



--
-- Name: idx_reporte_radiologia_adjuntos_estudio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reporte_radiologia_adjuntos_estudio ON public.reporte_radiologia_adjuntos USING btree (id_estudio);



--
-- Name: idx_solicitudes_auditoria_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_auditoria_actor ON public.solicitudes_auditoria USING btree (actor_auth_uuid);



--
-- Name: idx_solicitudes_auditoria_id_venta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_auditoria_id_venta ON public.solicitudes_auditoria USING btree (id_venta, created_at DESC);



--
-- Name: idx_tipos_estudio_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipos_estudio_nombre ON public.tipos_estudio USING btree (nombre);



--
-- Name: idx_turnos_pacientes_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turnos_pacientes_codigo ON public.turnos_pacientes USING btree (codigo_turno);



--
-- Name: idx_turnos_pacientes_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turnos_pacientes_estado_fecha ON public.turnos_pacientes USING btree (estado, fecha_programada);



--
-- Name: idx_turnos_pacientes_llamado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turnos_pacientes_llamado ON public.turnos_pacientes USING btree (llamado_en DESC);



--
-- Name: idx_turnos_pacientes_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turnos_pacientes_paciente ON public.turnos_pacientes USING btree (id_paciente);



--
-- Name: idx_ventas_empleado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_empleado ON public.ventas USING btree (id_empleado);



--
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha_venta);



--
-- Name: idx_ventas_folio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_folio ON public.ventas USING btree (folio);



--
-- Name: idx_ventas_id_cita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_id_cita ON public.ventas USING btree (id_cita);



--
-- Name: idx_ventas_id_sucursal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_id_sucursal ON public.ventas USING btree (id_sucursal);



--
-- Name: idx_ventas_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_paciente ON public.ventas USING btree (id_paciente);



--
-- Name: uq_citas_whatsapp_respuesta_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_citas_whatsapp_respuesta_sid ON public.citas USING btree (whatsapp_respuesta_sid) WHERE (whatsapp_respuesta_sid IS NOT NULL);



--
-- Name: uq_estudio_dicom_imagenes_path; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_estudio_dicom_imagenes_path ON public.estudio_dicom_imagenes USING btree (id_estudio, bucket, storage_path);



--
-- Name: ventas_id_cita_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ventas_id_cita_unique ON public.ventas USING btree (id_cita) WHERE (id_cita IS NOT NULL);



--
-- Name: estudios_imagen_catalogo estudios_imagen_catalogo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estudios_imagen_catalogo_updated_at BEFORE UPDATE ON public.estudios_imagen_catalogo FOR EACH ROW EXECUTE FUNCTION public.estudios_imagen_catalogo_set_updated_at();



--
-- Name: plantillas_radiologia plantillas_radiologia_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER plantillas_radiologia_updated_at BEFORE UPDATE ON public.plantillas_radiologia FOR EACH ROW EXECUTE FUNCTION public.plantillas_radiologia_set_updated_at();



--
-- Name: analito_documentos trg_analito_documentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_analito_documentos_updated_at BEFORE UPDATE ON public.analito_documentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



--
-- Name: analitos trg_analitos_enforce_campos_por_tipo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_analitos_enforce_campos_por_tipo BEFORE INSERT OR UPDATE ON public.analitos FOR EACH ROW EXECUTE FUNCTION public.analitos_enforce_campos_por_tipo();



--
-- Name: turnos_pacientes trg_turnos_pacientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_turnos_pacientes_updated_at BEFORE UPDATE ON public.turnos_pacientes FOR EACH ROW EXECUTE FUNCTION public.set_turnos_pacientes_updated_at();



--
-- Name: doctores trigger_calcular_edad_doctor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calcular_edad_doctor BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.doctores FOR EACH ROW EXECUTE FUNCTION public.calcular_edad_doctor();



--
-- Name: empleados trigger_calcular_edad_empleado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calcular_edad_empleado BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.calcular_edad_empleado();



--
-- Name: pacientes trigger_calcular_edad_paciente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calcular_edad_paciente BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.calcular_edad_paciente();



--
-- Name: analisis_ia trigger_marcar_analizado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_marcar_analizado AFTER INSERT ON public.analisis_ia FOR EACH ROW EXECUTE FUNCTION public.marcar_estudio_analizado();



--
-- Name: cotizaciones trigger_update_cotizaciones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_cotizaciones_updated_at BEFORE UPDATE ON public.cotizaciones FOR EACH ROW EXECUTE FUNCTION public.update_cotizaciones_updated_at();



--
-- Name: doctores trigger_update_doctores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_doctores_updated_at BEFORE UPDATE ON public.doctores FOR EACH ROW EXECUTE FUNCTION public.update_doctores_updated_at();



--
-- Name: empleados trigger_update_empleados_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_empleados_updated_at BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.update_empleados_updated_at();



--
-- Name: pacientes trigger_update_pacientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_pacientes_updated_at();



--
-- Name: estudios_radiologia update_estudios_radiologia_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estudios_radiologia_updated_at BEFORE UPDATE ON public.estudios_radiologia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: perfiles_usuario update_perfiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON public.perfiles_usuario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: reportes_radiologia update_reportes_radiologia_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reportes_radiologia_updated_at BEFORE UPDATE ON public.reportes_radiologia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: analito_documentos analito_documentos_id_analito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_documentos
    ADD CONSTRAINT analito_documentos_id_analito_fkey FOREIGN KEY (id_analito) REFERENCES public.analitos(id_analito) ON DELETE CASCADE;



--
-- Name: analito_referencias analito_referencias_id_analito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analito_referencias
    ADD CONSTRAINT analito_referencias_id_analito_fkey FOREIGN KEY (id_analito) REFERENCES public.analitos(id_analito) ON DELETE CASCADE;



--
-- Name: audit_logs audit_logs_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.perfiles_usuario(id);



--
-- Name: autorizaciones_entrega_adeudo autorizaciones_entrega_adeudo_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_entrega_adeudo
    ADD CONSTRAINT autorizaciones_entrega_adeudo_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON UPDATE CASCADE ON DELETE CASCADE;



--
-- Name: citas citas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);



--
-- Name: citas citas_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: citas citas_id_paciente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id_paciente);



--
-- Name: citas citas_id_tipo_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_tipo_estudio_fkey FOREIGN KEY (id_tipo_estudio) REFERENCES public.tipos_estudio(id_tipo_estudio) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: comentarios_estudio comentarios_estudio_autor_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comentarios_estudio
    ADD CONSTRAINT comentarios_estudio_autor_uuid_fkey FOREIGN KEY (autor_uuid) REFERENCES auth.users(id) ON DELETE SET NULL;



--
-- Name: comentarios_estudio comentarios_estudio_id_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comentarios_estudio
    ADD CONSTRAINT comentarios_estudio_id_estudio_fkey FOREIGN KEY (id_estudio) REFERENCES public.estudios_radiologia(id_estudio) ON DELETE CASCADE;



--
-- Name: cotizaciones cotizaciones_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);



--
-- Name: doctores doctores_auth_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores
    ADD CONSTRAINT doctores_auth_uuid_fkey FOREIGN KEY (auth_uuid) REFERENCES auth.users(id) ON DELETE SET NULL;



--
-- Name: empresa_tipos_estudio empresa_tipos_estudio_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_tipos_estudio
    ADD CONSTRAINT empresa_tipos_estudio_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;



--
-- Name: empresa_tipos_estudio empresa_tipos_estudio_id_tipo_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_tipos_estudio
    ADD CONSTRAINT empresa_tipos_estudio_id_tipo_estudio_fkey FOREIGN KEY (id_tipo_estudio) REFERENCES public.tipos_estudio(id_tipo_estudio) ON DELETE CASCADE;



--
-- Name: estudio_analitos estudio_analitos_id_analito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_analitos
    ADD CONSTRAINT estudio_analitos_id_analito_fkey FOREIGN KEY (id_analito) REFERENCES public.analitos(id_analito) ON DELETE CASCADE;



--
-- Name: estudio_dicom_imagenes estudio_dicom_imagenes_id_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudio_dicom_imagenes
    ADD CONSTRAINT estudio_dicom_imagenes_id_estudio_fkey FOREIGN KEY (id_estudio) REFERENCES public.estudios_radiologia(id_estudio) ON DELETE CASCADE;



--
-- Name: estudios_imagen_catalogo estudios_imagen_catalogo_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_imagen_catalogo
    ADD CONSTRAINT estudios_imagen_catalogo_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_doctor_asignado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_doctor_asignado_fkey FOREIGN KEY (id_doctor_asignado) REFERENCES public.doctores(id_doctor) ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_doctor_fkey FOREIGN KEY (id_doctor) REFERENCES public.doctores(id_doctor) ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_estudio_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_estudio_venta_fkey FOREIGN KEY (id_estudio_venta) REFERENCES public.estudios_venta(id_estudio_venta) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_paciente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id_paciente) ON DELETE CASCADE;



--
-- Name: estudios_radiologia estudios_radiologia_id_radiologo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_radiologo_fkey FOREIGN KEY (id_radiologo) REFERENCES public.empleados(id_empleado) ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_referente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_referente_fkey FOREIGN KEY (id_referente) REFERENCES public.medicos_referentes(id_referente) ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_tecnico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_tecnico_fkey FOREIGN KEY (id_tecnico) REFERENCES public.empleados(id_empleado) ON DELETE SET NULL;



--
-- Name: estudios_radiologia estudios_radiologia_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_radiologia
    ADD CONSTRAINT estudios_radiologia_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: estudios_venta estudios_venta_id_sucursal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_venta
    ADD CONSTRAINT estudios_venta_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: estudios_venta estudios_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_venta
    ADD CONSTRAINT estudios_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON DELETE CASCADE;



--
-- Name: citas fk_citas_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT fk_citas_sucursal FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal);



--
-- Name: paquetes_estudios fk_estudio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes_estudios
    ADD CONSTRAINT fk_estudio FOREIGN KEY (id_estudio) REFERENCES public.estudios_lab_catalogo(id) ON DELETE CASCADE;



--
-- Name: paquetes_estudios fk_paquete; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes_estudios
    ADD CONSTRAINT fk_paquete FOREIGN KEY (id_paquete) REFERENCES public.paquetes(id) ON DELETE CASCADE;



--
-- Name: imagenes_dicom imagenes_dicom_id_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes_dicom
    ADD CONSTRAINT imagenes_dicom_id_estudio_fkey FOREIGN KEY (id_estudio) REFERENCES public.estudios_radiologia(id_estudio) ON DELETE CASCADE;



--
-- Name: movimientos_pago_venta movimientos_pago_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_pago_venta
    ADD CONSTRAINT movimientos_pago_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON UPDATE CASCADE ON DELETE CASCADE;



--
-- Name: notificaciones notificaciones_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON DELETE SET NULL;



--
-- Name: notificaciones notificaciones_usuario_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_destino_fkey FOREIGN KEY (usuario_destino) REFERENCES auth.users(id) ON DELETE CASCADE;



--
-- Name: perfiles_usuario perfiles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_usuario
    ADD CONSTRAINT perfiles_usuario_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);



--
-- Name: plantillas_radiologia plantillas_radiologia_creado_por_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantillas_radiologia
    ADD CONSTRAINT plantillas_radiologia_creado_por_empleado_fkey FOREIGN KEY (creado_por_empleado) REFERENCES public.empleados(id_empleado) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: plantillas_radiologia plantillas_radiologia_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantillas_radiologia
    ADD CONSTRAINT plantillas_radiologia_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id) ON DELETE SET NULL;



--
-- Name: reporte_radiologia_adjuntos reporte_radiologia_adjuntos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_radiologia_adjuntos
    ADD CONSTRAINT reporte_radiologia_adjuntos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id) ON DELETE SET NULL;



--
-- Name: reporte_radiologia_adjuntos reporte_radiologia_adjuntos_id_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_radiologia_adjuntos
    ADD CONSTRAINT reporte_radiologia_adjuntos_id_estudio_fkey FOREIGN KEY (id_estudio) REFERENCES public.estudios_radiologia(id_estudio) ON UPDATE CASCADE ON DELETE CASCADE;



--
-- Name: reportes_radiologia reportes_radiologia_id_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes_radiologia
    ADD CONSTRAINT reportes_radiologia_id_doctor_fkey FOREIGN KEY (id_doctor) REFERENCES public.doctores(id_doctor);



--
-- Name: reportes_radiologia reportes_radiologia_id_estudio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes_radiologia
    ADD CONSTRAINT reportes_radiologia_id_estudio_fkey FOREIGN KEY (id_estudio) REFERENCES public.estudios_radiologia(id_estudio) ON DELETE CASCADE;



--
-- Name: solicitudes_auditoria solicitudes_auditoria_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_auditoria
    ADD CONSTRAINT solicitudes_auditoria_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON UPDATE CASCADE ON DELETE CASCADE;



--
-- Name: turnos_pacientes turnos_pacientes_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_pacientes
    ADD CONSTRAINT turnos_pacientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: turnos_pacientes turnos_pacientes_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_pacientes
    ADD CONSTRAINT turnos_pacientes_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: turnos_pacientes turnos_pacientes_id_paciente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_pacientes
    ADD CONSTRAINT turnos_pacientes_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id_paciente) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: ventas ventas_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: ventas ventas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente) ON DELETE SET NULL;



--
-- Name: ventas ventas_id_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_doctor_fkey FOREIGN KEY (id_doctor) REFERENCES public.doctores(id_doctor) ON DELETE SET NULL;



--
-- Name: ventas ventas_id_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_empleado_fkey FOREIGN KEY (id_empleado) REFERENCES public.empleados(id_empleado) ON DELETE SET NULL;



--
-- Name: ventas ventas_id_paciente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id_paciente) ON DELETE CASCADE;



--
-- Name: ventas ventas_id_sucursal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal) ON UPDATE CASCADE ON DELETE SET NULL;



--
-- Name: empleados Admins pueden actualizar empleados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins pueden actualizar empleados" ON public.empleados FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.empleados empleados_1
  WHERE ((empleados_1.auth_uuid = auth.uid()) AND ((empleados_1.rol)::text = 'admin'::text)))));



--
-- Name: empleados Admins pueden insertar empleados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins pueden insertar empleados" ON public.empleados FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.empleados empleados_1
  WHERE ((empleados_1.auth_uuid = auth.uid()) AND ((empleados_1.rol)::text = 'admin'::text)))));



--
-- Name: empleados Admins pueden ver todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins pueden ver todos" ON public.empleados FOR SELECT USING (((auth_uuid = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.empleados empleados_1
  WHERE ((empleados_1.auth_uuid = auth.uid()) AND ((empleados_1.rol)::text = 'admin'::text))))));



--
-- Name: estudios_radiologia Empleados pueden actualizar estudios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden actualizar estudios" ON public.estudios_radiologia FOR UPDATE USING ((auth.role() = 'authenticated'::text));



--
-- Name: reportes_radiologia Empleados pueden actualizar reportes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden actualizar reportes" ON public.reportes_radiologia FOR UPDATE USING ((auth.role() = 'authenticated'::text));



--
-- Name: empleados Empleados pueden actualizar su perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden actualizar su perfil" ON public.empleados FOR UPDATE USING ((auth_uuid = auth.uid())) WITH CHECK ((auth_uuid = auth.uid()));



--
-- Name: reportes_radiologia Empleados pueden crear reportes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden crear reportes" ON public.reportes_radiologia FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));



--
-- Name: estudios_radiologia Empleados pueden insertar estudios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden insertar estudios" ON public.estudios_radiologia FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));



--
-- Name: imagenes_dicom Empleados pueden insertar imágenes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden insertar imágenes" ON public.imagenes_dicom FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));



--
-- Name: estudios_radiologia Empleados pueden ver estudios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden ver estudios" ON public.estudios_radiologia FOR SELECT USING ((auth.role() = 'authenticated'::text));



--
-- Name: imagenes_dicom Empleados pueden ver imágenes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden ver imágenes" ON public.imagenes_dicom FOR SELECT USING ((auth.role() = 'authenticated'::text));



--
-- Name: reportes_radiologia Empleados pueden ver reportes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden ver reportes" ON public.reportes_radiologia FOR SELECT USING ((auth.role() = 'authenticated'::text));



--
-- Name: empleados Empleados pueden ver su perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empleados pueden ver su perfil" ON public.empleados FOR SELECT USING ((auth_uuid = auth.uid()));



--
-- Name: analisis_ia Sistema puede insertar análisis IA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sistema puede insertar análisis IA" ON public.analisis_ia FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));



--
-- Name: analisis_ia Usuarios autenticados pueden ver análisis IA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios autenticados pueden ver análisis IA" ON public.analisis_ia FOR SELECT USING ((auth.role() = 'authenticated'::text));



--
-- Name: perfiles_usuario Usuarios pueden actualizar su propio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.perfiles_usuario FOR UPDATE USING ((auth.uid() = id));



--
-- Name: perfiles_usuario Usuarios pueden ver su propio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.perfiles_usuario FOR SELECT USING ((auth.uid() = id));



--
-- Name: medicos_referentes admin puede gestionar referentes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin puede gestionar referentes" ON public.medicos_referentes TO authenticated USING (true);



--
-- Name: analisis_ia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analisis_ia ENABLE ROW LEVEL SECURITY;


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


--
-- Name: medicos_referentes autenticados pueden leer referentes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "autenticados pueden leer referentes" ON public.medicos_referentes FOR SELECT TO authenticated USING (true);



--
-- Name: autorizaciones_entrega_adeudo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.autorizaciones_entrega_adeudo ENABLE ROW LEVEL SECURITY;


--
-- Name: autorizaciones_entrega_adeudo autorizaciones_entrega_adeudo_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY autorizaciones_entrega_adeudo_insert_authenticated ON public.autorizaciones_entrega_adeudo FOR INSERT TO authenticated WITH CHECK (true);



--
-- Name: autorizaciones_entrega_adeudo autorizaciones_entrega_adeudo_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY autorizaciones_entrega_adeudo_select_authenticated ON public.autorizaciones_entrega_adeudo FOR SELECT TO authenticated USING (true);



--
-- Name: autorizaciones_entrega_adeudo autorizaciones_entrega_adeudo_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY autorizaciones_entrega_adeudo_update_authenticated ON public.autorizaciones_entrega_adeudo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);



--
-- Name: citas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;


--
-- Name: citas citas_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY citas_operacion_interna ON public.citas TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());



--
-- Name: comentarios_estudio comentarios_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comentarios_delete ON public.comentarios_estudio FOR DELETE USING ((auth.uid() = autor_uuid));



--
-- Name: comentarios_estudio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comentarios_estudio ENABLE ROW LEVEL SECURITY;


--
-- Name: comentarios_estudio comentarios_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comentarios_insert ON public.comentarios_estudio FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));



--
-- Name: comentarios_estudio comentarios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comentarios_select ON public.comentarios_estudio FOR SELECT USING (true);



--
-- Name: comentarios_estudio comentarios_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comentarios_update ON public.comentarios_estudio FOR UPDATE USING ((auth.uid() = autor_uuid));



--
-- Name: doctores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;


--
-- Name: doctores doctores_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctores_operacion_interna ON public.doctores TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());



--
-- Name: doctores doctores_select_perfil_propio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctores_select_perfil_propio ON public.doctores FOR SELECT TO authenticated USING ((auth_uuid = auth.uid()));



--
-- Name: estudio_dicom_imagenes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estudio_dicom_imagenes ENABLE ROW LEVEL SECURITY;


--
-- Name: estudio_dicom_imagenes estudio_dicom_imagenes_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY estudio_dicom_imagenes_operacion_interna ON public.estudio_dicom_imagenes TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());



--
-- Name: estudio_dicom_imagenes estudio_dicom_imagenes_select_doctor_externo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY estudio_dicom_imagenes_select_doctor_externo ON public.estudio_dicom_imagenes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.estudios_radiologia er
     JOIN public.doctores d ON ((d.id_doctor = er.id_doctor)))
  WHERE ((er.id_estudio = estudio_dicom_imagenes.id_estudio) AND (d.auth_uuid = auth.uid()) AND (COALESCE(d.activo, true) IS TRUE)))));



--
-- Name: estudios_radiologia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estudios_radiologia ENABLE ROW LEVEL SECURITY;


--
-- Name: estudios_radiologia estudios_radiologia_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY estudios_radiologia_operacion_interna ON public.estudios_radiologia TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());



--
-- Name: estudios_radiologia estudios_radiologia_select_doctor_externo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY estudios_radiologia_select_doctor_externo ON public.estudios_radiologia FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.doctores d
  WHERE ((d.id_doctor = estudios_radiologia.id_doctor) AND (d.auth_uuid = auth.uid()) AND (COALESCE(d.activo, true) IS TRUE)))));



--
-- Name: imagenes_dicom; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.imagenes_dicom ENABLE ROW LEVEL SECURITY;


--
-- Name: medicos_referentes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medicos_referentes ENABLE ROW LEVEL SECURITY;


--
-- Name: movimientos_pago_venta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movimientos_pago_venta ENABLE ROW LEVEL SECURITY;


--
-- Name: movimientos_pago_venta movimientos_pago_venta_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_pago_venta_insert_authenticated ON public.movimientos_pago_venta FOR INSERT TO authenticated WITH CHECK (true);



--
-- Name: movimientos_pago_venta movimientos_pago_venta_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_pago_venta_select_authenticated ON public.movimientos_pago_venta FOR SELECT TO authenticated USING (true);



--
-- Name: notificaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;


--
-- Name: notificaciones notificaciones_select_destinatario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notificaciones_select_destinatario ON public.notificaciones FOR SELECT TO authenticated USING (public.es_destinatario_notificacion(usuario_destino, rol_destino, canal_destino, id_sucursal, sucursal));



--
-- Name: notificaciones notificaciones_update_destinatario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notificaciones_update_destinatario ON public.notificaciones FOR UPDATE TO authenticated USING (public.es_destinatario_notificacion(usuario_destino, rol_destino, canal_destino, id_sucursal, sucursal)) WITH CHECK (public.es_destinatario_notificacion(usuario_destino, rol_destino, canal_destino, id_sucursal, sucursal));



--
-- Name: pacientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;


--
-- Name: pacientes pacientes_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_operacion_interna ON public.pacientes TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());



--
-- Name: pacientes pacientes_select_doctor_externo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_select_doctor_externo ON public.pacientes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.estudios_radiologia er
     JOIN public.doctores d ON ((d.id_doctor = er.id_doctor)))
  WHERE ((er.id_paciente = pacientes.id_paciente) AND (d.auth_uuid = auth.uid()) AND (COALESCE(d.activo, true) IS TRUE)))));



--
-- Name: perfiles_usuario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;


--
-- Name: plantillas_radiologia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plantillas_radiologia ENABLE ROW LEVEL SECURITY;


--
-- Name: plantillas_radiologia plantillas_radiologia_delete_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantillas_radiologia_delete_roles ON public.plantillas_radiologia FOR DELETE TO authenticated USING (public.es_usuario_plantillas_radiologia());



--
-- Name: plantillas_radiologia plantillas_radiologia_insert_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantillas_radiologia_insert_roles ON public.plantillas_radiologia FOR INSERT TO authenticated WITH CHECK (public.es_usuario_plantillas_radiologia());



--
-- Name: plantillas_radiologia plantillas_radiologia_select_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantillas_radiologia_select_roles ON public.plantillas_radiologia FOR SELECT TO authenticated USING (public.es_usuario_plantillas_radiologia());



--
-- Name: plantillas_radiologia plantillas_radiologia_update_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantillas_radiologia_update_roles ON public.plantillas_radiologia FOR UPDATE TO authenticated USING (public.es_usuario_plantillas_radiologia()) WITH CHECK (public.es_usuario_plantillas_radiologia());



--
-- Name: portal_resultados_accesos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_resultados_accesos ENABLE ROW LEVEL SECURITY;


--
-- Name: reporte_radiologia_adjuntos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reporte_radiologia_adjuntos ENABLE ROW LEVEL SECURITY;


--
-- Name: reporte_radiologia_adjuntos reporte_radiologia_adjuntos_insert_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reporte_radiologia_adjuntos_insert_roles ON public.reporte_radiologia_adjuntos FOR INSERT TO authenticated WITH CHECK (public.es_usuario_plantillas_radiologia());



--
-- Name: reporte_radiologia_adjuntos reporte_radiologia_adjuntos_select_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reporte_radiologia_adjuntos_select_roles ON public.reporte_radiologia_adjuntos FOR SELECT TO authenticated USING (public.es_usuario_plantillas_radiologia());



--
-- Name: reportes_radiologia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reportes_radiologia ENABLE ROW LEVEL SECURITY;


--
-- Name: solicitudes_auditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.solicitudes_auditoria ENABLE ROW LEVEL SECURITY;


--
-- Name: solicitudes_auditoria solicitudes_auditoria_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY solicitudes_auditoria_insert_authenticated ON public.solicitudes_auditoria FOR INSERT TO authenticated WITH CHECK (true);



--
-- Name: solicitudes_auditoria solicitudes_auditoria_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY solicitudes_auditoria_select_authenticated ON public.solicitudes_auditoria FOR SELECT TO authenticated USING (true);



--
-- Name: ventas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;


--
-- Name: ventas ventas_operacion_interna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ventas_operacion_interna ON public.ventas TO authenticated USING (public.es_empleado_interno_activo()) WITH CHECK (public.es_empleado_interno_activo());
