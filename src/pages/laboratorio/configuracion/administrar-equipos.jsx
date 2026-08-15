import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarEquipos = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Equipos"
		tabla="equipos_lab"
		idColumna="id"
		storageKey="equipos:termino"
		nombreEntidad="Equipo"
		tituloColumna="Equipo"
		mapearFila={(e) => ({ id: e.id, equipo: e.nombre })}
	/>
);

export default AdministrarEquipos;
