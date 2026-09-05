// Una cita por teléfono, escrita en un solo renglón.
//
// Agendar por teléfono es teclear con el paciente esperando en la línea. El
// formulario completo pide seis campos y hay que ir saltando entre ellos; en un
// renglón se escribe de corrido lo que la persona va diciendo:
//
//   Laura Mendez Rios 4771234567, biometria hematica
//   Juan Perez - ultrasonido de abdomen
//   3221220777 Maria Lopez / rayos x de torax
//
// De ahí salen tres cosas: el nombre, el teléfono y lo que pidió. Nada más.
// Empresa, convenio y tipo de estudio no se adivinan: en una cita por teléfono
// rara vez se saben, y una suposición equivocada se arrastra hasta el cobro.
// Quien las necesite tiene el formulario completo al lado.
//
// Las reglas son dos, a propósito, para que se puedan explicar en una línea de
// ayuda debajo del campo:
//
//   1. Diez dígitos seguidos, en cualquier parte, son el teléfono.
//   2. Lo que va antes del primer separador -coma, guion o diagonal- es el
//      nombre; lo que va después es el estudio.
//
// Sin separador, todo el renglón es el nombre. Es la lectura prudente: es peor
// partir un nombre largo a la mitad y guardar la segunda parte como estudio que
// dejar el estudio vacío, que se ve de inmediato.

const SEPARADORES = /[,/]|\s-\s|\s—\s/;

// Diez dígitos que pueden venir con espacios, guiones o paréntesis entre ellos,
// como los dicta la gente por teléfono. Se exige que no estén pegados a más
// dígitos para no partir un número más largo por la mitad; ese "no viene otro
// dígito antes" se resuelve con un grupo y no con un lookbehind, que Safari
// anterior a la 16.4 -el de varios iPad de recepción- ni siquiera puede leer:
// el archivo entero tronaba al cargarse y el campo del renglón quedaba muerto.
const TELEFONO = /(^|\D)(\(?(?:\d[\s().-]*){9}\d)(?!\d)/;

const limpiar = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();

// Quita separadores y signos sueltos que quedan cuando se arranca el teléfono
// de en medio del texto: "Maria Lopez  -  " no es un nombre.
const limpiarBordes = (valor) => limpiar(valor).replace(/^[\s,/;:.-]+|[\s,/;:.-]+$/g, "");

export const interpretarRenglonCita = (texto = "") => {
	const original = limpiar(texto);
	if (!original) return { nombre: "", telefono: "", estudios: "" };

	const encontrado = TELEFONO.exec(original);
	// El primer grupo es lo que va justo antes del número y no forma parte de
	// él: el teléfono es el segundo, y ahí empieza el recorte.
	const inicioTelefono = encontrado ? encontrado.index + encontrado[1].length : -1;
	const textoTelefono = encontrado ? encontrado[2] : "";
	const telefono = textoTelefono.replace(/\D/g, "");
	// El teléfono se saca del renglón antes de partirlo: si no, un número dicho
	// entre el nombre y el estudio se quedaría pegado a uno de los dos.
	const sinTelefono = encontrado
		? limpiar(
				original.slice(0, inicioTelefono) +
					" " +
					original.slice(inicioTelefono + textoTelefono.length),
			)
		: original;

	const corte = sinTelefono.search(SEPARADORES);
	if (corte === -1) {
		return { nombre: limpiarBordes(sinTelefono), telefono, estudios: "" };
	}

	const separador = SEPARADORES.exec(sinTelefono);
	return {
		nombre: limpiarBordes(sinTelefono.slice(0, corte)),
		telefono,
		estudios: limpiarBordes(sinTelefono.slice(corte + separador[0].length)),
	};
};

// Lo que se le muestra a quien escribe, para que vea qué entendió el renglón
// antes de guardar. Un resumen vacío es la señal de que no se entendió nada.
export const resumirRenglonCita = (texto = "") => {
	const { nombre, telefono, estudios } = interpretarRenglonCita(texto);
	return [
		nombre && `Paciente: ${nombre}`,
		telefono && `Tel: ${telefono}`,
		estudios && `Estudio: ${estudios}`,
	]
		.filter(Boolean)
		.join("  ·  ");
};
