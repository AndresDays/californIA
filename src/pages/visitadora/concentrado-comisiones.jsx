import { useMemo, useState } from "react";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import {
	useCerrarMesComisiones,
	useConcentradoComisiones,
	useDetalleIngresoDoctor,
	useMarcarComisionPagada,
} from "../../hooks/use-comisiones-medicos";
import {
	construirConcentradoMensual,
	formatoMonedaComision,
	nombreDoctor,
	totalesConcentrado,
} from "../../utils/comisiones-medicos";
import { puedeEditarComisiones } from "../../utils/role-permissions";
import { etiquetaPeriodo, periodoDeHoy, periodoDesplazado } from "../../utils/semanas-visitadora";
import { exportarExcel, exportarPDF } from "../../utils/exportar-tabla";
import ModalPorcentajeDoctor from "./componentes/modal-porcentaje-doctor";
import "./visitadora.css";

const COLUMNAS = ["Médico", "Órdenes", "%", "Ingreso generado", "Comisión", "Estado"];

// Un mes cerrado ya no se recalcula: se muestra tal como quedó congelado.
const filasDesdeMesCerrado = (mensuales = []) =>
	mensuales
		.map((registro) => ({
			idDoctor: registro.id_doctor,
			idMensual: registro.id_mensual,
			nombre: nombreDoctor(registro.doctores),
			ordenes: Number(registro.ordenes) || 0,
			ingreso: Number(registro.ingreso_generado) || 0,
			porcentaje: Number(registro.porcentaje) || 0,
			comision: Number(registro.comision) || 0,
			sinPorcentaje: Number(registro.porcentaje) === 0,
			estado: registro.estado,
		}))
		.sort((a, b) => b.ingreso - a.ingreso);

const ConcentradoComisiones = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [periodo, setPeriodo] = useState(periodoDeHoy());
	const [doctorPorcentaje, setDoctorPorcentaje] = useState(null);
	const [doctorDetalle, setDoctorDetalle] = useState(null);
	const [confirmarCierre, setConfirmarCierre] = useState(false);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const puedeEditar = puedeEditarComisiones(empleadoData?.rol);
	const { data, isLoading, error } = useConcentradoComisiones({ periodo });
	const cerrarMes = useCerrarMesComisiones();
	const marcarPagada = useMarcarComisionPagada();
	const { data: detalle = [] } = useDetalleIngresoDoctor({ periodo, idDoctor: doctorDetalle });

	const cerrado = Boolean(data?.cerrado);

	const filas = useMemo(() => {
		if (!data) return [];
		if (data.cerrado) return filasDesdeMesCerrado(data.mensuales);
		return construirConcentradoMensual({
			ventas: data.ventas,
			doctores: data.doctores,
			comisiones: data.comisiones,
			periodo,
		});
	}, [data, periodo]);

	// Los médicos que generaron ingreso sin porcentaje asignado salen primero:
	// ese hueco es el que provoca los reclamos de comisión.
	const filasOrdenadas = useMemo(
		() => [...filas].sort((a, b) => Number(b.sinPorcentaje) - Number(a.sinPorcentaje)),
		[filas],
	);

	const totales = useMemo(() => totalesConcentrado(filas), [filas]);

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	const filasParaExportar = () =>
		filasOrdenadas.map((fila) => [
			fila.nombre,
			fila.ordenes,
			fila.sinPorcentaje ? "Sin %" : `${fila.porcentaje} %`,
			fila.ingreso.toFixed(2),
			fila.comision.toFixed(2),
			fila.estado === "pagado" ? "Pagado" : cerrado ? "Por pagar" : "Mes abierto",
		]);

	const confirmarCerrarMes = async () => {
		try {
			await cerrarMes.mutateAsync({
				periodo,
				filas,
				idEmpleado: empleadoData?.id_empleado,
			});
			avisar(`${etiquetaPeriodo(periodo)} quedó cerrado.`);
		} catch (fallo) {
			avisar(fallo.message || "No se pudo cerrar el mes.", "error");
		} finally {
			setConfirmarCierre(false);
		}
	};

	const pagar = async (fila) => {
		try {
			await marcarPagada.mutateAsync({ idMensual: fila.idMensual });
			avisar(`Se marcó como pagada la comisión de ${fila.nombre}.`);
		} catch (fallo) {
			avisar(fallo.message || "No se pudo marcar el pago.", "error");
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Concentrado de médicos</h1>
					<div className="visitadora-navegador">
						<button
							type="button"
							onClick={() => setPeriodo(periodoDesplazado(periodo, -1))}
							aria-label="Mes anterior">
							◀
						</button>
						<span>{etiquetaPeriodo(periodo)}</span>
						<button
							type="button"
							onClick={() => setPeriodo(periodoDesplazado(periodo, 1))}
							aria-label="Mes siguiente">
							▶
						</button>
					</div>
					<span className={`visitadora-estado ${cerrado ? "cerrado" : "abierto"}`}>
						{cerrado ? "CERRADO" : "ABIERTO"}
					</span>
					<div className="visitadora-acciones">
						<button
							type="button"
							onClick={() =>
								exportarExcel(
									COLUMNAS,
									filasParaExportar(),
									`Comisiones_${periodo}`,
								)
							}>
							Exportar Excel
						</button>
						<button
							type="button"
							onClick={() =>
								exportarPDF(
									`Comisiones de médicos — ${etiquetaPeriodo(periodo)}`,
									COLUMNAS,
									filasParaExportar(),
									`Comisiones_${periodo}`,
								)
							}>
							PDF
						</button>
						{puedeEditar && !cerrado && (
							<button
								type="button"
								className="visitadora-boton-primario"
								onClick={() => setConfirmarCierre(true)}
								disabled={filas.length === 0}>
								Cerrar mes
							</button>
						)}
					</div>
				</div>

				<div className="visitadora-tarjetas">
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Ingreso del mes</span>
						<span className="visitadora-tarjeta-valor">
							{formatoMonedaComision(totales.ingreso)}
						</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Comisión a pagar</span>
						<span className="visitadora-tarjeta-valor dinero">
							{formatoMonedaComision(totales.comision)}
						</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Médicos que enviaron</span>
						<span className="visitadora-tarjeta-valor">{totales.medicos}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Sin porcentaje</span>
						<span
							className={`visitadora-tarjeta-valor ${
								totales.sinPorcentaje > 0 ? "alerta" : ""
							}`}>
							{totales.sinPorcentaje}
						</span>
					</div>
				</div>

				{error && (
					<p className="visitadora-error">
						No se pudo cargar el concentrado: {error.message}
					</p>
				)}

				<div className="visitadora-tabla-contenedor">
					<table className="visitadora-tabla">
						<thead>
							<tr>
								{COLUMNAS.map((columna) => (
									<th key={columna}>{columna}</th>
								))}
								{puedeEditar && <th>Acción</th>}
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={COLUMNAS.length + 1}>Cargando…</td>
								</tr>
							)}
							{!isLoading && filasOrdenadas.length === 0 && (
								<tr>
									<td colSpan={COLUMNAS.length + 1}>
										Ningún médico generó ingreso en {etiquetaPeriodo(periodo)}.
									</td>
								</tr>
							)}
							{filasOrdenadas.map((fila) => (
								<tr
									key={fila.idDoctor}
									className={fila.sinPorcentaje ? "visitadora-fila-alerta" : ""}>
									<td>
										<button
											type="button"
											className="visitadora-enlace"
											onClick={() =>
												setDoctorDetalle(
													doctorDetalle === fila.idDoctor ? null : fila.idDoctor,
												)
											}>
											{fila.nombre}
										</button>
										{doctorDetalle === fila.idDoctor && (
											<ul className="visitadora-detalle">
												{detalle.map((venta) => (
													<li key={venta.id_venta}>
														{venta.folio} · {String(venta.fecha_venta).slice(0, 10)} ·{" "}
														{formatoMonedaComision(venta.total)}
													</li>
												))}
												{detalle.length === 0 && <li>Sin folios en el mes.</li>}
											</ul>
										)}
									</td>
									<td className="numero">{fila.ordenes}</td>
									<td className="numero">
										{fila.sinPorcentaje ? "—" : `${fila.porcentaje} %`}
									</td>
									<td className="numero">{formatoMonedaComision(fila.ingreso)}</td>
									<td className="numero">
										{fila.sinPorcentaje ? "—" : formatoMonedaComision(fila.comision)}
									</td>
									<td>
										{fila.sinPorcentaje ? (
											<span className="visitadora-pastilla sin">Sin %</span>
										) : fila.estado === "pagado" ? (
											<span className="visitadora-pastilla pagado">Pagado</span>
										) : cerrado ? (
											<span className="visitadora-pastilla pendiente">Por pagar</span>
										) : (
											<span className="visitadora-pastilla abierto">Mes abierto</span>
										)}
									</td>
									{puedeEditar && (
										<td>
											{!cerrado && (
												<button
													type="button"
													className="visitadora-enlace"
													onClick={() =>
														setDoctorPorcentaje({
															idDoctor: fila.idDoctor,
															nombre: fila.nombre,
															porcentaje: fila.porcentaje,
														})
													}>
													Fijar %
												</button>
											)}
											{cerrado && fila.estado !== "pagado" && (
												<button
													type="button"
													className="visitadora-enlace"
													onClick={() => pagar(fila)}>
													Marcar pagada
												</button>
											)}
										</td>
									)}
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td>TOTAL · {totales.medicos} médicos</td>
								<td className="numero">{totales.ordenes}</td>
								<td />
								<td className="numero">{formatoMonedaComision(totales.ingreso)}</td>
								<td className="numero">{formatoMonedaComision(totales.comision)}</td>
								<td />
								{puedeEditar && <td />}
							</tr>
						</tfoot>
					</table>
				</div>

				{doctorPorcentaje && (
				<ModalPorcentajeDoctor
					key={doctorPorcentaje.idDoctor}
					isOpen
					doctor={doctorPorcentaje}
					periodo={periodo}
					historial={data?.comisiones ?? []}
					onClose={() => setDoctorPorcentaje(null)}
					onGuardado={(mensaje) => {
						setDoctorPorcentaje(null);
						avisar(mensaje);
					}}
					onError={(mensaje) => avisar(mensaje, "error")}
				/>
				)}

				<ModalConfirmarEliminacion
					isOpen={confirmarCierre}
					onClose={() => setConfirmarCierre(false)}
					onConfirm={confirmarCerrarMes}
					titulo={`Cerrar ${etiquetaPeriodo(periodo)}`}
					mensaje={`Se congelarán ${filas.length} médicos por ${formatoMonedaComision(
						totales.comision,
					)} de comisión. Después de cerrar, un cambio de porcentaje ya no moverá este mes.`}
					textoConfirmar="Cerrar el mes"
					textoCancelar="Cancelar"
					mostrarAdvertencia={false}
				/>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
			</div>
		</PageLayout>
	);
};

export default ConcentradoComisiones;
