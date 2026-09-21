// El directorio no es una tabla nueva de médicos: es el catálogo `doctores` que
// ya usan recepción y radiología, más la ficha comercial (`doctores_crm`) y el
// convenio vigente. Se arman juntos aquí para que las pantallas reciban un solo
// objeto "médico" y no tengan que cruzar tres consultas.
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";
import { nombreDoctor } from "../utils/comisiones-medicos";

const CAMPOS_DOCTOR = `
	id_doctor, nombre, primer_nombre, apellido_paterno, apellido_materno,
	fecha_nacimiento, sexo, telefono, email, especialidad, institucion, activo
`;

const CAMPOS_CRM = `
	id_doctor, whatsapp, direccion_consultorio, hospital, zona, ubicacion,
	latitud, longitud, horario_consulta, foto_url, estatus,
	frecuencia_visita_dias, origen_contacto, interes, probabilidad_cierre,
	servicios_ofrecidos, fecha_primer_contacto, notas, id_empleado
`;

const CAMPOS_CONVENIO = `
	id_convenio, id_doctor, tipo, condiciones, usa_ordenes_clinica,
	maneja_puntos, vigente_desde, vigente_hasta, activo
`;

// Se traen las tres tablas completas y se unen en memoria: el directorio son
// cientos de médicos, no miles, y así los filtros de la pantalla (zona,
// convenio, cumpleaños) no cuestan un viaje al servidor cada vez.
export const useDirectorioMedicos = () => {
	const consulta = useQuery({
		queryKey: ["directorio-medicos"],
		queryFn: async () => {
			const [doctores, fichas, convenios, visordicom, visitas] = await Promise.all([
				supabase.from("doctores").select(CAMPOS_DOCTOR).order("id_doctor"),
				supabase.from("doctores_crm").select(CAMPOS_CRM),
				supabase.from("convenios_medico").select(CAMPOS_CONVENIO).eq("activo", true),
				supabase.from("visordicom_medicos").select("id_doctor, estado, usuario, fecha_creacion"),
				// Sólo la fecha: es lo que necesita la tarjeta "última visita" del
				// directorio, y así no se arrastra el texto completo de cada visita.
				supabase
					.from("visitas_medicas")
					.select("id_doctor, fecha")
					.not("id_doctor", "is", null)
					.order("fecha", { ascending: false }),
			]);
			for (const respuesta of [doctores, fichas, convenios, visordicom, visitas]) {
				if (respuesta.error) throw respuesta.error;
			}
			return {
				doctores: doctores.data ?? [],
				fichas: fichas.data ?? [],
				convenios: convenios.data ?? [],
				visordicom: visordicom.data ?? [],
				visitas: visitas.data ?? [],
			};
		},
		staleTime: 1000 * 60 * 5,
	});

	const medicos = useMemo(() => {
		const datos = consulta.data;
		if (!datos) return [];
		const porId = (lista) => new Map(lista.map((fila) => [fila.id_doctor, fila]));
		const fichas = porId(datos.fichas);
		const convenios = porId(datos.convenios);
		const visordicom = porId(datos.visordicom);
		// La consulta viene ordenada de la más reciente a la más vieja, así que
		// la primera que aparece de cada médico es su última visita.
		const ultimaVisita = new Map();
		for (const visita of datos.visitas) {
			if (!ultimaVisita.has(visita.id_doctor)) ultimaVisita.set(visita.id_doctor, visita.fecha);
		}
		return datos.doctores.map((doctor) => {
			const ficha = fichas.get(doctor.id_doctor) ?? {};
			const convenio = convenios.get(doctor.id_doctor) ?? null;
			return {
				...doctor,
				...ficha,
				id_doctor: doctor.id_doctor,
				nombre_completo: nombreDoctor(doctor),
				// Sin ficha comercial el médico sigue siendo un prospecto: está en
				// el catálogo porque alguien capturó una orden suya, pero ella
				// todavía no lo trabaja.
				estatus: ficha.estatus ?? "prospecto",
				tiene_ficha: Boolean(ficha.id_doctor),
				ultima_visita: ultimaVisita.get(doctor.id_doctor) ?? null,
				convenio,
				tipo_convenio: convenio?.tipo ?? "sin_convenio",
				visordicom: visordicom.get(doctor.id_doctor) ?? null,
			};
		});
	}, [consulta.data]);

	return { ...consulta, medicos };
};

export const useMedico = (idDoctor) => {
	const { medicos, ...resto } = useDirectorioMedicos();
	const medico = useMemo(
		() => medicos.find((candidato) => String(candidato.id_doctor) === String(idDoctor)) ?? null,
		[medicos, idDoctor],
	);
	return { ...resto, medico };
};

// Guardar toca dos tablas: los datos clínicos del médico van a `doctores` y lo
// comercial a `doctores_crm`. Se hace en ese orden porque el alta necesita el
// id que genera la primera.
export const useGuardarMedico = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ doctor, ficha }) => {
			let idDoctor = doctor.id_doctor ?? null;
			const campos = { ...doctor };
			delete campos.id_doctor;
			if (idDoctor) {
				const { error } = await supabase
					.from("doctores")
					.update(campos)
					.eq("id_doctor", idDoctor);
				if (error) throw error;
			} else {
				const { data, error } = await supabase
					.from("doctores")
					.insert(campos)
					.select("id_doctor")
					.single();
				if (error) throw error;
				idDoctor = data.id_doctor;
			}
			const { error: fallo } = await supabase
				.from("doctores_crm")
				.upsert({ ...ficha, id_doctor: idDoctor, updated_at: new Date().toISOString() });
			if (fallo) throw fallo;
			return idDoctor;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directorio-medicos"] }),
	});
};

// Un prospecto se convierte en activo sin recapturar nada: cambia su estatus y
// se le abre el convenio. El convenio anterior, si lo había, se cierra para que
// quede el histórico y no dos vigentes.
export const useConvertirProspecto = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idDoctor, convenio, idEmpleado }) => {
			const { error: cierre } = await supabase
				.from("convenios_medico")
				.update({ activo: false, vigente_hasta: new Date().toISOString().slice(0, 10) })
				.eq("id_doctor", idDoctor)
				.eq("activo", true);
			if (cierre) throw cierre;
			const { error: alta } = await supabase.from("convenios_medico").insert({
				...convenio,
				id_doctor: idDoctor,
				activo: true,
				id_empleado: idEmpleado ?? null,
			});
			if (alta) throw alta;
			const { error: estatus } = await supabase
				.from("doctores_crm")
				.upsert({ id_doctor: idDoctor, estatus: "activo", updated_at: new Date().toISOString() });
			if (estatus) throw estatus;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directorio-medicos"] }),
	});
};

// Al registrar una visita ella completa lo que le faltaba al médico: su
// teléfono, su correo o su cumpleaños. Se actualizan sólo esas tres columnas de
// `doctores`, sin tocar la ficha comercial, para que guardar desde ahí no borre
// nada de lo demás.
export const useActualizarContactoMedico = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idDoctor, telefono, email, fechaNacimiento }) => {
			if (!idDoctor) return;
			const { error } = await supabase
				.from("doctores")
				.update({
					telefono: telefono || null,
					email: email || null,
					fecha_nacimiento: fechaNacimiento || null,
				})
				.eq("id_doctor", idDoctor);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directorio-medicos"] }),
	});
};

// La nota que se escribe al programar una visita es del médico, no de la cita:
// termina en su ficha, que es donde ella la busca después. Se agrega al final
// de lo que ya había, con su fecha, para no borrar lo escrito antes.
export const useAgregarNotaMedico = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idDoctor, nota, fecha }) => {
			const texto = String(nota || "").trim();
			if (!idDoctor || !texto) return;
			const { data, error } = await supabase
				.from("doctores_crm")
				.select("notas")
				.eq("id_doctor", idDoctor)
				.maybeSingle();
			if (error) throw error;
			const previas = String(data?.notas || "").trim();
			const renglon = `[${fecha}] ${texto}`;
			const { error: fallo } = await supabase.from("doctores_crm").upsert({
				id_doctor: idDoctor,
				notas: previas ? `${previas}\n${renglon}` : renglon,
				updated_at: new Date().toISOString(),
			});
			if (fallo) throw fallo;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directorio-medicos"] }),
	});
};

export const useGuardarVisorDicom = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (registro) => {
			const { error } = await supabase
				.from("visordicom_medicos")
				.upsert({ ...registro, updated_at: new Date().toISOString() });
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directorio-medicos"] }),
	});
};
