import { useEffect, useState } from "react";
import empresaIcono from "../../../assets/empresaIcono.png";
import enviarEmailBtn from "../../../assets/enviarEmailBtn.png";
import enviarWppBtn from "../../../assets/enviarWppBtn.png";
import guardarBtn from "../../../assets/guardarBtn.png";
import pacienteIcono from "../../../assets/pacienteIcono.png";
import ModalNotificacion from "../../../components/ModalNotificacion";
import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import { generarPDFCotizacion } from "../../../utils/generar-pdf-cotizacion";
import {
	construirEstudioCatalogoUnificado,
	filtrarEstudiosCatalogo,
} from "../../../utils/cita-nuevo-paciente";
import "./cotizacion.css";

const Cotizacion = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();

	const [nombrePaciente, setNombrePaciente] = useState("");
	const [clienteSeleccionado, setClienteSeleccionado] = useState("");
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [condicionesPaciente, setCondicionesPaciente] = useState("");
	const [buscarCotizacion, setBuscarCotizacion] = useBusquedaPersistente("cotizacion:folio");
	const [cotizaciones, setCotizaciones] = useState([]);
	const [clientes, setClientes] = useState([]);
	const [empresas, setEmpresas] = useState([]);
	const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState("");
	const [tiposEstudio, setTiposEstudio] = useState([]);
	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("cotizacion:estudio");
	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
	const [total, setTotal] = useState(0);
	const [descuento, setDescuento] = useState(0);
	const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	useEffect(() => {
		cargarCotizaciones();
		cargarClientes();
		cargarEmpresas();
		cargarEstudiosDisponibles();
	}, []);
	useEffect(() => {
		setTipoEstudioSeleccionado("");
		setClienteSeleccionado("");
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
		if (empresaSeleccionada) cargarTiposEstudio(empresaSeleccionada);
		else setTiposEstudio([]);
	}, [empresaSeleccionada]);
	useEffect(() => {
		calcularTotales();
	}, [estudiosSeleccionados, descuento, descuentoPorcentaje]);

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });
	const cerrarNotificacion = () =>
		setNotificacion({ isOpen: false, mensaje: "", tipo: "exito" });

	const cargarClientes = async () => {
		try {
			const { data, error } = await supabase
				.from("clientes")
				.select("id_cliente, nombre")
				.order("nombre");
			if (error) throw error;
			setClientes(data || []);
		} catch (error) {
			console.error("Error al cargar clientes:", error);
		}
	};

	const cargarEmpresas = async () => {
		try {
			const { data, error } = await supabase
				.from("empresas")
				.select("id_empresa, nombre")
				.order("nombre");
			if (error) throw error;
			setEmpresas(data || []);
		} catch (error) {
			console.error("Error al cargar empresas:", error);
		}
	};

	const cargarTiposEstudio = async (idEmpresa) => {
		try {
			const { data, error } = await supabase
				.from("empresa_tipos_estudio")
				.select("id_tipo_estudio, tipos_estudio (id_tipo_estudio, nombre)")
				.eq("id_empresa", idEmpresa)
				.order("tipos_estudio(nombre)");
			if (error) throw error;
			setTiposEstudio(
				(data || [])
					.filter((item) => item.tipos_estudio)
					.map((item) => item.tipos_estudio),
			);
		} catch (error) {
			console.error("Error al cargar tipos de estudio:", error);
			setTiposEstudio([]);
		}
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data: estudiosLab, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion, area, dias_proceso")
				.order("clave");
			if (error) throw error;

			const estudiosLaboratorio = (estudiosLab || []).map((estudio) =>
				construirEstudioCatalogoUnificado(estudio, "laboratorio"),
			);
			const { data: estudiosImagen, error: errorImagen } = await supabase
				.from("estudios_imagen_catalogo")
				.select(
					"id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, requiere_contraste, requiere_interpretacion, dias_proceso",
				)
				.eq("activo", true)
				.order("clave");
			if (errorImagen) throw errorImagen;

			setEstudiosDisponibles([
				...estudiosLaboratorio,
				...(estudiosImagen || []).map((estudio) =>
					construirEstudioCatalogoUnificado(estudio, "imagen"),
				),
			]);
		} catch (error) {
			console.error("Error al cargar estudios:", error);
		}
	};

	const cargarCotizaciones = async () => {
		try {
			const { data, error } = await supabase
				.from("cotizaciones")
				.select(
					`
				id_cotizacion, numero_cotizacion, nombre_paciente, estudios,
				total, descuento, descuento_porcentaje, fecha_cotizacion,
				clientes (nombre)
			`,
				)
				.order("fecha_cotizacion", { ascending: false });
			if (error) throw error;
			setCotizaciones(data || []);
		} catch (error) {
			console.error("Error al cargar cotizaciones:", error);
		}
	};

	const obtenerPrecioEstudio = async (claveEstudio, nombreEmpresa) => {
		try {
			if (!nombreEmpresa) return 150;
			const { data, error } = await supabase
				.from("precios_estudios")
				.select("precio")
				.eq("clave", claveEstudio)
				.eq("cliente", nombreEmpresa)
				.single();
			if (error) return 150;
			return parseFloat(data.precio);
		} catch (error) {
			return 150;
		}
	};

	const agregarEstudio = async (estudio) => {
		if (estudiosSeleccionados.find((e) => e.id === estudio.id)) {
			mostrarNotificacion("Este estudio ya fue agregado", "advertencia");
			return;
		}
		const clienteObj = clientes.find(
			(cliente) =>
				cliente.id_cliente.toString() === clienteSeleccionado.toString(),
		);
		const precioEstudio = await obtenerPrecioEstudio(
			estudio.clave,
			clienteObj?.nombre || "",
		);
		setEstudiosSeleccionados([
			...estudiosSeleccionados,
			{
				...estudio,
				precio: precioEstudio,
				tipo: estudio.area || estudio.modalidad || "Laboratorio",
				diasProceso: estudio.diasProceso || 1,
			},
		]);
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
	};

	const eliminarEstudio = (id) =>
		setEstudiosSeleccionados(estudiosSeleccionados.filter((e) => e.id !== id));

	const calcularTotales = () => {
		const subtotal = estudiosSeleccionados.reduce(
			(sum, est) => sum + (parseFloat(est.precio) || 0),
			0,
		);
		setTotal(subtotal);
		if (descuentoPorcentaje > 0)
			setDescuento(subtotal * (descuentoPorcentaje / 100));
	};

	const generarNumeroCotizacion = async () => {
		const ahora = new Date();
		const dia = String(ahora.getDate()).padStart(2, "0");
		const mes = String(ahora.getMonth() + 1).padStart(2, "0");
		const anio = String(ahora.getFullYear()).slice(-2);
		const inicioDia = new Date(
			ahora.getFullYear(),
			ahora.getMonth(),
			ahora.getDate(),
			0,
			0,
			0,
		);
		const finDia = new Date(
			ahora.getFullYear(),
			ahora.getMonth(),
			ahora.getDate(),
			23,
			59,
			59,
		);
		const { count, error } = await supabase
			.from("cotizaciones")
			.select("*", { count: "exact", head: true })
			.gte("fecha_cotizacion", inicioDia.toISOString())
			.lte("fecha_cotizacion", finDia.toISOString());
		if (error) console.error("Error al contar cotizaciones:", error);
		return `COT-${dia}${mes}${anio}${String((count || 0) + 1).padStart(4, "0")}`;
	};

	const abrirPDFCotizacion = async (cotizacion) => {
		const datosTicket = {
			numeroCotizacion: cotizacion.numero_cotizacion,
			fecha: new Date(cotizacion.fecha_cotizacion).toLocaleDateString("es-MX", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			}),
			cliente: cotizacion.nombre_paciente,
			estudios:
				typeof cotizacion.estudios === "string"
					? JSON.parse(cotizacion.estudios)
					: cotizacion.estudios,
			subtotal: parseFloat(cotizacion.total) + parseFloat(cotizacion.descuento || 0),
			descuento: parseFloat(cotizacion.descuento || 0),
			total: parseFloat(cotizacion.total),
			descuentoPercent: parseFloat(cotizacion.descuento_porcentaje || 0),
		};
		await generarPDFCotizacion(datosTicket);
	};

	const handleGuardarGenerar = async () => {
		if (!nombrePaciente.trim()) {
			mostrarNotificacion("Por favor ingrese el nombre del paciente", "advertencia");
			return;
		}
		if (estudiosSeleccionados.length === 0) {
			mostrarNotificacion("Por favor agregue al menos un estudio", "advertencia");
			return;
		}
		try {
			const numeroCotizacion = await generarNumeroCotizacion();
			const totalFinal = total - descuento;
			const { data, error } = await supabase
				.from("cotizaciones")
				.insert([
					{
						numero_cotizacion: numeroCotizacion,
						nombre_paciente: nombrePaciente,
						id_cliente: clienteSeleccionado || null,
						condiciones_paciente: condicionesPaciente || null,
						estudios: estudiosSeleccionados.map((est) => ({
							clave: est.clave,
							descripcion: est.descripcion,
							precio: est.precio,
						})),
						subtotal: total,
						descuento,
						descuento_porcentaje: descuentoPorcentaje,
						total: totalFinal,
					},
				])
				.select()
				.single();
			if (error) throw error;
			mostrarNotificacion("¡Cotización guardada exitosamente!", "exito");
			await abrirPDFCotizacion({
				...data,
				fecha_cotizacion: new Date().toISOString(),
			});
			await cargarCotizaciones();
			limpiarFormulario();
		} catch (error) {
			console.error("Error al guardar cotización:", error);
			mostrarNotificacion(
				"Error al guardar la cotización: " + error.message,
				"error",
			);
		}
	};

	const limpiarFormulario = () => {
		setNombrePaciente("");
		setClienteSeleccionado("");
		setEmpresaSeleccionada("");
		setTipoEstudioSeleccionado("");
		setCondicionesPaciente("");
		setEstudiosSeleccionados([]);
		setDescuento(0);
		setDescuentoPorcentaje(0);
	};

	const handleVerCotizacion = async (cotizacion) => {
		await abrirPDFCotizacion(cotizacion);
	};

	const handleEnviarWhatsAppCotizacion = (cotizacion) => {
		const mensaje = `Cotización ${cotizacion.numero_cotizacion}\nPaciente: ${cotizacion.nombre_paciente}\nTotal: $${cotizacion.total}`;
		window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
	};

	const handleEnviarCorreoCotizacion = (cotizacion) => {
		mostrarNotificacion(
			`Función de envío por correo en desarrollo para: ${cotizacion.nombre_paciente}`,
			"info",
		);
	};

	const empresaActual = empresas.find(
		(empresa) => empresa.id_empresa?.toString() === empresaSeleccionada?.toString(),
	);
	const tipoEstudioActual = tiposEstudio.find(
		(tipo) =>
			tipo.id_tipo_estudio?.toString() === tipoEstudioSeleccionado?.toString(),
	);
	const puedeBuscarEstudios = Boolean(
		clienteSeleccionado && empresaSeleccionada && tipoEstudioSeleccionado,
	);
	const estudiosFiltrados = filtrarEstudiosCatalogo({
		estudios: estudiosDisponibles,
		busqueda: buscarEstudio,
		empresaId: empresaSeleccionada,
		empresaNombre: empresaActual?.nombre || "",
		tipoNombre: tipoEstudioActual?.nombre || "",
	});

	const cotizacionesFiltradas = cotizaciones.filter(
		(cot) =>
			cot.nombre_paciente.toLowerCase().includes(buscarCotizacion.toLowerCase()) ||
			cot.numero_cotizacion.toLowerCase().includes(buscarCotizacion.toLowerCase()),
	);

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="cotizacion-wrapper">
				<div className="cotizacion-header">
					<h1 className="cotizacion-title">Cotización</h1>
				</div>

				<div className="cotizacion-content">
					<div className="panel-datos-cotizacion">
						<div className="datos-cotizacion-section">
							<h2 className="section-title turquesa">Datos para Cotización</h2>
							<div className="campo-icon-grupo">
								<img src={pacienteIcono} alt="Paciente" className="icon-img" />
								<input
									type="text"
									placeholder="Nombre del Paciente"
									value={nombrePaciente}
									onChange={(e) => setNombrePaciente(e.target.value)}
									className="input-nombre-paciente"
								/>
							</div>
							<div className="campo-icon-grupo">
								<img src={empresaIcono} alt="Empresa" className="icon-img" />
								<label htmlFor="cotizacion-empresa" className="selector-label-cot">
									Empresa
								</label>
								<select
									id="cotizacion-empresa"
									aria-label="Empresa"
									value={empresaSeleccionada}
									onChange={(e) => setEmpresaSeleccionada(e.target.value)}
									className="select-empresa-cot">
									<option value="">Selecciona una Empresa</option>
									{empresas.map((emp) => (
										<option key={emp.id_empresa} value={emp.id_empresa}>
											{emp.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="campo-icon-grupo">
								<img src={empresaIcono} alt="Cliente" className="icon-img" />
								<label htmlFor="cotizacion-cliente" className="selector-label-cot">
									Cliente
								</label>
								<select
									id="cotizacion-cliente"
									aria-label="Cliente"
									value={clienteSeleccionado}
									onChange={(e) => {
										setClienteSeleccionado(e.target.value);
										setBuscarEstudio("");
										setShowBusquedaEstudios(false);
									}}
									disabled={!empresaSeleccionada}
									className="select-empresa-cot">
									<option value="">
										{empresaSeleccionada
											? "Selecciona un Cliente"
											: "Primero selecciona una Empresa"}
									</option>
									{clientes.map((emp) => (
										<option key={emp.id_cliente} value={emp.id_cliente}>
											{emp.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="campo-icon-grupo">
								<label htmlFor="cotizacion-tipo" className="selector-label-cot selector-label-sin-icono">
									Tipo de estudio
								</label>
								<select
									id="cotizacion-tipo"
									aria-label="Tipo de estudio"
									value={tipoEstudioSeleccionado}
									onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
									disabled={!empresaSeleccionada}
									className="select-empresa-cot">
									<option value="">
										{empresaSeleccionada
											? "Selecciona tipo de estudio"
											: "Primero selecciona una Empresa"}
									</option>
									{tiposEstudio.map((tipo) => (
										<option key={tipo.id_tipo_estudio} value={tipo.id_tipo_estudio}>
											{tipo.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="condiciones-grupo">
								<label>Condiciones del paciente</label>
								<textarea
									value={condicionesPaciente}
									onChange={(e) => setCondicionesPaciente(e.target.value)}
									className="textarea-condiciones"
									rows="3"
									placeholder="Ejemplo: Paciente en ayunas..."
								/>
							</div>
						</div>

						<div className="historial-cotizaciones-section">
							<h2 className="section-title amarillo">Historial Cotizaciones</h2>
							<div className="buscar-cotizacion-grupo">
								<input
									type="text"
									placeholder="Busca Cotizaciones aqui..."
									value={buscarCotizacion}
									onChange={(e) => setBuscarCotizacion(e.target.value)}
									className="input-buscar-cotizacion"
								/>
							</div>
							<div className="tabla-cotizaciones-container">
								<table className="tabla-cotizaciones">
									<thead>
										<tr>
											<th>Num</th>
											<th>Nombre</th>
											<th>Ver</th>
											<th>WhatsApp</th>
											<th>Correo</th>
										</tr>
									</thead>
									<tbody>
										{cotizacionesFiltradas.length === 0 ? (
											<tr>
												<td colSpan="5" className="sin-estudios-cot">
													No hay cotizaciones guardadas
												</td>
											</tr>
										) : (
											cotizacionesFiltradas.map((cotizacion, index) => (
												<tr key={cotizacion.id_cotizacion}>
													<td>{index + 1}</td>
													<td>{cotizacion.nombre_paciente}</td>
													<td>
														<button
															className="btn-accion-tabla azul"
															onClick={() => handleVerCotizacion(cotizacion)}>
															Ver
														</button>
													</td>
													<td>
														<button
															className="btn-accion-tabla verde-whatsapp"
															onClick={() =>
																handleEnviarWhatsAppCotizacion(cotizacion)
															}>
															Enviar
														</button>
													</td>
													<td>
														<button
															className="btn-accion-tabla azul-correo"
															onClick={() =>
																handleEnviarCorreoCotizacion(cotizacion)
															}>
															Enviar
														</button>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
							<div className="cotizaciones-footer">
								Mostrando {cotizacionesFiltradas.length} de {cotizaciones.length}{" "}
								cotizaciones
							</div>
						</div>
					</div>

					<div className="panel-estudios-cotizacion">
						<div className="agrega-estudios-section">
							<h2 className="section-title amarillo">Agrega Estudios</h2>
							<div className="buscar-estudios-grupo-cot">
								<input
									type="text"
									placeholder={
										puedeBuscarEstudios
											? "Busca estudios aquí..."
											: "Selecciona cliente, empresa y tipo primero"
									}
									value={buscarEstudio}
									disabled={!puedeBuscarEstudios}
									onChange={(e) => {
										setBuscarEstudio(e.target.value);
										setShowBusquedaEstudios(e.target.value.trim().length >= 2);
									}}
									className="input-buscar-estudios-cot"
								/>
								{showBusquedaEstudios && buscarEstudio.trim().length >= 2 && (
									<div className="search-results-estudios-cot">
										{estudiosFiltrados.length === 0 ? (
											<div className="search-result-item-cot sin-resultados-cot">
												No se encontraron estudios para la selección actual
											</div>
										) : estudiosFiltrados.slice(0, 10).map((est) => (
											<div
												key={est.id}
												className="search-result-item-cot"
												onClick={() => agregarEstudio(est)}>
												<strong>{est.clave}</strong> - {est.descripcion}
											</div>
										))}
									</div>
								)}
							</div>

							<div className="tabla-estudios-cot-container">
								<table className="tabla-estudios-cot">
									<thead>
										<tr>
											<th>Clave</th>
											<th>Descripcion</th>
											<th>Tipo</th>
											<th>Precio</th>
											<th>Días</th>
											<th>✖</th>
										</tr>
									</thead>
									<tbody>
										{estudiosSeleccionados.length === 0 ? (
											<tr>
												<td colSpan="6" className="sin-estudios-cot">
													No hay estudios agregados
												</td>
											</tr>
										) : (
											estudiosSeleccionados.map((estudio, index) => (
												<tr key={index}>
													<td>{estudio.clave}</td>
													<td>{estudio.descripcion}</td>
													<td>{estudio.tipo}</td>
													<td>${estudio.precio.toFixed(2)}</td>
													<td>{estudio.diasProceso}</td>
													<td>
														<button
															className="btn-borrar-estudio-cot"
															onClick={() => eliminarEstudio(estudio.id)}>
															✖
														</button>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							<div className="totales-cotizacion">
								<div className="campo-total-cot">
									<label>Total</label>
									<input
										type="text"
										value={`$${total.toFixed(2)}`}
										readOnly
										className="input-total-cot"
									/>
								</div>
								<div className="campo-total-cot">
									<label>Descuento $</label>
									<input
										type="number"
										value={descuento}
										onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
										className="input-descuento-cot"
									/>
								</div>
								<div className="campo-total-cot">
									<label>Descuento %</label>
									<input
										type="number"
										value={descuentoPorcentaje}
										onChange={(e) =>
											setDescuentoPorcentaje(parseFloat(e.target.value) || 0)
										}
										className="input-descuento-pct-cot"
									/>
								</div>
								<div className="campo-total-cot">
									<label>Total Final</label>
									<input
										type="text"
										value={`$${(total - descuento).toFixed(2)}`}
										readOnly
										className="input-total-final-cot"
									/>
								</div>
							</div>

							<div className="botones-cotizacion">
								<button
									className="btn-img-cot"
									onClick={() =>
										mostrarNotificacion("Primero debe guardar la cotización", "info")
									}>
									<img src={enviarWppBtn} alt="WhatsApp" className="icono-btn-cot" />
								</button>
								<button className="btn-img-cot" onClick={handleGuardarGenerar}>
									<img src={guardarBtn} alt="Guardar" className="icono-btn-cot" />
								</button>
								<button
									className="btn-img-cot"
									onClick={() =>
										mostrarNotificacion("Primero debe guardar la cotización", "info")
									}>
									<img src={enviarEmailBtn} alt="Correo" className="icono-btn-cot" />
								</button>
							</div>
						</div>
					</div>
				</div>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={cerrarNotificacion}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
			</div>
		</PageLayout>
	);
};

export default Cotizacion;
