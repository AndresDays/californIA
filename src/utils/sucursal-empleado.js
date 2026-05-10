const limpiarSucursal = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.replace(/\s+/g, " ")
		.toUpperCase();

export const resolverSucursalEmpleado = (empleado = {}, sucursales = []) => {
	const sucursalTexto = empleado.sucursal || empleado.sucursales?.nombre || "";
	const sucursalNormalizada = limpiarSucursal(sucursalTexto);
	const sucursalCatalogo = sucursales.find(
		(sucursal) => limpiarSucursal(sucursal.nombre) === sucursalNormalizada,
	);
	const idSucursal =
		empleado.id_sucursal ||
		empleado.sucursales?.id_sucursal ||
		sucursalCatalogo?.id_sucursal ||
		null;

	return {
		id_sucursal: idSucursal,
		sucursal: sucursalCatalogo?.nombre || sucursalTexto || "",
	};
};

export const agregarSucursalEmpleadoPayload = (payload, sucursalEmpleado) => ({
	...payload,
	id_sucursal: sucursalEmpleado?.id_sucursal || null,
	sucursal: sucursalEmpleado?.sucursal || "",
});
