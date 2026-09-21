// Los días que tiene un mes, para que las listas de día/mes/año no ofrezcan un
// 31 de febrero.
export const diasDelMes = (anio, mes) => {
	const numeroMes = Number(mes);
	if (!numeroMes) return 31;
	const numeroAnio = Number(anio) || 2000;
	return new Date(Date.UTC(numeroAnio, numeroMes, 0)).getUTCDate();
};
