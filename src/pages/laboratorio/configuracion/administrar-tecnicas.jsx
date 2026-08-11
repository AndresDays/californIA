import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarTecnicas = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Tecnicas"
		tabla="tecnicas"
		idColumna="id"
		storageKey="tecnicas:termino"
		nombreEntidad="Tecnica"
		tituloColumna="Tecnica"
		mapearFila={(t) => ({ id: t.id, tecnica: t.nombre })}
	/>
);

export default AdministrarTecnicas;
