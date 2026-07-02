export const redondearMontoCaja = (monto) => {
	const numero = Number.parseFloat(monto);
	if (!Number.isFinite(numero)) return 0;
	return Math.round(numero * 2) / 2;
};

export const formatearMontoCaja = (monto) =>
	redondearMontoCaja(monto).toFixed(2);

export const limitarMontoCajaADosDecimales = (monto) => {
	const numero = Number.parseFloat(monto);
	if (!Number.isFinite(numero)) return 0;
	return Math.round(numero * 100) / 100;
};

export const esFormaEfectivoCaja = (formaPago = "") =>
	String(formaPago || "").toLowerCase().includes("efectivo");

export const normalizarMontoCajaPorForma = (monto, formaPago = "") =>
	esFormaEfectivoCaja(formaPago)
		? redondearMontoCaja(monto)
		: limitarMontoCajaADosDecimales(monto);

export const formatearMontoCajaPorForma = (monto, formaPago = "") =>
	normalizarMontoCajaPorForma(monto, formaPago).toFixed(2);

export const filtrarVentasCortePorRecepcionista = (
	ventas = [],
	empleados = [],
	usuarioSeleccionado = "",
) => {
	if (!usuarioSeleccionado) return ventas;

	const empleadoSeleccionado = empleados.find(
		(empleado) => String(empleado.auth_uuid || "") === String(usuarioSeleccionado),
	);
	if (!empleadoSeleccionado?.id_empleado) return [];

	return ventas.filter(
		(venta) =>
			String(venta.id_empleado || "") ===
			String(empleadoSeleccionado.id_empleado || ""),
	);
};
