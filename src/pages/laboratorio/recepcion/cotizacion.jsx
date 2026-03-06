import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import empresaIcono from "../../../assets/empresaIcono.png";
import pacienteIcono from "../../../assets/pacienteIcono.png";
import Header from '../../../components/header-principal.jsx';
import SidebarHome from '../../../components/sidebar-home.jsx';
import Layout from "../../../components/layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import { generarPDFCotizacion } from "../../../utils/generar-pdf-cotizacion";
import "./cotizacion.css";

const Cotizacion = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [nombrePaciente, setNombrePaciente] = useState("");
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [condicionesPaciente, setCondicionesPaciente] = useState("");

	const [buscarCotizacion, setBuscarCotizacion] = useState("");
	const [cotizaciones, setCotizaciones] = useState([]);
	const [empresas, setEmpresas] = useState([]);

	const [buscarEstudio, setBuscarEstudio] = useState("");
	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);

	const [total, setTotal] = useState(0);
	const [descuento, setDescuento] = useState(0);
	const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

	const [empleadoData, setEmpleadoData] = useState(null);

    useEffect(() => {
        const fetchEmpleadoData = async () => {
          if (!user?.id) return;

          try {
            const { data: empleado, error } = await supabase
              .from('empleados')
              .select('nombre, rol')
              .eq('auth_uuid', user.id)
              .maybeSingle();

            if (error) {
              console.error('Error al obtener empleado:', error);
              return;
            }

            if (empleado) {
              setEmpleadoData(empleado);
            }
          } catch (error) {
            console.error('Error al obtener datos del empleado:', error);
          }
        };

        fetchEmpleadoData();
      }, [user]);

	useEffect(() => {
		cargarCotizaciones();
		cargarEmpresas();
		cargarEstudiosDisponibles();
	}, []);

	useEffect(() => {
		calcularTotales();
	}, [estudiosSeleccionados, descuento, descuentoPorcentaje]);

	const cargarEmpresas = async () => {
		try {
			const { data, error } = await supabase
				.from("clientes")
				.select("id_cliente, nombre")
				.order("nombre");

			if (error) throw error;
			setEmpresas(data || []);
		} catch (error) {
			console.error("Error al cargar empresas:", error);
		}
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion, area")
				.order("clave");

			if (error) throw error;
			setEstudiosDisponibles(data || []);
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
          id_cotizacion,
          numero_cotizacion,
          nombre_paciente,
          estudios,
          total,
          descuento,
          descuento_porcentaje,
          fecha_cotizacion,
          clientes (
            nombre
          )
        `
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
			if (!nombreEmpresa) {
				return 150;
			}

			const { data, error } = await supabase
				.from("precios_estudios")
				.select("precio")
				.eq("clave", claveEstudio)
				.eq("cliente", nombreEmpresa)
				.single();

			if (error) {
				return 150;
			}

			return parseFloat(data.precio);
		} catch (error) {
			console.error("Error al obtener precio:", error);
			return 150;
		}
	};

	const agregarEstudio = async (estudio) => {
		if (estudiosSeleccionados.find((e) => e.id === estudio.id)) {
			alert("Este estudio ya fue agregado");
			return;
		}

		const empresaObj = empresas.find(
			(emp) => emp.id_cliente.toString() === empresaSeleccionada.toString()
		);
		const nombreEmpresa = empresaObj ? empresaObj.nombre : "";

		const precioEstudio = await obtenerPrecioEstudio(estudio.clave, nombreEmpresa);

		const estudioConPrecio = {
			...estudio,
			precio: precioEstudio,
			tipo: estudio.area || "Laboratorio",
			diasProceso: 1,
		};

		setEstudiosSeleccionados([...estudiosSeleccionados, estudioConPrecio]);
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
	};

	const eliminarEstudio = (id) => {
		setEstudiosSeleccionados(estudiosSeleccionados.filter((e) => e.id !== id));
	};

	const calcularTotales = () => {
		const subtotal = estudiosSeleccionados.reduce(
			(sum, est) => sum + (parseFloat(est.precio) || 0),
			0
		);
		setTotal(subtotal);

		let descuentoCalc = 0;
		if (descuentoPorcentaje > 0) {
			descuentoCalc = subtotal * (descuentoPorcentaje / 100);
			setDescuento(descuentoCalc);
		}
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
			0
		);
		const finDia = new Date(
			ahora.getFullYear(),
			ahora.getMonth(),
			ahora.getDate(),
			23,
			59,
			59
		);

		const { count, error } = await supabase
			.from("cotizaciones")
			.select("*", { count: "exact", head: true })
			.gte("fecha_cotizacion", inicioDia.toISOString())
			.lte("fecha_cotizacion", finDia.toISOString());

		if (error) {
			console.error("Error al contar cotizaciones:", error);
		}

		const numeroSecuencial = String((count || 0) + 1).padStart(4, "0");

		return `COT-${dia}${mes}${anio}${numeroSecuencial}`;
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
			alert("Por favor ingrese el nombre del paciente");
			return;
		}

		if (estudiosSeleccionados.length === 0) {
			alert("Por favor agregue al menos un estudio");
			return;
		}

		try {
			const numeroCotizacion = await generarNumeroCotizacion();
			const totalFinal = total - descuento;

			const estudiosParaGuardar = estudiosSeleccionados.map((est) => ({
				clave: est.clave,
				descripcion: est.descripcion,
				precio: est.precio,
			}));

			const { data, error } = await supabase
				.from("cotizaciones")
				.insert([
					{
						numero_cotizacion: numeroCotizacion,
						nombre_paciente: nombrePaciente,
						id_cliente: empresaSeleccionada || null,
						condiciones_paciente: condicionesPaciente || null,
						estudios: estudiosParaGuardar,
						subtotal: total,
						descuento: descuento,
						descuento_porcentaje: descuentoPorcentaje,
						total: totalFinal,
					},
				])
				.select()
				.single();

			if (error) throw error;

			alert("¡Cotización guardada exitosamente!");

			await abrirPDFCotizacion({
				...data,
				fecha_cotizacion: new Date().toISOString(),
			});

			await cargarCotizaciones();

			limpiarFormulario();
		} catch (error) {
			console.error("Error al guardar cotización:", error);
			alert("Error al guardar la cotización: " + error.message);
		}
	};

	const limpiarFormulario = () => {
		setNombrePaciente("");
		setEmpresaSeleccionada("");
		setCondicionesPaciente("");
		setEstudiosSeleccionados([]);
		setDescuento(0);
		setDescuentoPorcentaje(0);
	};

	const handleVerCotizacion = async (cotizacion) => {
		await abrirPDFCotizacion(cotizacion);
	};

	const handleEnviarWhatsAppCotizacion = (cotizacion) => {
		const mensaje = `
Cotización ${cotizacion.numero_cotizacion}
Paciente: ${cotizacion.nombre_paciente}
Total: $${cotizacion.total}

Descarga de resultados:
sistema.centraldiagnosticacalifornia.com/resultados/
    `.trim();

		const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
		window.open(url, "_blank");
	};

	const handleEnviarCorreoCotizacion = (cotizacion) => {
		alert(
			`Función de envío por correo en desarrollo para: ${cotizacion.nombre_paciente}`
		);
	};

	const handleEnviarWhatsApp = () => {
		if (!nombrePaciente) {
			alert("Primero guarde la cotización");
			return;
		}
		alert("Primero debe guardar la cotización");
	};

	const handleEnviarCorreo = () => {
		if (!nombrePaciente) {
			alert("Primero guarde la cotización");
			return;
		}
		alert("Primero debe guardar la cotización");
	};

	const filtrarEstudios = (termino) => {
		if (termino.length < 2) {
			setShowBusquedaEstudios(false);
			return;
		}
		setShowBusquedaEstudios(true);
	};

	const estudiosFiltrados = estudiosDisponibles.filter(
		(est) =>
			est.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
			est.clave.toLowerCase().includes(buscarEstudio.toLowerCase())
	);

	const cotizacionesFiltradas = cotizaciones.filter(
		(cot) =>
			cot.nombre_paciente.toLowerCase().includes(buscarCotizacion.toLowerCase()) ||
			cot.numero_cotizacion.toLowerCase().includes(buscarCotizacion.toLowerCase())
	);

    const getPrimerNombre = (nombreCompleto) => {
                 if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
                 return nombreCompleto;
               };

     const formatRol = (rol) => {
         if (!rol) return 'Usuario';

         const roles = {
           'admin': 'Administrador',
           'administrador': 'Administrador',
           'radiologo': 'Radiólogo - Director',
           'doctor': 'Médico',
           'medico': 'Médico',
           'tecnico_radiologia': 'Técnico en Radiología',
           'tecnico': 'Técnico',
           'quimico': 'Químico',
           'recepcionista': 'Recepcionista',
           'desarrollador': 'Desarrollador'
         };

         return roles[rol] || rol;
       };

   const handleLogout = async () => {
     const { signOut } = useAuth();
     await signOut();
     navigate('/login');
   };

	return (
		<Layout>
			<div className="cotizacion-wrapper">
				<Header
                  empleadoData={empleadoData}
                  formatRol={formatRol}
                  getPrimerNombre={getPrimerNombre}
                  user={user}
                  handleLogout={handleLogout}
                  currentPage="editar-solicitud"
                />

                <SidebarHome/>

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
								<img src={empresaIcono} alt="Cliente" className="icon-img" />
								<select
									value={empresaSeleccionada}
									onChange={(e) => setEmpresaSeleccionada(e.target.value)}
									className="select-empresa-cot">
									<option value="">Selecciona una Empresa</option>
									{empresas.map((emp) => (
										<option key={emp.id_cliente} value={emp.id_cliente}>
											{emp.nombre}
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

							<div
								className="buscar-estudios-grupo-cot"
								style={{ position: "relative" }}>
								<input
									type="text"
									placeholder="Busca Estudios Aqui..."
									value={buscarEstudio}
									onChange={(e) => {
										setBuscarEstudio(e.target.value);
										filtrarEstudios(e.target.value);
									}}
									className="input-buscar-estudios-cot"
								/>

								{showBusquedaEstudios && buscarEstudio.length >= 2 && (
									<div className="search-results-estudios-cot">
										{estudiosFiltrados.slice(0, 10).map((est) => (
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
											<th>Días Proceso</th>
											<th>Acciones</th>
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
													<td>{estudio.diasProceso} días</td>
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
								<button className="btn-whatsapp-cot" onClick={handleEnviarWhatsApp}>
									💬 ENVIAR POR WHATSAPP
								</button>
								<button className="btn-guardar-cot" onClick={handleGuardarGenerar}>
									GUARDAR / GENERAR TICKET
								</button>
								<button className="btn-correo-cot" onClick={handleEnviarCorreo}>
									✉️ ENVIAR POR CORREO
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default Cotizacion;
