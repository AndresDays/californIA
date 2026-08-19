import { useEffect, useState } from "react";
import { exportarExcel, exportarPDF } from "../../../utils/exportar-tabla";
import editarIconoV2 from "../../../assets/editarIconoV2.png";
import eliminarIconoV2 from "../../../assets/eliminarIconoV2.png";
import excelBtn from "../../../assets/excelBtn.png";
import pdfBtn from "../../../assets/pdfBtn.png";
import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import {
	resolverEmpresaOperativaCatalogo,
	resolverModalidadDesdeTipo,
} from "../../../utils/cita-nuevo-paciente";
import "./estudios-lab.css";

const EstudiosLab = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();

	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("estudios-laboratorio:termino");
	const [estudios, setEstudios] = useState([]);
	const [totalEstudios, setTotalEstudios] = useState(0);
	const [areas, setAreas] = useState([]);
	const [tiposMuestra, setTiposMuestra] = useState([]);
	const [recipientes, setRecipientes] = useState([]);
	const [metodos, setMetodos] = useState([]);
	const [tecnicas, setTecnicas] = useState([]);
	const [equipos, setEquipos] = useState([]);
	const [empresas, setEmpresas] = useState([]);
	const [tiposEstudio, setTiposEstudio] = useState([]);
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState("");
	const [key, setKey] = useState("");
	const [clave, setClave] = useState("");
	const [descripcion, setDescripcion] = useState("");
	const [area, setArea] = useState("");
	const [tipoMuestra, setTipoMuestra] = useState("");
	const [recipiente, setRecipiente] = useState("");
	const [metodo, setMetodo] = useState("");
	const [tecnica, setTecnica] = useState("");
	const [equipo, setEquipo] = useState("");
	const [condicionesPaciente, setCondicionesPaciente] = useState("");
	const [etiquetasExtra, setEtiquetasExtra] = useState("");
	const [diasProceso, setDiasProceso] = useState("");
	const [imprimirMetodo, setImprimirMetodo] = useState(false);
	const [imprimirTecnica, setImprimirTecnica] = useState(false);
	const [imprimirEquipo, setImprimirEquipo] = useState(false);
	const [imprimirMuestra, setImprimirMuestra] = useState(false);
	const [regionAnatomica, setRegionAnatomica] = useState("");
	const [requiereContraste, setRequiereContraste] = useState(false);
	const [requiereInterpretacion, setRequiereInterpretacion] = useState(true);
	const [preparacion, setPreparacion] = useState("");
	const [duracionMinutos, setDuracionMinutos] = useState("");
	const [activoImagen, setActivoImagen] = useState(true);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);

	const empresaActual = empresas.find(
		(empresa) => String(empresa.id_empresa) === String(empresaSeleccionada),
	);
	const tipoEstudioActual = tiposEstudio.find(
		(tipo) => String(tipo.id_tipo_estudio) === String(tipoEstudioSeleccionado),
	);
	const modalidadSeleccionada = resolverModalidadDesdeTipo(
		tipoEstudioActual?.nombre || tipoEstudioSeleccionado || "",
	);
	const esFormularioImagen =
		Boolean(tipoEstudioSeleccionado) && modalidadSeleccionada !== "laboratorio";

	useEffect(() => {
		cargarCatalogos();
		cargarEstudios();
	}, []);

	useEffect(() => {
		cargarEstudios();
	}, [buscarEstudio]);

	useEffect(() => {
		if (empresaSeleccionada) {
			cargarTiposEstudio(parseInt(empresaSeleccionada, 10));
		} else {
			setTiposEstudio([]);
			setTipoEstudioSeleccionado("");
		}
	}, [empresaSeleccionada]);

	useEffect(() => {
		if (!tiposEstudio.length || !tipoEstudioSeleccionado) return;
		if (
			tiposEstudio.some(
				(tipo) => String(tipo.id_tipo_estudio) === String(tipoEstudioSeleccionado),
			)
		) {
			return;
		}
		const tipoPorModalidad = tiposEstudio.find(
			(tipo) => resolverModalidadDesdeTipo(tipo.nombre) === tipoEstudioSeleccionado,
		);
		if (tipoPorModalidad) {
			setTipoEstudioSeleccionado(String(tipoPorModalidad.id_tipo_estudio));
		}
	}, [tiposEstudio, tipoEstudioSeleccionado]);

	const cargarCatalogos = async () => {
		await Promise.all([
			cargarAreas(),
			cargarTiposMuestra(),
			cargarRecipientes(),
			cargarMetodos(),
			cargarTecnicas(),
			cargarEquipos(),
			cargarEmpresas(),
		]);
	};

	const cargarAreas = async () => {
		try {
			const { data, error } = await supabase
				.from("areas")
				.select("id_area, nombre")
				.order("nombre");
			if (error) throw error;
			setAreas(data || []);
			if (data?.length > 0 && !area) setArea(data[0].nombre);
		} catch (error) {
			console.error("Error al cargar áreas:", error);
		}
	};

	const cargarTiposMuestra = async () => {
		try {
			const { data, error } = await supabase
				.from("tipo_muestra")
				.select("id, categoria")
				.order("categoria");
			if (error) throw error;
			setTiposMuestra(data || []);
			if (data?.length > 0 && !tipoMuestra) setTipoMuestra(data[0].categoria);
		} catch (error) {
			console.error("Error al cargar tipos de muestra:", error);
		}
	};

	const cargarRecipientes = async () => {
		try {
			const { data, error } = await supabase
				.from("recipientes")
				.select("id, nombre")
				.order("nombre");
			if (error) throw error;
			setRecipientes(data || []);
			if (data?.length > 0 && !recipiente) setRecipiente(data[0].nombre);
		} catch (error) {
			console.error("Error al cargar recipientes:", error);
		}
	};

	const cargarMetodos = async () => {
		try {
			const { data, error } = await supabase
				.from("metodos")
				.select("id, nombre")
				.order("nombre");
			if (error) throw error;
			setMetodos(data || []);
			if (data?.length > 0 && !metodo) setMetodo(data[0].nombre);
		} catch (error) {
			console.error("Error al cargar métodos:", error);
		}
	};

	const cargarTecnicas = async () => {
		try {
			const { data, error } = await supabase
				.from("tecnicas")
				.select("id, nombre")
				.order("nombre");
			if (error) throw error;
			setTecnicas(data || []);
			if (data?.length > 0 && !tecnica) setTecnica(data[0].nombre);
		} catch (error) {
			console.error("Error al cargar técnicas:", error);
		}
	};

	const cargarEquipos = async () => {
		try {
			const { data, error } = await supabase
				.from("equipos_lab")
				.select("id, nombre")
				.order("nombre");
			if (error) throw error;
			setEquipos(data || []);
			if (data?.length > 0 && !equipo) setEquipo(data[0].nombre);
		} catch (error) {
			console.error("Error al cargar equipos:", error);
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
				.select(
					`
					id_tipo_estudio,
					tipos_estudio (
						id_tipo_estudio,
						nombre
					)
				`,
				)
				.eq("id_empresa", idEmpresa)
				.order("tipos_estudio(nombre)");
			if (error) throw error;
			const tipos = (data || [])
				.map((item) => ({
					id_tipo_estudio:
						item.tipos_estudio?.id_tipo_estudio || item.id_tipo_estudio,
					nombre: item.tipos_estudio?.nombre || "",
				}))
				.filter((tipo) => tipo.nombre);
			setTiposEstudio(tipos);
			setTipoEstudioSeleccionado((actual) =>
				tipos.some((tipo) => String(tipo.id_tipo_estudio) === String(actual)) ||
				tipos.some((tipo) => resolverModalidadDesdeTipo(tipo.nombre) === actual)
					? actual
					: "",
			);
		} catch (error) {
			console.error("Error al cargar tipos de estudio:", error);
			setTiposEstudio([]);
			setTipoEstudioSeleccionado("");
		}
	};

	const handleExportarExcel = () => {
		const columnas = ["#", "Catálogo", "Clave", "Descripción", "Área", "Tipo"];
		const filas = estudios.map((e, i) => [
			i + 1,
			e.tipo_catalogo || "",
			e.clave || "",
			e.descripcion || "",
			e.area || "",
			e.modalidad || "laboratorio",
		]);
		exportarExcel(columnas, filas, "estudios_catalogo");
	};

	const handleExportarPDF = () => {
		const columnas = ["#", "Catálogo", "Clave", "Descripción", "Área", "Tipo"];
		const filas = estudios.map((e, i) => [
			i + 1,
			e.tipo_catalogo || "",
			e.clave || "",
			e.descripcion || "",
			e.area || "",
			e.modalidad || "laboratorio",
		]);
		exportarPDF("Catálogo de Estudios", columnas, filas, "estudios_catalogo");
	};

	const cargarEstudios = async () => {
		try {
			let queryLab = supabase
				.from("estudios_lab_catalogo")
				.select("*", { count: "exact" });
			if (buscarEstudio.trim()) {
				queryLab = queryLab.or(
					`clave.ilike.%${buscarEstudio}%,descripcion.ilike.%${buscarEstudio}%,area.ilike.%${buscarEstudio}%`,
				);
			}
			const { data: labData, error: labError, count: labCount } =
				await queryLab.order("id", { ascending: true });
			if (labError) throw labError;

			let queryImagen = supabase
				.from("estudios_imagen_catalogo")
				.select("*", { count: "exact" });
			if (buscarEstudio.trim()) {
				queryImagen = queryImagen.or(
					`clave.ilike.%${buscarEstudio}%,descripcion.ilike.%${buscarEstudio}%,area.ilike.%${buscarEstudio}%,modalidad.ilike.%${buscarEstudio}%`,
				);
			}
			const {
				data: imagenData,
				error: imagenError,
				count: imagenCount,
			} = await queryImagen.order("id", { ascending: true });
			if (imagenError) throw imagenError;

			setTotalEstudios((labCount || 0) + (imagenCount || 0));
			setEstudios([
				...(labData || []).map((estudio) => ({
					...estudio,
					modulo: "laboratorio",
					tipo_catalogo: "Laboratorio",
				})),
				...(imagenData || []).map((estudio) => ({
					...estudio,
					modulo: "imagen",
					tipo_catalogo: estudio.empresa_operativa || "Imagen",
					area: estudio.area || "Imagen",
				})),
			]);
		} catch (error) {
			console.error("Error al cargar estudios:", error);
		}
	};

	const limpiarFormulario = () => {
		setKey("");
		setClave("");
		setDescripcion("");
		setArea(areas.length > 0 ? areas[0].nombre : "");
		setTipoMuestra(tiposMuestra.length > 0 ? tiposMuestra[0].nombre : "");
		setRecipiente(recipientes.length > 0 ? recipientes[0].nombre : "");
		setMetodo(metodos.length > 0 ? metodos[0].nombre : "");
		setTecnica(tecnicas.length > 0 ? tecnicas[0].nombre : "");
		setEquipo(equipos.length > 0 ? equipos[0].nombre : "");
		setCondicionesPaciente("");
		setEtiquetasExtra("");
		setDiasProceso("");
		setImprimirMetodo(false);
		setImprimirTecnica(false);
		setImprimirEquipo(false);
		setImprimirMuestra(false);
		setRegionAnatomica("");
		setRequiereContraste(false);
		setRequiereInterpretacion(true);
		setPreparacion("");
		setDuracionMinutos("");
		setActivoImagen(true);
		setModoEdicion(false);
		setEstudioSeleccionado(null);
	};

	const buildEstudioData = () => ({
		key,
		clave,
		descripcion,
		area,
		tipo_muestra: tipoMuestra,
		recipiente,
		metodo,
		tecnica,
		equipo,
		condiciones_paciente: condicionesPaciente,
		etiquetas_extra: etiquetasExtra,
		dias_proceso: parseInt(diasProceso) || 0,
		imprimir_metodo: imprimirMetodo,
		imprimir_tecnica: imprimirTecnica,
		imprimir_equipo: imprimirEquipo,
		imprimir_muestra: imprimirMuestra,
	});

	const buildEstudioImagenData = () => ({
		clave,
		descripcion,
		empresa_operativa: resolverEmpresaOperativaCatalogo(empresaActual?.nombre || ""),
		id_empresa: empresaActual?.id_empresa || null,
		modalidad: modalidadSeleccionada,
		area: area || "Imagen",
		region_anatomica: regionAnatomica || null,
		requiere_contraste: requiereContraste,
		requiere_interpretacion: requiereInterpretacion,
		dias_proceso: parseInt(diasProceso, 10) || 1,
		preparacion: preparacion || null,
		duracion_minutos: duracionMinutos ? parseInt(duracionMinutos, 10) : null,
		activo: activoImagen,
	});

	const validarFormulario = () => {
		if (!clave.trim() || !descripcion.trim()) {
			globalThis.mostrarNotificacion("Captura clave y descripciÃ³n del estudio", "advertencia");
			return false;
		}
		if (empresaSeleccionada && !tipoEstudioSeleccionado) {
			globalThis.mostrarNotificacion("Selecciona el tipo de estudio", "advertencia");
			return false;
		}
		if (esFormularioImagen) {
			if (!empresaActual) {
				globalThis.mostrarNotificacion("Selecciona la empresa del estudio", "advertencia");
				return false;
			}
			if (!modalidadSeleccionada || modalidadSeleccionada === "laboratorio") {
				globalThis.mostrarNotificacion("Selecciona un tipo de estudio de imagen", "advertencia");
				return false;
			}
			if (!resolverEmpresaOperativaCatalogo(empresaActual.nombre)) {
				globalThis.mostrarNotificacion("No se pudo identificar si la empresa es CDC o CDI", "error");
				return false;
			}
		}
		return true;
	};

	const handleGuardar = async () => {
		if (!validarFormulario()) return;
		try {
			const tabla = esFormularioImagen
				? "estudios_imagen_catalogo"
				: "estudios_lab_catalogo";
			const payload = esFormularioImagen
				? buildEstudioImagenData()
				: buildEstudioData();
			const { error } = await supabase
				.from(tabla)
				.insert([payload]);
			if (error) throw error;
			globalThis.mostrarNotificacion("Estudio guardado correctamente");
			limpiarFormulario();
			cargarEstudios();
		} catch (error) {
			console.error("Error al guardar estudio:", error);
			globalThis.mostrarNotificacion("Error al guardar estudio", "error");
		}
	};

	const handleEditar = async () => {
		if (!estudioSeleccionado) return;
		if (!validarFormulario()) return;
		try {
			const esImagen = estudioSeleccionado.modulo === "imagen";
			const tabla = esImagen ? "estudios_imagen_catalogo" : "estudios_lab_catalogo";
			const payload = esImagen ? buildEstudioImagenData() : buildEstudioData();
			const { error } = await supabase
				.from(tabla)
				.update(payload)
				.eq("id", estudioSeleccionado.id);
			if (error) throw error;
			globalThis.mostrarNotificacion("Estudio actualizado correctamente");
			limpiarFormulario();
			cargarEstudios();
		} catch (error) {
			console.error("Error al actualizar estudio:", error);
			globalThis.mostrarNotificacion("Error al actualizar estudio", "error");
		}
	};

	const cargarEstudioParaEditar = (estudio) => {
		const esImagen = estudio.modulo === "imagen";
		setKey(esImagen ? "" : estudio.key || "");
		setClave(estudio.clave || "");
		setDescripcion(estudio.descripcion || "");
		setArea(estudio.area || "");
		setTipoMuestra(esImagen ? "" : estudio.tipo_muestra || "");
		setRecipiente(esImagen ? "" : estudio.recipiente || "");
		setMetodo(esImagen ? "" : estudio.metodo || "");
		setTecnica(esImagen ? "" : estudio.tecnica || "");
		setEquipo(esImagen ? "" : estudio.equipo || "");
		setCondicionesPaciente(esImagen ? "" : estudio.condiciones_paciente || "");
		setEtiquetasExtra(esImagen ? "" : estudio.etiquetas_extra || "");
		setDiasProceso(estudio.dias_proceso || "");
		setImprimirMetodo(esImagen ? false : estudio.imprimir_metodo || false);
		setImprimirTecnica(esImagen ? false : estudio.imprimir_tecnica || false);
		setImprimirEquipo(esImagen ? false : estudio.imprimir_equipo || false);
		setImprimirMuestra(esImagen ? false : estudio.imprimir_muestra || false);
		setRegionAnatomica(esImagen ? estudio.region_anatomica || "" : "");
		setRequiereContraste(esImagen ? Boolean(estudio.requiere_contraste) : false);
		setRequiereInterpretacion(
			esImagen ? Boolean(estudio.requiere_interpretacion) : true,
		);
		setPreparacion(esImagen ? estudio.preparacion || "" : "");
		setDuracionMinutos(esImagen ? estudio.duracion_minutos || "" : "");
		setActivoImagen(esImagen ? estudio.activo !== false : true);
		if (esImagen) {
			setEmpresaSeleccionada(estudio.id_empresa ? String(estudio.id_empresa) : "");
			setTipoEstudioSeleccionado(estudio.modalidad || "");
		}
		setModoEdicion(true);
		setEstudioSeleccionado({ id: estudio.id, modulo: estudio.modulo });
	};

	const handleEliminar = async (estudio) => {
		if (window.confirm("¿Está seguro de eliminar este estudio?")) {
			try {
				const tabla =
					estudio.modulo === "imagen"
						? "estudios_imagen_catalogo"
						: "estudios_lab_catalogo";
				const { error } = await supabase
					.from(tabla)
					.delete()
					.eq("id", estudio.id);
				if (error) throw error;
				globalThis.mostrarNotificacion("Estudio eliminado correctamente");
				cargarEstudios();
			} catch (error) {
				console.error("Error al eliminar estudio:", error);
				globalThis.mostrarNotificacion("Error al eliminar estudio", "error");
			}
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="admin-estudios-wrapper">
				<div className="admin-estudios-header">
					<h1 className="admin-estudios-title">
						Crear Estudios, Modificarlos o Borrarlos
					</h1>
				</div>

				<div className="admin-estudios-content">
					<div className="panel-formulario-estudios">
						<div className="selector-catalogo-estudios">
							<div className="campo-estudio">
								<label>Empresa</label>
								<select
									value={empresaSeleccionada}
									onChange={(e) => setEmpresaSeleccionada(e.target.value)}
									className="select-estudio">
									<option value="">Laboratorio / General</option>
									{empresas.map((empresa) => (
										<option key={empresa.id_empresa} value={empresa.id_empresa}>
											{empresa.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="campo-estudio">
								<label>Tipo de estudio</label>
								<select
									value={tipoEstudioSeleccionado}
									onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
									className="select-estudio"
									disabled={!empresaSeleccionada}>
									<option value="">
										{empresaSeleccionada
											? "Selecciona tipo"
											: "Selecciona empresa primero"}
									</option>
									{tiposEstudio.map((tipo) => (
										<option
											key={tipo.id_tipo_estudio}
											value={tipo.id_tipo_estudio}>
											{tipo.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="catalogo-badge">
								{esFormularioImagen ? "Catálogo de imagen" : "Catálogo laboratorio"}
							</div>
						</div>

						<div className="campo-estudio">
							<label>Key</label>
							<input
								type="text"
								value={key}
								onChange={(e) => setKey(e.target.value)}
								className="input-estudio"
								disabled={esFormularioImagen}
							/>
						</div>
						<div className="campo-estudio">
							<label>Clave</label>
							<input
								type="text"
								value={clave}
								onChange={(e) => setClave(e.target.value)}
								className="input-estudio"
							/>
						</div>
						<div className="campo-estudio">
							<label>Descripción</label>
							<input
								type="text"
								value={descripcion}
								onChange={(e) => setDescripcion(e.target.value)}
								className="input-estudio"
							/>
						</div>

						{esFormularioImagen ? (
							<>
								<div className="campo-estudio-doble">
									<div className="campo-estudio">
										<label>Modalidad</label>
										<input
											type="text"
											value={modalidadSeleccionada}
											className="input-estudio"
											readOnly
										/>
									</div>
									<div className="campo-estudio">
										<label>Empresa operativa</label>
										<input
											type="text"
											value={resolverEmpresaOperativaCatalogo(empresaActual?.nombre || "")}
											className="input-estudio"
											readOnly
										/>
									</div>
								</div>

								<div className="campo-estudio-doble">
									<div className="campo-estudio">
										<label>Area</label>
										<input
											type="text"
											value={area}
											onChange={(e) => setArea(e.target.value)}
											className="input-estudio"
											placeholder="Imagen"
										/>
									</div>
									<div className="campo-estudio">
										<label>Región anatómica</label>
										<input
											type="text"
											value={regionAnatomica}
											onChange={(e) => setRegionAnatomica(e.target.value)}
											className="input-estudio"
										/>
									</div>
								</div>

								<div className="campo-estudio-doble">
									<div className="campo-estudio">
										<label>Días de Proceso</label>
										<input
											type="number"
											value={diasProceso}
											onChange={(e) => setDiasProceso(e.target.value)}
											className="input-estudio"
										/>
									</div>
									<div className="campo-estudio">
										<label>Duración estimada (min)</label>
										<input
											type="number"
											value={duracionMinutos}
											onChange={(e) => setDuracionMinutos(e.target.value)}
											className="input-estudio"
										/>
									</div>
								</div>

								<div className="campo-estudio">
									<label>Preparación</label>
									<textarea
										value={preparacion}
										onChange={(e) => setPreparacion(e.target.value)}
										className="textarea-estudio"
										rows="3"
									/>
								</div>

								<div className="checkboxes-impresion">
									<label className="checkbox-label">
										<input
											type="checkbox"
											checked={requiereContraste}
											onChange={(e) => setRequiereContraste(e.target.checked)}
										/>
										<span>Requiere contraste</span>
									</label>
									<label className="checkbox-label">
										<input
											type="checkbox"
											checked={requiereInterpretacion}
											onChange={(e) =>
												setRequiereInterpretacion(e.target.checked)
											}
										/>
										<span>Requiere interpretación</span>
									</label>
									<label className="checkbox-label">
										<input
											type="checkbox"
											checked={activoImagen}
											onChange={(e) => setActivoImagen(e.target.checked)}
										/>
										<span>Activo</span>
									</label>
								</div>
							</>
						) : (
							<>
						<div className="campo-estudio-doble">
							<div className="campo-estudio">
								<label>Area</label>
								<select
									value={area}
									onChange={(e) => setArea(e.target.value)}
									className="select-estudio">
									{areas.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										areas.map((a) => (
											<option key={a.id_area} value={a.nombre}>
												{a.nombre}
											</option>
										))
									)}
								</select>
							</div>
							<div className="campo-estudio">
								<label>Tipo de Muestra</label>
								<select
									value={tipoMuestra}
									onChange={(e) => setTipoMuestra(e.target.value)}
									className="select-estudio">
									{tiposMuestra.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										tiposMuestra.map((tm) => (
											<option key={tm.id} value={tm.categoria}>
												{tm.categoria}
											</option>
										))
									)}
								</select>
							</div>
						</div>

						<div className="campo-estudio-doble">
							<div className="campo-estudio">
								<label>Recipiente</label>
								<select
									value={recipiente}
									onChange={(e) => setRecipiente(e.target.value)}
									className="select-estudio">
									{recipientes.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										recipientes.map((r) => (
											<option key={r.id} value={r.nombre}>
												{r.nombre}
											</option>
										))
									)}
								</select>
							</div>
							<div className="campo-estudio">
								<label>Metodo</label>
								<select
									value={metodo}
									onChange={(e) => setMetodo(e.target.value)}
									className="select-estudio">
									{metodos.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										metodos.map((m) => (
											<option key={m.id} value={m.nombre}>
												{m.nombre}
											</option>
										))
									)}
								</select>
							</div>
						</div>

						<div className="campo-estudio-doble">
							<div className="campo-estudio">
								<label>Tecnica</label>
								<select
									value={tecnica}
									onChange={(e) => setTecnica(e.target.value)}
									className="select-estudio">
									{tecnicas.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										tecnicas.map((t) => (
											<option key={t.id} value={t.nombre}>
												{t.nombre}
											</option>
										))
									)}
								</select>
							</div>
							<div className="campo-estudio">
								<label>Equipo</label>
								<select
									value={equipo}
									onChange={(e) => setEquipo(e.target.value)}
									className="select-estudio">
									{equipos.length === 0 ? (
										<option value="">Cargando...</option>
									) : (
										equipos.map((e) => (
											<option key={e.id} value={e.nombre}>
												{e.nombre}
											</option>
										))
									)}
								</select>
							</div>
						</div>

						<div className="campo-estudio">
							<label>Condiciones Del Paciente</label>
							<textarea
								value={condicionesPaciente}
								onChange={(e) => setCondicionesPaciente(e.target.value)}
								className="textarea-estudio"
								rows="3"
							/>
						</div>
						<div className="campo-estudio">
							<label>Etiquetas Extra</label>
							<textarea
								value={etiquetasExtra}
								onChange={(e) => setEtiquetasExtra(e.target.value)}
								className="textarea-estudio"
								rows="3"
							/>
						</div>
						<div className="campo-estudio">
							<label>Dias de Proceso</label>
							<input
								type="number"
								value={diasProceso}
								onChange={(e) => setDiasProceso(e.target.value)}
								className="input-estudio"
							/>
						</div>

						<div className="checkboxes-impresion">
							<label className="checkbox-label">
								<input
									type="checkbox"
									checked={imprimirMetodo}
									onChange={(e) => setImprimirMetodo(e.target.checked)}
								/>
								<span>Imprimir Metodo</span>
							</label>
							<label className="checkbox-label">
								<input
									type="checkbox"
									checked={imprimirTecnica}
									onChange={(e) => setImprimirTecnica(e.target.checked)}
								/>
								<span>Imprimir Tecnica</span>
							</label>
							<label className="checkbox-label">
								<input
									type="checkbox"
									checked={imprimirEquipo}
									onChange={(e) => setImprimirEquipo(e.target.checked)}
								/>
								<span>Imprimir Equipo</span>
							</label>
							<label className="checkbox-label">
								<input
									type="checkbox"
									checked={imprimirMuestra}
									onChange={(e) => setImprimirMuestra(e.target.checked)}
								/>
								<span>Imprimir Muestra</span>
							</label>
						</div>
							</>
						)}

						<div className="botones-formulario">
							<button className="btn-guardar-estudio" onClick={handleGuardar}>
								Guardar Estudio
							</button>
							<button className="btn-editar-estudio" onClick={handleEditar}>
								Editar
							</button>
							<button className="btn-nuevo-estudio" onClick={limpiarFormulario}>
								Nuevo
							</button>
						</div>
					</div>

					<div className="panel-tabla-estudios">
						<div className="controles-tabla-estudios">
							<input
								type="text"
								placeholder="Busca Estudios Aqui..."
								value={buscarEstudio}
								onChange={(e) => setBuscarEstudio(e.target.value)}
								className="input-buscar-estudios-adm"
							/>
							<div className="botones-exportar-estudios">
								<button
									className="btn-exportar-est"
									onClick={handleExportarExcel}
									title="Exportar a Excel">
									<img src={excelBtn} alt="Excel" className="icono-exportar" />
								</button>
								<button
									className="btn-exportar-est"
									onClick={handleExportarPDF}
									title="Exportar a PDF">
									<img src={pdfBtn} alt="PDF" className="icono-exportar" />
								</button>
							</div>
						</div>

						<div className="tabla-estudios-adm-container">
							<table className="tabla-estudios-adm">
								<thead>
									<tr>
										<th>ID</th>
										<th>CatÃ¡logo</th>
										<th>Clave</th>
										<th>Descripcion</th>
										<th>Area</th>
										<th>Tipo</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{estudios.length === 0 ? (
										<tr>
											<td colSpan="7" className="sin-estudios-adm">
												No hay estudios para mostrar
											</td>
										</tr>
									) : (
										estudios.map((estudio, index) => (
											<tr key={`${estudio.modulo}-${estudio.id}`}>
												<td>{index + 1}</td>
												<td>{estudio.tipo_catalogo}</td>
												<td>{estudio.clave}</td>
												<td>{estudio.descripcion}</td>
												<td>{estudio.area}</td>
												<td>{estudio.modalidad || "laboratorio"}</td>
												<td>
													<div className="acciones-estudios-adm">
														<button
															className="btn-editar-estudio-tabla"
															onClick={() => cargarEstudioParaEditar(estudio)}
															title="Editar estudio">
															<img
																src={editarIconoV2}
																alt="Editar"
																className="icono-accion"
															/>
														</button>
														<button
															className="btn-eliminar-estudio-tabla"
															onClick={() => handleEliminar(estudio)}
															title="Eliminar estudio">
															<img
																src={eliminarIconoV2}
																alt="Eliminar"
																className="icono-accion"
															/>
														</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						<div className="contador-estudios">
							Mostrando registros del 1 al {estudios.length} de un total de{" "}
							{totalEstudios}
						</div>
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default EstudiosLab;
