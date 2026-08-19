import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";
import { useBusquedaPersistente } from "./use-busqueda-persistente";

export function useCatalogoSimple({ tabla, idColumna = "id", storageKey, nombreEntidad }) {
	const [buscar, setBuscar] = useBusquedaPersistente(storageKey);
	const [registros, setRegistros] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [total, setTotal] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [editando, setEditando] = useState(null);

	const cargar = async () => {
		try {
			let query = supabase.from(tabla).select("*", { count: "exact" });
			if (buscar.trim()) query = query.ilike("nombre", `%${buscar}%`);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order(idColumna, { ascending: true });
			if (error) throw error;
			setTotal(count || 0);
			setRegistros(data || []);
		} catch (error) {
			console.error(`Error al cargar ${nombreEntidad}:`, error);
		}
	};

	useEffect(() => {
		cargar();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paginaActual, registrosPorPagina, buscar]);

	const abrirAgregar = () => {
		setModoEdicion(false);
		setEditando(null);
		setModalOpen(true);
	};

	const cerrarModal = () => {
		setModalOpen(false);
		setModoEdicion(false);
		setEditando(null);
	};

	const handleGuardar = async (nombre) => {
		try {
			if (modoEdicion && editando) {
				const { error } = await supabase
					.from(tabla)
					.update({ nombre })
					.eq(idColumna, editando[idColumna]);
				if (error) throw error;
				globalThis.mostrarNotificacion(`${nombreEntidad} actualizado correctamente`);
			} else {
				const { error } = await supabase.from(tabla).insert([{ nombre }]);
				if (error) throw error;
				globalThis.mostrarNotificacion(`${nombreEntidad} agregado correctamente`);
			}
			cargar();
			cerrarModal();
		} catch (error) {
			console.error(`Error al guardar ${nombreEntidad}:`, error);
			globalThis.mostrarNotificacion(`Error al guardar ${nombreEntidad}`, "error");
		}
	};

	const handleEditar = async (id) => {
		try {
			const { data, error } = await supabase
				.from(tabla)
				.select("*")
				.eq(idColumna, id)
				.single();
			if (error) throw error;
			setModoEdicion(true);
			setEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error:", error);
			globalThis.mostrarNotificacion(`Error al cargar ${nombreEntidad}`, "error");
		}
	};

	const inicio = (paginaActual - 1) * registrosPorPagina + 1;
	const fin = Math.min(paginaActual * registrosPorPagina, total);
	const totalPaginas = Math.ceil(total / registrosPorPagina);

	return {
		buscar,
		setBuscar,
		registros,
		registrosPorPagina,
		setRegistrosPorPagina,
		paginaActual,
		setPaginaActual,
		total,
		inicio,
		fin,
		totalPaginas,
		modalOpen,
		modoEdicion,
		editando,
		abrirAgregar,
		cerrarModal,
		handleGuardar,
		handleEditar,
	};
}
