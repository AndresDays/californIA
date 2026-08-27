import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase-client";
import { rangoDelPeriodo } from "../utils/comisiones-medicos";

// Mientras el mes está abierto el concentrado se calcula en vivo desde ventas.
// Si ya se cerró, se lee el snapshot: a partir de ese momento un cambio de
// porcentaje o una orden capturada tarde no deben mover lo que ya se pagó.
export const useConcentradoComisiones = ({ periodo } = {}) =>
	useQuery({
		queryKey: ["comisiones-medicos", periodo],
		enabled: Boolean(periodo),
		queryFn: async () => {
			const mesCerrado = await cargarMesCerrado(periodo);
			if (mesCerrado.length > 0) {
				return { cerrado: true, mensuales: mesCerrado, ventas: [], doctores: [], comisiones: [] };
			}

			const { inicio, fin } = rangoDelPeriodo(periodo);
			const [ventas, doctores, comisiones] = await Promise.all([
				cargarVentasDelPeriodo(inicio, fin),
				cargarDoctores(),
				cargarHistorialComisiones(),
			]);
			return { cerrado: false, mensuales: [], ventas, doctores, comisiones };
		},
		staleTime: 1000 * 60 * 5,
	});

const cargarMesCerrado = async (periodo) => {
	const { data, error } = await supabase
		.from("comisiones_mensuales")
		.select(
			"id_mensual, id_doctor, periodo, ordenes, ingreso_generado, porcentaje, comision, estado, pagado_en, referencia_pago, doctores ( id_doctor, nombre, primer_nombre, apellido_paterno, apellido_materno )",
		)
		.eq("periodo", `${periodo}-01`);
	if (error) throw error;
	return data ?? [];
};

const cargarVentasDelPeriodo = async (inicio, fin) => {
	const { data, error } = await supabase
		.from("ventas")
		.select("id_venta, folio, fecha_venta, estado, total, id_doctor")
		.gte("fecha_venta", inicio)
		.lt("fecha_venta", fin)
		.not("id_doctor", "is", null);
	if (error) throw error;
	return data ?? [];
};

const cargarDoctores = async () => {
	const { data, error } = await supabase
		.from("doctores")
		.select("id_doctor, nombre, primer_nombre, apellido_paterno, apellido_materno, especialidad");
	if (error) throw error;
	return data ?? [];
};

const cargarHistorialComisiones = async () => {
	const { data, error } = await supabase
		.from("comisiones_doctor")
		.select("id_comision, id_doctor, porcentaje, vigente_desde, notas")
		.order("vigente_desde", { ascending: true });
	if (error) throw error;
	return data ?? [];
};

// Cada cambio de porcentaje agrega un renglón con su fecha de vigencia en lugar
// de sobrescribir el anterior, para no recalcular meses ya pagados.
export const useFijarPorcentajeDoctor = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idDoctor, porcentaje, vigenteDesde, notas }) => {
			const { error } = await supabase.from("comisiones_doctor").upsert(
				{
					id_doctor: idDoctor,
					porcentaje,
					vigente_desde: vigenteDesde,
					notas: notas || null,
				},
				{ onConflict: "id_doctor,vigente_desde" },
			);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comisiones-medicos"] }),
	});
};

export const useCerrarMesComisiones = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ periodo, filas, idEmpleado }) => {
			if (!filas?.length) throw new Error("No hay médicos con ingreso en el mes.");
			const { error } = await supabase.from("comisiones_mensuales").upsert(
				filas.map((fila) => ({
					id_doctor: fila.idDoctor,
					periodo: `${periodo}-01`,
					ordenes: fila.ordenes,
					ingreso_generado: fila.ingreso,
					porcentaje: fila.porcentaje ?? 0,
					comision: fila.comision,
					estado: "cerrado",
					cerrado_por: idEmpleado ?? null,
				})),
				{ onConflict: "id_doctor,periodo" },
			);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comisiones-medicos"] }),
	});
};

export const useMarcarComisionPagada = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ idMensual, referenciaPago }) => {
			const { error } = await supabase
				.from("comisiones_mensuales")
				.update({
					estado: "pagado",
					pagado_en: new Date().toISOString(),
					referencia_pago: referenciaPago || null,
				})
				.eq("id_mensual", idMensual);
			if (error) throw error;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comisiones-medicos"] }),
	});
};

// Los folios que componen el ingreso de un médico, para poder aclararle de
// dónde salió la cifra cuando pregunta.
export const useDetalleIngresoDoctor = ({ periodo, idDoctor } = {}) =>
	useQuery({
		queryKey: ["comisiones-detalle", periodo, idDoctor],
		enabled: Boolean(periodo && idDoctor),
		queryFn: async () => {
			const { inicio, fin } = rangoDelPeriodo(periodo);
			const { data, error } = await supabase
				.from("ventas")
				.select("id_venta, folio, fecha_venta, total, estado, pacientes ( nombre )")
				.eq("id_doctor", idDoctor)
				.gte("fecha_venta", inicio)
				.lt("fecha_venta", fin)
				.order("fecha_venta", { ascending: true });
			if (error) throw error;
			return (data ?? []).filter(
				(venta) => String(venta.estado ?? "activo").toLowerCase() === "activo",
			);
		},
	});
