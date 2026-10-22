// Una cita por teléfono, escrita en un solo renglón.
//
// Agendar por teléfono es teclear con el paciente esperando en la línea. El
// formulario completo pide seis campos y hay que ir saltando entre ellos; en un
// renglón se escribe de corrido, en este orden:
//
//   estudio, nombre teléfono cliente
//
//   biometria hematica, Laura Mendez Rios 4771234567 IMSS
//   ultrasonido de abdomen, Juan Perez
//   rayos x de torax / Maria Lopez 3221220777
//
// El estudio va primero porque es lo que la agenda necesita para acomodar la
// cita; el teléfono y el cliente son opcionales. Empresa y tipo de estudio no
// se adivinan: una suposición equivocada se arrastra hasta el cobro, y quien
// los necesite tiene el formulario completo al lado.
//
// Las reglas, para que quepan en la ayuda debajo del campo:
//
//   1. Diez dígitos seguidos, en cualquier parte, son el teléfono.
//   2. Lo que va antes del primer separador -coma, guion o diagonal- es el
//      estudio; lo que va después, el nombre.
//   3. Lo que va después del teléfono es el cliente. Sin teléfono, el cliente
//      se separa del nombre con otra coma, o se reconoce si su nombre está en
//      el catálogo de clientes al final del renglón.
//
// Varios estudios se juntan con "+": la coma ya es el corte del estudio.
//
// Sin separador, todo el renglón es el nombre. Es la lectura prudente: es peor
// guardar un nombre como estudio que dejar el estudio vacío, que se ve de
// inmediato en el resumen.

import { buscarPorNombre, normalizarNombre } from "./catalogo-por-nombre";

const SEPARADORES = /[,/]|\s-\s|\s—\s/;

// Diez dígitos que pueden venir con espacios, guiones o paréntesis entre ellos,
// como los dicta la gente por teléfono. Se exige que no estén pegados a más
// dígitos para no partir un número más largo por la mitad; ese "no viene otro
// dígito antes" se resuelve con un grupo y no con un lookbehind, que Safari
// anterior a la 16.4 -el de varios iPad de recepción- ni siquiera puede leer:
// el archivo entero tronaba al cargarse y el campo del renglón quedaba muerto.
const TELEFONO = /(^|\D)(\(?(?:\d[\s().-]*){9}\d)(?!\d)/;

// Marca dónde estaba el teléfono una vez arrancado del texto: lo que sigue a
// la marca es el cliente.
const MARCA_TELEFONO = "\u0000";

const limpiar = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();

// Quita separadores y signos sueltos que quedan cuando se arranca el teléfono
// de en medio del texto: "Maria Lopez  -  " no es un nombre.
const limpiarBordes = (valor) =>
	limpiar(String(valor ?? "").replaceAll(MARCA_TELEFONO, " ")).replace(/^[\s,/;:.-]+|[\s,/;:.-]+$/g, "");

const partirEnSeparador = (texto) => {
	const encontrado = SEPARADORES.exec(texto);
	if (!encontrado) return null;
	return [texto.slice(0, encontrado.index), texto.slice(encontrado.index + encontrado[0].length)];
};

// Sin teléfono ni segunda coma, el cliente sólo se reconoce si las últimas
// palabras son el nombre de un cliente del catálogo. Gana el nombre más largo
// ("IMSS BIENESTAR" antes que "IMSS"), y nunca se lleva el renglón completo:
// alguien tiene que quedar como paciente.
const separarClienteDelCatalogo = (texto, clientes) => {
	const palabras = limpiar(texto).split(" ").filter(Boolean);
	let mejor = 0;
	for (const cliente of clientes) {
		const nombreCliente = normalizarNombre(cliente?.nombre);
		if (!nombreCliente) continue;
		const largo = nombreCliente.split(" ").length;
		if (largo <= mejor || largo >= palabras.length) continue;
		if (normalizarNombre(palabras.slice(-largo).join(" ")) === nombreCliente) mejor = largo;
	}
	if (!mejor) return { nombre: texto, cliente: "" };
	return {
		nombre: palabras.slice(0, -mejor).join(" "),
		cliente: palabras.slice(-mejor).join(" "),
	};
};

const separarNombreYCliente = (texto, clientes) => {
	const marca = texto.indexOf(MARCA_TELEFONO);
	if (marca !== -1) {
		const despues = limpiarBordes(texto.slice(marca + 1));
		if (despues) return { nombre: limpiarBordes(texto.slice(0, marca)), cliente: despues };
	}
	const sinMarca = limpiarBordes(texto);
	const partes = partirEnSeparador(sinMarca);
	if (partes) return { nombre: limpiarBordes(partes[0]), cliente: limpiarBordes(partes[1]) };
	const delCatalogo = separarClienteDelCatalogo(sinMarca, clientes);
	return { nombre: limpiarBordes(delCatalogo.nombre), cliente: limpiarBordes(delCatalogo.cliente) };
};

export const interpretarRenglonCita = (texto = "", { clientes = [] } = {}) => {
	const original = limpiar(texto);
	if (!original) return { estudios: "", nombre: "", telefono: "", cliente: "" };

	const encontrado = TELEFONO.exec(original);
	// El primer grupo es lo que va justo antes del número y no forma parte de
	// él: el teléfono es el segundo, y ahí empieza el recorte.
	const inicioTelefono = encontrado ? encontrado.index + encontrado[1].length : -1;
	const textoTelefono = encontrado ? encontrado[2] : "";
	const telefono = textoTelefono.replace(/\D/g, "");
	// El teléfono se saca del renglón antes de partirlo, y en su lugar queda la
	// marca: así no se queda pegado al nombre y se sabe dónde empieza el cliente.
	const conMarca = encontrado
		? `${original.slice(0, inicioTelefono)} ${MARCA_TELEFONO} ${original.slice(inicioTelefono + textoTelefono.length)}`
		: original;

	const partes = partirEnSeparador(conMarca);
	if (!partes) {
		return { estudios: "", nombre: limpiarBordes(conMarca), telefono, cliente: "" };
	}

	const [estudio, resto] = partes;
	const { nombre, cliente } = separarNombreYCliente(resto, clientes);
	return { estudios: limpiarBordes(estudio), nombre, telefono, cliente };
};

// Lo que se le muestra a quien escribe, para que vea qué entendió el renglón
// antes de guardar. Un resumen vacío es la señal de que no se entendió nada.
// El cliente se guarda por su id, así que uno que no está en el catálogo se
// avisa: se perdería sin que nadie lo notara.
export const resumirRenglonCita = (texto = "", { clientes = [] } = {}) => {
	const { estudios, nombre, telefono, cliente } = interpretarRenglonCita(texto, { clientes });
	const clienteCatalogo = cliente ? buscarPorNombre(clientes, cliente) : null;
	return [
		estudios && `Estudio: ${estudios}`,
		nombre && `Paciente: ${nombre}`,
		telefono && `Tel: ${telefono}`,
		cliente &&
			(clienteCatalogo
				? `Cliente: ${clienteCatalogo.nombre}`
				: `Cliente: ${cliente} (no está en el catálogo, no se guardará)`),
	]
		.filter(Boolean)
		.join("  ·  ");
};
