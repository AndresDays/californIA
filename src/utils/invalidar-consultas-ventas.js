// Refresca lo que depende de las ventas después de moverlas.
//
// Las pantallas que leen ventas van por React Query con `staleTime` de minutos:
// eso es lo que hace que moverse entre pantallas sea instantáneo, pero también
// lo que hacía que una orden recién cobrada no apareciera en el reporte de
// ventas hasta recargar la página. El caché no se entera solo de que se guardó
// algo; hay que decírselo.
//
// `refetchOnWindowFocus` no alcanzaba: sólo dispara cuando la ventana pierde y
// recupera el foco del sistema, y moverse de Nuevo paciente al reporte pasa
// dentro de la misma pestaña sin que el navegador se entere.
//
// La lista está aquí y no repartida en cada pantalla para que agregar un
// reporte nuevo sea una línea en un solo archivo. El criterio para entrar es
// simple: la consulta lee `ventas`, `estudios_venta` o algo que se cree junto
// con una venta.

const CONSULTAS_QUE_LEEN_VENTAS = [
	// Reportes y listados de ventas
	["reporte-ventas"],
	// El corte del período va en consultas aparte, y la clave no comparte raíz
	// con la de arriba: React Query compara elemento por elemento, así que
	// "reporte-ventas" no alcanza a "reporte-ventas-canceladas".
	["reporte-ventas-canceladas"],
	["reporte-ventas-pagos-cancelados"],
	["reporte-administrativo"],
	["ventas"],
	// Trabajo que nace de la venta
	["captura"],
	["entrega-resultados"],
	["turnos"],
	// Tableros que suman importes del día
	["dashboard-stats"],
	["dashboard-estadisticas"],
];

// Invalidar marca la consulta como vieja: la que esté montada se vuelve a pedir
// al instante y la que no, la próxima vez que se abra su pantalla. No se espera
// a que terminen: quien acaba de cobrar no tiene por qué mirar una barra de
// carga por algo que ocurre en otra pantalla.
export const invalidarConsultasDeVentas = (queryClient) => {
	if (!queryClient?.invalidateQueries) return [];

	for (const queryKey of CONSULTAS_QUE_LEEN_VENTAS) {
		queryClient.invalidateQueries({ queryKey });
	}

	return CONSULTAS_QUE_LEEN_VENTAS;
};

export const consultasQueLeenVentas = () =>
	CONSULTAS_QUE_LEEN_VENTAS.map(([clave]) => clave);
