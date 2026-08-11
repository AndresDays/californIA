import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarMetodos = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Metodos"
		tabla="metodos"
		idColumna="id"
		storageKey="metodos:termino"
		nombreEntidad="Metodo"
		tituloColumna="Metodo"
		mapearFila={(m) => ({ id: m.id, metodo: m.nombre })}
	/>
);

export default AdministrarMetodos;
