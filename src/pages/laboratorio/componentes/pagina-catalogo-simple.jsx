import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { useCatalogoSimple } from "../../../hooks/use-catalogo-simple";
import ModalAgregar from "./modal-agregar.jsx";
import Tabla from "./tabla.jsx";
import "../configuracion/administrar-catalogo.css";

const PaginaCatalogoSimple = ({
	titulo,
	tabla,
	idColumna = "id",
	storageKey,
	nombreEntidad,
	tituloColumna,
	mapearFila,
}) => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const catalogo = useCatalogoSimple({ tabla, idColumna, storageKey, nombreEntidad });

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="admin-catalogo-wrapper">
				<div className="admin-catalogo-header">
					<h1 className="admin-catalogo-title">{titulo}</h1>
				</div>

				<div className="admin-catalogo-content">
					<div className="controles-superiores-catalogo">
						<button className="btn-agregar-catalogo" onClick={catalogo.abrirAgregar}>
							Agregar {nombreEntidad}
						</button>
					</div>

					<div className="controles-tabla-catalogo">
						<div className="mostrar-registros-catalogo">
							<span>Mostrar</span>
							<select
								value={catalogo.registrosPorPagina}
								onChange={(e) => {
									catalogo.setRegistrosPorPagina(parseInt(e.target.value));
									catalogo.setPaginaActual(1);
								}}
								className="select-registros-catalogo">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-catalogo-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={catalogo.buscar}
								onChange={(e) => {
									catalogo.setBuscar(e.target.value);
									catalogo.setPaginaActual(1);
								}}
								className="input-buscar-catalogo"
							/>
						</div>
					</div>

					<Tabla
						headers={[tituloColumna]}
						datos={catalogo.registros.map(mapearFila)}
						paginaInicio={catalogo.inicio}
						onEditar={catalogo.handleEditar}
						textoVacio={`No hay ${nombreEntidad.toLowerCase()}s para mostrar`}
					/>

					<div className="paginacion-catalogo">
						<div className="contador-catalogo">
							Mostrando registros del {catalogo.inicio} al {catalogo.fin} de un total de{" "}
							{catalogo.total}
						</div>
						<div className="botones-paginacion-catalogo">
							<button
								className="btn-pag-catalogo"
								onClick={() => catalogo.setPaginaActual((p) => p - 1)}
								disabled={catalogo.paginaActual === 1}>
								Anterior
							</button>
							{[...Array(catalogo.totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-catalogo ${catalogo.paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => catalogo.setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag-catalogo"
								onClick={() => catalogo.setPaginaActual((p) => p + 1)}
								disabled={catalogo.paginaActual >= catalogo.totalPaginas}>
								Siguiente
							</button>
						</div>
					</div>
				</div>

				<ModalAgregar
					isOpen={catalogo.modalOpen}
					onClose={catalogo.cerrarModal}
					onGuardar={catalogo.handleGuardar}
					titulo={catalogo.modoEdicion ? "Editar" : `Agregar ${nombreEntidad}`}
					placeholder={catalogo.modoEdicion ? `Editar ${nombreEntidad}` : `Ingresar ${nombreEntidad}`}
					icono="⚙️"
					valorInicial={catalogo.modoEdicion ? catalogo.editando?.nombre : ""}
					modoEdicion={catalogo.modoEdicion}
				/>
			</div>
		</PageLayout>
	);
};

export default PaginaCatalogoSimple;
