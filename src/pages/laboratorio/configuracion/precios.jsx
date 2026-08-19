import { useEffect, useState } from "react";
import editarIconoV2 from "../../../assets/editarIconoV2.png";
import eliminarIconoV2 from "../../../assets/eliminarIconoV2.png";
import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import { exportarExcel, exportarPDF } from "../../../utils/exportar-tabla";
import ModalAgregarPrecio from "../componentes/modal-agregar-precio";
import "./precios.css";

const Precios = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();

	const [empresaFiltro, setEmpresaFiltro] = useState("");
	const [buscarPrecio, setBuscarPrecio] = useBusquedaPersistente("precios:termino");
	const [precios, setPrecios] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalPrecios, setTotalPrecios] = useState(0);
	const [seleccionados, setSeleccionados] = useState([]);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [precioEditar, setPrecioEditar] = useState(null);
	const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
	const [empresaOrigen, setEmpresaOrigen] = useState("");
	const [empresaDestino, setEmpresaDestino] = useState("");
	const [duplicando, setDuplicando] = useState(false);

	useEffect(() => {
		cargarPrecios();
	}, [paginaActual, registrosPorPagina, buscarPrecio, empresaFiltro]);

	const cargarPrecios = async () => {
		try {
			let query = supabase.from("precios_estudios").select("*", { count: "exact" });
			if (buscarPrecio.trim())
				query = query.or(
					`clave.ilike.%${buscarPrecio}%,descripcion.ilike.%${buscarPrecio}%,cliente.ilike.%${buscarPrecio}%`,
				);
			if (empresaFiltro) query = query.eq("cliente", empresaFiltro);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id", { ascending: true });
			if (error) throw error;
			setTotalPrecios(count || 0);
			setPrecios(data || []);
		} catch (error) {
			console.error("Error al cargar precios:", error);
		}
	};

	const handleGuardarPrecio = async (precioData, isEditMode) => {
		try {
			if (isEditMode) {
				const { error } = await supabase
					.from("precios_estudios")
					.update({
						tipo: precioData.tipo,
						clave: precioData.clave,
						descripcion: precioData.descripcion,
						cliente: precioData.cliente,
						precio: precioData.precio,
						fecha: precioData.fecha,
					})
					.eq("id", precioData.id);
				if (error) throw error;
				globalThis.mostrarNotificacion("Precio actualizado correctamente");
			} else {
				const { error } = await supabase
					.from("precios_estudios")
					.insert([precioData]);
				if (error) throw error;
				globalThis.mostrarNotificacion("Precio agregado correctamente");
			}
			cargarPrecios();
			setModalAbierto(false);
		} catch (error) {
			console.error("Error al guardar precio:", error);
			throw error;
		}
	};

	const handleEliminarPrecio = async (id) => {
		if (window.confirm("¿Está seguro de eliminar este precio?")) {
			try {
				const { error } = await supabase
					.from("precios_estudios")
					.delete()
					.eq("id", id);
				if (error) throw error;
				globalThis.mostrarNotificacion("Precio eliminado correctamente");
				cargarPrecios();
			} catch (error) {
				console.error("Error:", error);
				globalThis.mostrarNotificacion("Error al eliminar precio", "error");
			}
		}
	};

	const toggleSeleccion = (id) =>
		setSeleccionados((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	const toggleTodos = () =>
		setSeleccionados(
			seleccionados.length === precios.length ? [] : precios.map((p) => p.id),
		);

	const precioInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const precioFin = Math.min(paginaActual * registrosPorPagina, totalPrecios);
	const totalPaginas = Math.ceil(totalPrecios / registrosPorPagina);
	const getPaginasVisibles = () => {
		const paginas = [];
		for (
			let i = Math.max(1, paginaActual - 2);
			i <= Math.min(totalPaginas, paginaActual + 2);
			i++
		)
			paginas.push(i);
		return paginas;
	};

	const fetchTodosLosPrecios = async () => {
		let query = supabase.from("precios_estudios").select("*");
		if (buscarPrecio.trim())
			query = query.or(
				`clave.ilike.%${buscarPrecio}%,descripcion.ilike.%${buscarPrecio}%,cliente.ilike.%${buscarPrecio}%`,
			);
		if (empresaFiltro) query = query.eq("cliente", empresaFiltro);
		const { data, error } = await query.order("id", { ascending: true });
		if (error) throw error;
		return data || [];
	};

	const handleExportarExcel = async () => {
		try {
			const todos = await fetchTodosLosPrecios();
			const columnas = ["Tipo", "Clave", "Descripción", "Empresa", "Precio", "Fecha"];
			const filas = todos.map((p) => [
				p.tipo || "Estudio",
				p.clave || "",
				p.descripcion || "",
				p.cliente || "",
				`$${p.precio}`,
				p.fecha ? new Date(p.fecha).toLocaleDateString("es-MX") : "",
			]);
			const sufijo = empresaFiltro ? `_${empresaFiltro}` : "";
			exportarExcel(columnas, filas, `precios${sufijo}`);
		} catch (err) {
			console.error("Error al exportar Excel:", err);
		}
	};

	const handleExportarPDF = async () => {
		try {
			const todos = await fetchTodosLosPrecios();
			const columnas = ["Tipo", "Clave", "Descripción", "Empresa", "Precio", "Fecha"];
			const filas = todos.map((p) => [
				p.tipo || "Estudio",
				p.clave || "",
				p.descripcion || "",
				p.cliente || "",
				`$${p.precio}`,
				p.fecha ? new Date(p.fecha).toLocaleDateString("es-MX") : "",
			]);
			const titulo = empresaFiltro ? `Lista de Precios — ${empresaFiltro}` : "Lista de Precios";
			const sufijo = empresaFiltro ? `_${empresaFiltro}` : "";
			exportarPDF(titulo, columnas, filas, `precios${sufijo}`);
		} catch (err) {
			console.error("Error al exportar PDF:", err);
		}
	};

	const EMPRESAS = ["ISSSTE", "NAVAL", "SSA", "Particular", "CENTRO MEDICO ANAMAYA"];

	const handleDuplicarLista = async () => {
		if (!empresaOrigen || !empresaDestino) return;
		if (empresaOrigen === empresaDestino) return;
		setDuplicando(true);
		try {
			const { data, error } = await supabase
				.from("precios_estudios")
				.select("tipo, clave, descripcion, precio")
				.eq("cliente", empresaOrigen);
			if (error) throw error;
			if (!data?.length) { setDuplicando(false); return; }
			const nuevos = data.map(({ tipo, clave, descripcion, precio }) => ({
				tipo, clave, descripcion, precio,
				cliente: empresaDestino,
				fecha: new Date().toISOString(),
			}));
			const { error: insertError } = await supabase.from("precios_estudios").insert(nuevos);
			if (insertError) throw insertError;
			setModalDuplicarAbierto(false);
			setEmpresaOrigen("");
			setEmpresaDestino("");
			cargarPrecios();
		} catch (err) {
			console.error("Error al duplicar lista:", err);
		} finally {
			setDuplicando(false);
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="admin-precios-wrapper">
				<div className="admin-precios-header">
					<h1 className="admin-precios-title">Administrar Precios</h1>
				</div>

				<div className="admin-precios-content">
					<div className="controles-superiores-precios">
						<div className="filtro-empresa-grupo">
							<label>Filtrar por Empresa</label>
							<select
								value={empresaFiltro}
								onChange={(e) => {
									setEmpresaFiltro(e.target.value);
									setPaginaActual(1);
								}}
								className="select-empresa-filtro">
								<option value="">Selecciona una Empresa</option>
								<option value="ISSSTE">ISSSTE</option>
								<option value="NAVAL">NAVAL</option>
								<option value="SSA">SSA</option>
								<option value="Particular">Particular</option>
								<option value="CENTRO MEDICO ANAMAYA">CENTRO MEDICO ANAMAYA</option>
							</select>
						</div>
						<div className="botones-accion-precios">
							<button
								className="btn-alta-precios"
								onClick={() => {
									setPrecioEditar(null);
									setModalAbierto(true);
								}}>
								Alta de Precios
							</button>
							<button
								className="btn-duplicar-lista"
								onClick={() => setModalDuplicarAbierto(true)}>
								Duplicar Lista
							</button>
						</div>
					</div>

					<div className="busqueda-exportacion-precios">
						<input
							type="text"
							placeholder="Busca Precios Aqui..."
							value={buscarPrecio}
							onChange={(e) => {
								setBuscarPrecio(e.target.value);
								setPaginaActual(1);
							}}
							className="input-buscar-precios"
						/>
						<div className="botones-exportar-precios">
							<button
								className="btn-exportar-precio"
								onClick={handleExportarExcel}>
								Excel
							</button>
							<button
								className="btn-exportar-precio"
								onClick={handleExportarPDF}>
								PDF
							</button>
						</div>
					</div>

					<div className="mostrar-registros-precios">
						<span>Mostrar</span>
						<select
							value={registrosPorPagina}
							onChange={(e) => {
								setRegistrosPorPagina(parseInt(e.target.value));
								setPaginaActual(1);
							}}
							className="select-registros-precios">
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</select>
						<span>registros</span>
					</div>

					<div className="tabla-precios-container">
						<table className="tabla-precios">
							<thead>
								<tr>
									<th>
										<input
											type="checkbox"
											checked={
												seleccionados.length === precios.length && precios.length > 0
											}
											onChange={toggleTodos}
										/>
									</th>
									<th>Tipo</th>
									<th>Clave</th>
									<th>Descripcion</th>
									<th>Empresa</th>
									<th>Precio</th>
									<th>Fecha</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{precios.length === 0 ? (
									<tr>
										<td colSpan="8" className="sin-precios">
											No hay precios para mostrar
										</td>
									</tr>
								) : (
									precios.map((precio) => (
										<tr key={precio.id}>
											<td>
												<input
													type="checkbox"
													checked={seleccionados.includes(precio.id)}
													onChange={() => toggleSeleccion(precio.id)}
												/>
											</td>
											<td>{precio.tipo || "Estudio"}</td>
											<td>{precio.clave}</td>
											<td>{precio.descripcion}</td>
											<td>{precio.cliente}</td>
											<td>$ {precio.precio}</td>
											<td>
												{new Date(precio.fecha || Date.now()).toLocaleString(
													"es-MX",
													{
														year: "numeric",
														month: "2-digit",
														day: "2-digit",
														hour: "2-digit",
														minute: "2-digit",
														second: "2-digit",
													},
												)}
											</td>
											<td>
												<div className="acciones-precios">
													<div className="acciones-precios">
														<button
															className="btn-editar-estudio-tabla"
															onClick={() => {
																setPrecioEditar(precio);
																setModalAbierto(true);
															}}
															title="Editar precio">
															<img
																src={editarIconoV2}
																alt="Editar"
																className="icono-accion"
															/>
														</button>
														<button
															className="btn-eliminar-estudio-tabla"
															onClick={() => handleEliminarPrecio(precio.id)}
															title="Eliminar precio">
															<img
																src={eliminarIconoV2}
																alt="Eliminar"
																className="icono-accion"
															/>
														</button>
													</div>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="paginacion-precios">
						<div className="contador-precios">
							Mostrando registros del {precioInicio} al {precioFin} de un total de{" "}
							{totalPrecios.toLocaleString()}
						</div>
						<div className="botones-paginacion-precios">
							<button
								className="btn-pag-precios"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{getPaginasVisibles().map((pagina) => (
								<button
									key={pagina}
									className={`btn-pag-numero-precios ${paginaActual === pagina ? "activo" : ""}`}
									onClick={() => setPaginaActual(pagina)}>
									{pagina}
								</button>
							))}
							{totalPaginas > 5 && paginaActual < totalPaginas - 2 && (
								<>
									<span className="paginacion-ellipsis">...</span>
									<button
										className="btn-pag-numero-precios"
										onClick={() => setPaginaActual(totalPaginas)}>
										{totalPaginas}
									</button>
								</>
							)}
							<button
								className="btn-pag-precios"
								onClick={() => setPaginaActual((p) => p + 1)}
								disabled={paginaActual >= totalPaginas}>
								Siguiente
							</button>
						</div>
					</div>
				</div>

				<ModalAgregarPrecio
					isOpen={modalAbierto}
					onClose={() => setModalAbierto(false)}
					onSave={handleGuardarPrecio}
					precioEditar={precioEditar}
				/>
			</div>

			{modalDuplicarAbierto && (
				<div className="modal-duplicar-overlay" onClick={() => setModalDuplicarAbierto(false)}>
					<div className="modal-duplicar-box" onClick={(e) => e.stopPropagation()}>
						<h3 className="modal-duplicar-titulo">Duplicar Lista de Precios</h3>
						<p className="modal-duplicar-subtitulo">
							Copia todos los precios de una empresa a otra.
						</p>
						<div className="modal-duplicar-campo">
							<label>Empresa origen</label>
							<select value={empresaOrigen} onChange={(e) => setEmpresaOrigen(e.target.value)} className="modal-duplicar-select">
								<option value="">Selecciona empresa origen</option>
								{EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}
							</select>
						</div>
						<div className="modal-duplicar-campo">
							<label>Empresa destino</label>
							<select value={empresaDestino} onChange={(e) => setEmpresaDestino(e.target.value)} className="modal-duplicar-select">
								<option value="">Selecciona empresa destino</option>
								{EMPRESAS.filter((e) => e !== empresaOrigen).map((e) => <option key={e} value={e}>{e}</option>)}
							</select>
						</div>
						<div className="modal-duplicar-acciones">
							<button className="btn-duplicar-cancelar" onClick={() => setModalDuplicarAbierto(false)} disabled={duplicando}>
								Cancelar
							</button>
							<button
								className="btn-duplicar-confirmar"
								onClick={handleDuplicarLista}
								disabled={duplicando || !empresaOrigen || !empresaDestino}>
								{duplicando ? "Duplicando…" : "Duplicar"}
							</button>
						</div>
					</div>
				</div>
			)}
		</PageLayout>
	);
};

export default Precios;
