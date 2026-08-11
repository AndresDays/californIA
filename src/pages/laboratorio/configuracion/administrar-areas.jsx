import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarAreas = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Areas"
		tabla="areas"
		idColumna="id_area"
		storageKey="areas:termino"
		nombreEntidad="Area"
		tituloColumna="Area"
		mapearFila={(a) => ({ id: a.id_area, area: a.nombre })}
	/>
);

export default AdministrarAreas;
