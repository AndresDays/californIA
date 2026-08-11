import PaginaCatalogoSimple from "../componentes/pagina-catalogo-simple.jsx";

const AdministrarRecipientes = () => (
	<PaginaCatalogoSimple
		titulo="Administrar Recipientes"
		tabla="recipientes"
		idColumna="id"
		storageKey="recipientes:termino"
		nombreEntidad="Recipiente"
		tituloColumna="Recipiente"
		mapearFila={(r) => ({ id: r.id, recipiente: r.nombre })}
	/>
);

export default AdministrarRecipientes;
