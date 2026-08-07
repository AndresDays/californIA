import datosQuimicoGeneral from "../assets/datos-quimico-general-transparente.png";
import datosQuimicoMascota from "../assets/datos-quimico-mascota-transparente.png";

export const esSucursalMascota = (venta = {}) =>
	Number(venta.id_sucursal) === 3 || String(venta.sucursal || "").trim().toUpperCase() === "MASCOTA";

export const obtenerDatosQuimico = (venta = {}) =>
	esSucursalMascota(venta) ? datosQuimicoMascota : datosQuimicoGeneral;
