import editarIconoV2 from "../../../assets/editarIconoV2.png";
import eliminarIconoV2 from "../../../assets/eliminarIconoV2.png";
import './tabla.css';

const Tabla = ({
  headers = [],
  datos = [],
  paginaInicio = 1,
  onEditar = null,
  onEliminar = null,
  mostrarNumero = true,
  textoVacio = "No hay registros para mostrar"
}) => {
  return (
		<div className="tabla-generica-container">
			<table className="tabla-generica">
				<thead>
					<tr>
						{mostrarNumero && <th>#</th>}
						{headers.map((header, index) => (
							<th key={index}>{header}</th>
						))}
						{(onEditar || onEliminar) && <th>Acciones</th>}
					</tr>
				</thead>
				<tbody>
					{datos.length === 0 ? (
						<tr>
							<td
								colSpan={
									headers.length +
									(mostrarNumero ? 1 : 0) +
									(onEditar || onEliminar ? 1 : 0)
								}
								className="sin-datos">
								{textoVacio}
							</td>
						</tr>
					) : (
						datos.map((item, index) => (
							<tr key={item.id || index}>
								{mostrarNumero && <td>{paginaInicio + index}</td>}
								{Object.keys(item)
									.filter((key) => key !== "id")
									.map((key, idx) => (
										<td key={idx}>{item[key]}</td>
									))}
								{(onEditar || onEliminar) && (
									<td>
										<div className="acciones-tabla-generica">
											{onEditar && (
												<button
													className="btn-editar-estudio-tabla"
													onClick={() => onEditar(item.id)}
													title="Editar">
													<img
														src={editarIconoV2}
														alt="Editar"
														className="icono-accion"
													/>
												</button>
											)}
											{onEliminar && (
												<button
													className="btn-eliminar-estudio-tabla"
													onClick={() => onEliminar(item.id)}
													title="Eliminar">
													<img
														src={eliminarIconoV2}
														alt="Eliminar"
														className="icono-accion"
													/>
												</button>
											)}
										</div>
									</td>
								)}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default Tabla;
