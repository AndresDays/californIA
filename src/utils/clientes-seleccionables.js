// La lista de clientes que se ofrece al capturar.
//
// Un convenio dado de baja -`activo` en falso- deja de ofrecerse para trabajo
// nuevo, pero no desaparece: sus ventas, citas y precios pactados siguen ahí.
// De ahí la diferencia entre los dos usos que tiene la tabla de clientes:
//
//   * Elegir a quién se le cobra una orden nueva: van sólo los activos, que es
//     lo que evita que recepción tenga que buscar entre veinte nombres los
//     cuatro que trabaja.
//   * Filtrar lo ya cobrado -reporte de ventas, captura-: van los activos más
//     los que aparezcan en lo que hay en pantalla. Esconderlos a secas dejaría
//     sin consultar las ventas de un convenio dado de baja, que es justo lo que
//     se quería evitar cuando se decidió no borrarlos; ofrecerlos todos llena el
//     filtro de nombres que no seleccionan nada. `clientesParaFiltro` resuelve
//     las dos cosas: el filtro ofrece exactamente lo que se puede filtrar.
//
// El reporte administrativo no usa nada de esto a propósito: ahí la lista de
// clientes no es un selector sino la tabla de nombres con la que se resuelve a
// quién pertenece cada venta, y sus agrupaciones ya salen de las ventas. Si se
// le quitaran los inactivos, las ventas viejas de esos convenios aparecerían
// como "Particular".
//
// Una pantalla que edita algo ya guardado -una cita, una solicitud- es el caso
// intermedio: el convenio de esa orden tiene que seguir en la lista aunque esté
// dado de baja. Si no, el `select` se queda en blanco y guardar la orden le
// borraría el cliente sin que nadie lo pidiera. Para eso está `incluirId`.

import { supabase } from "../lib/supabase-client";
import { esErrorColumnaInexistente } from "./supabase-errors";

const COLUMNAS = "id_cliente, nombre";

// El id viaja dentro del texto de un filtro de PostgREST, así que sólo se
// admite un número: cualquier otra cosa se ignora en vez de acabar concatenada
// en la consulta.
const idNumerico = (valor) => {
	const numero = Number(valor);
	return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
};

export const consultarClientesSeleccionables = async ({ incluirId } = {}) => {
	const id = idNumerico(incluirId);

	const construir = (conFiltro) => {
		let consulta = supabase.from("clientes").select(COLUMNAS);
		if (conFiltro) {
			consulta = id
				? consulta.or(`activo.eq.true,id_cliente.eq.${id}`)
				: consulta.eq("activo", true);
		}
		return consulta.order("nombre");
	};

	let { data, error } = await construir(true);

	// Mientras la migración no esté aplicada la columna no existe y PostgREST
	// rechaza el filtro entero. Un selector de clientes vacío deja a recepción
	// sin poder cobrar, así que ahí se pide la lista completa: se ven de más,
	// que es exactamente como estaba antes, en vez de no ver ninguno.
	if (error && esErrorColumnaInexistente(error, "activo")) {
		({ data, error } = await construir(false));
	}

	return { data: data || [], error: error || null };
};

// La lista para un filtro de reporte: los activos, más cualquier cliente que
// venga en los datos que se están mirando aunque esté dado de baja. Ordenada por
// nombre, como la trae la consulta, para que el añadido no quede al final.
export const clientesParaFiltro = (activos = [], ventas = []) => {
	const lista = [...activos];
	const conocidos = new Set(activos.map((cliente) => String(cliente?.id_cliente)));

	for (const venta of ventas) {
		const cliente = venta?.clientes;
		const id = cliente?.id_cliente ?? venta?.id_cliente;
		if (id == null || conocidos.has(String(id))) continue;
		// Sin nombre no hay qué mostrar en la opción: se omite en vez de meter
		// un renglón en blanco al filtro.
		if (!cliente?.nombre) continue;
		conocidos.add(String(id));
		lista.push({ id_cliente: id, nombre: cliente.nombre });
	}

	return lista.sort((uno, otro) =>
		String(uno.nombre || "").localeCompare(String(otro.nombre || ""), "es"),
	);
};
