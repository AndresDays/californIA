import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarNiveles = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Niveles"
		tabla="niveles_mar"
		idColumna="id"
		storageKey="niveles:termino"
		nombreEntidad="Nivel"
		tituloColumna="Nivel"
		mapearFila={(n) => ({ id: n.id, nivel: n.nombre })}
	/>
);

export default AdministrarNiveles;
