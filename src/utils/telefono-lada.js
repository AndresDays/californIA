// El teléfono se guarda como "<lada> <10 dígitos>" y la lada depende del país.
// Aquí vive la tabla -todos los países, no sólo los de siempre- para que la
// captura, la edición y la orden usen exactamente los mismos valores y no se
// pierda la lada al pasar de una pantalla a otra.
export const LADA_MEXICO = "+52";
export const LADA_NORTEAMERICA = "+1";

// Los tres de siempre van arriba porque son casi toda la captura; el resto va
// alfabético. "Otro" queda al final para el número que no lleva lada.
export const PAISES_LADA = [
	{ pais: "México", lada: LADA_MEXICO },
	{ pais: "Estados Unidos", lada: LADA_NORTEAMERICA },
	{ pais: "Canadá", lada: LADA_NORTEAMERICA },
	{ pais: "Afganistán", lada: "+93" },
	{ pais: "Albania", lada: "+355" },
	{ pais: "Alemania", lada: "+49" },
	{ pais: "Andorra", lada: "+376" },
	{ pais: "Angola", lada: "+244" },
	{ pais: "Anguila", lada: "+1" },
	{ pais: "Antigua y Barbuda", lada: "+1" },
	{ pais: "Arabia Saudita", lada: "+966" },
	{ pais: "Argelia", lada: "+213" },
	{ pais: "Argentina", lada: "+54" },
	{ pais: "Armenia", lada: "+374" },
	{ pais: "Aruba", lada: "+297" },
	{ pais: "Australia", lada: "+61" },
	{ pais: "Austria", lada: "+43" },
	{ pais: "Azerbaiyán", lada: "+994" },
	{ pais: "Bahamas", lada: "+1" },
	{ pais: "Bangladés", lada: "+880" },
	{ pais: "Barbados", lada: "+1" },
	{ pais: "Baréin", lada: "+973" },
	{ pais: "Bélgica", lada: "+32" },
	{ pais: "Belice", lada: "+501" },
	{ pais: "Benín", lada: "+229" },
	{ pais: "Bermudas", lada: "+1" },
	{ pais: "Bielorrusia", lada: "+375" },
	{ pais: "Bolivia", lada: "+591" },
	{ pais: "Bosnia y Herzegovina", lada: "+387" },
	{ pais: "Botsuana", lada: "+267" },
	{ pais: "Brasil", lada: "+55" },
	{ pais: "Brunéi", lada: "+673" },
	{ pais: "Bulgaria", lada: "+359" },
	{ pais: "Burkina Faso", lada: "+226" },
	{ pais: "Burundi", lada: "+257" },
	{ pais: "Bután", lada: "+975" },
	{ pais: "Cabo Verde", lada: "+238" },
	{ pais: "Camboya", lada: "+855" },
	{ pais: "Camerún", lada: "+237" },
	{ pais: "Catar", lada: "+974" },
	{ pais: "Chad", lada: "+235" },
	{ pais: "Chile", lada: "+56" },
	{ pais: "China", lada: "+86" },
	{ pais: "Chipre", lada: "+357" },
	{ pais: "Ciudad del Vaticano", lada: "+379" },
	{ pais: "Colombia", lada: "+57" },
	{ pais: "Comoras", lada: "+269" },
	{ pais: "Corea del Norte", lada: "+850" },
	{ pais: "Corea del Sur", lada: "+82" },
	{ pais: "Costa de Marfil", lada: "+225" },
	{ pais: "Costa Rica", lada: "+506" },
	{ pais: "Croacia", lada: "+385" },
	{ pais: "Cuba", lada: "+53" },
	{ pais: "Curazao", lada: "+599" },
	{ pais: "Dinamarca", lada: "+45" },
	{ pais: "Dominica", lada: "+1" },
	{ pais: "Ecuador", lada: "+593" },
	{ pais: "Egipto", lada: "+20" },
	{ pais: "El Salvador", lada: "+503" },
	{ pais: "Emiratos Árabes Unidos", lada: "+971" },
	{ pais: "Eritrea", lada: "+291" },
	{ pais: "Eslovaquia", lada: "+421" },
	{ pais: "Eslovenia", lada: "+386" },
	{ pais: "España", lada: "+34" },
	{ pais: "Estonia", lada: "+372" },
	{ pais: "Esuatini", lada: "+268" },
	{ pais: "Etiopía", lada: "+251" },
	{ pais: "Filipinas", lada: "+63" },
	{ pais: "Finlandia", lada: "+358" },
	{ pais: "Fiyi", lada: "+679" },
	{ pais: "Francia", lada: "+33" },
	{ pais: "Gabón", lada: "+241" },
	{ pais: "Gambia", lada: "+220" },
	{ pais: "Georgia", lada: "+995" },
	{ pais: "Ghana", lada: "+233" },
	{ pais: "Gibraltar", lada: "+350" },
	{ pais: "Granada", lada: "+1" },
	{ pais: "Grecia", lada: "+30" },
	{ pais: "Groenlandia", lada: "+299" },
	{ pais: "Guadalupe", lada: "+590" },
	{ pais: "Guam", lada: "+1" },
	{ pais: "Guatemala", lada: "+502" },
	{ pais: "Guayana Francesa", lada: "+594" },
	{ pais: "Guinea", lada: "+224" },
	{ pais: "Guinea Ecuatorial", lada: "+240" },
	{ pais: "Guinea-Bisáu", lada: "+245" },
	{ pais: "Guyana", lada: "+592" },
	{ pais: "Haití", lada: "+509" },
	{ pais: "Honduras", lada: "+504" },
	{ pais: "Hong Kong", lada: "+852" },
	{ pais: "Hungría", lada: "+36" },
	{ pais: "India", lada: "+91" },
	{ pais: "Indonesia", lada: "+62" },
	{ pais: "Irak", lada: "+964" },
	{ pais: "Irán", lada: "+98" },
	{ pais: "Irlanda", lada: "+353" },
	{ pais: "Isla de Man", lada: "+44" },
	{ pais: "Islandia", lada: "+354" },
	{ pais: "Islas Caimán", lada: "+1" },
	{ pais: "Islas Feroe", lada: "+298" },
	{ pais: "Islas Marshall", lada: "+692" },
	{ pais: "Islas Salomón", lada: "+677" },
	{ pais: "Islas Vírgenes Británicas", lada: "+1" },
	{ pais: "Islas Vírgenes de EE. UU.", lada: "+1" },
	{ pais: "Israel", lada: "+972" },
	{ pais: "Italia", lada: "+39" },
	{ pais: "Jamaica", lada: "+1" },
	{ pais: "Japón", lada: "+81" },
	{ pais: "Jordania", lada: "+962" },
	{ pais: "Kazajistán", lada: "+7" },
	{ pais: "Kenia", lada: "+254" },
	{ pais: "Kirguistán", lada: "+996" },
	{ pais: "Kiribati", lada: "+686" },
	{ pais: "Kosovo", lada: "+383" },
	{ pais: "Kuwait", lada: "+965" },
	{ pais: "Laos", lada: "+856" },
	{ pais: "Lesoto", lada: "+266" },
	{ pais: "Letonia", lada: "+371" },
	{ pais: "Líbano", lada: "+961" },
	{ pais: "Liberia", lada: "+231" },
	{ pais: "Libia", lada: "+218" },
	{ pais: "Liechtenstein", lada: "+423" },
	{ pais: "Lituania", lada: "+370" },
	{ pais: "Luxemburgo", lada: "+352" },
	{ pais: "Macao", lada: "+853" },
	{ pais: "Macedonia del Norte", lada: "+389" },
	{ pais: "Madagascar", lada: "+261" },
	{ pais: "Malasia", lada: "+60" },
	{ pais: "Malaui", lada: "+265" },
	{ pais: "Maldivas", lada: "+960" },
	{ pais: "Malí", lada: "+223" },
	{ pais: "Malta", lada: "+356" },
	{ pais: "Marruecos", lada: "+212" },
	{ pais: "Martinica", lada: "+596" },
	{ pais: "Mauricio", lada: "+230" },
	{ pais: "Mauritania", lada: "+222" },
	{ pais: "Micronesia", lada: "+691" },
	{ pais: "Moldavia", lada: "+373" },
	{ pais: "Mónaco", lada: "+377" },
	{ pais: "Mongolia", lada: "+976" },
	{ pais: "Montenegro", lada: "+382" },
	{ pais: "Montserrat", lada: "+1" },
	{ pais: "Mozambique", lada: "+258" },
	{ pais: "Myanmar", lada: "+95" },
	{ pais: "Namibia", lada: "+264" },
	{ pais: "Nauru", lada: "+674" },
	{ pais: "Nepal", lada: "+977" },
	{ pais: "Nicaragua", lada: "+505" },
	{ pais: "Níger", lada: "+227" },
	{ pais: "Nigeria", lada: "+234" },
	{ pais: "Noruega", lada: "+47" },
	{ pais: "Nueva Caledonia", lada: "+687" },
	{ pais: "Nueva Zelanda", lada: "+64" },
	{ pais: "Omán", lada: "+968" },
	{ pais: "Países Bajos", lada: "+31" },
	{ pais: "Pakistán", lada: "+92" },
	{ pais: "Palaos", lada: "+680" },
	{ pais: "Palestina", lada: "+970" },
	{ pais: "Panamá", lada: "+507" },
	{ pais: "Papúa Nueva Guinea", lada: "+675" },
	{ pais: "Paraguay", lada: "+595" },
	{ pais: "Perú", lada: "+51" },
	{ pais: "Polinesia Francesa", lada: "+689" },
	{ pais: "Polonia", lada: "+48" },
	{ pais: "Portugal", lada: "+351" },
	{ pais: "Puerto Rico", lada: "+1" },
	{ pais: "Reino Unido", lada: "+44" },
	{ pais: "República Centroafricana", lada: "+236" },
	{ pais: "República Checa", lada: "+420" },
	{ pais: "República del Congo", lada: "+242" },
	{ pais: "República Democrática del Congo", lada: "+243" },
	{ pais: "República Dominicana", lada: "+1" },
	{ pais: "Reunión", lada: "+262" },
	{ pais: "Ruanda", lada: "+250" },
	{ pais: "Rumania", lada: "+40" },
	{ pais: "Rusia", lada: "+7" },
	{ pais: "Samoa", lada: "+685" },
	{ pais: "San Cristóbal y Nieves", lada: "+1" },
	{ pais: "San Marino", lada: "+378" },
	{ pais: "San Martín", lada: "+590" },
	{ pais: "San Vicente y las Granadinas", lada: "+1" },
	{ pais: "Santa Lucía", lada: "+1" },
	{ pais: "Santo Tomé y Príncipe", lada: "+239" },
	{ pais: "Senegal", lada: "+221" },
	{ pais: "Serbia", lada: "+381" },
	{ pais: "Seychelles", lada: "+248" },
	{ pais: "Sierra Leona", lada: "+232" },
	{ pais: "Singapur", lada: "+65" },
	{ pais: "Siria", lada: "+963" },
	{ pais: "Somalia", lada: "+252" },
	{ pais: "Sri Lanka", lada: "+94" },
	{ pais: "Sudáfrica", lada: "+27" },
	{ pais: "Sudán", lada: "+249" },
	{ pais: "Sudán del Sur", lada: "+211" },
	{ pais: "Suecia", lada: "+46" },
	{ pais: "Suiza", lada: "+41" },
	{ pais: "Surinam", lada: "+597" },
	{ pais: "Tailandia", lada: "+66" },
	{ pais: "Taiwán", lada: "+886" },
	{ pais: "Tanzania", lada: "+255" },
	{ pais: "Tayikistán", lada: "+992" },
	{ pais: "Timor Oriental", lada: "+670" },
	{ pais: "Togo", lada: "+228" },
	{ pais: "Tonga", lada: "+676" },
	{ pais: "Trinidad y Tobago", lada: "+1" },
	{ pais: "Túnez", lada: "+216" },
	{ pais: "Turkmenistán", lada: "+993" },
	{ pais: "Turquía", lada: "+90" },
	{ pais: "Tuvalu", lada: "+688" },
	{ pais: "Ucrania", lada: "+380" },
	{ pais: "Uganda", lada: "+256" },
	{ pais: "Uruguay", lada: "+598" },
	{ pais: "Uzbekistán", lada: "+998" },
	{ pais: "Vanuatu", lada: "+678" },
	{ pais: "Venezuela", lada: "+58" },
	{ pais: "Vietnam", lada: "+84" },
	{ pais: "Yemen", lada: "+967" },
	{ pais: "Yibuti", lada: "+253" },
	{ pais: "Zambia", lada: "+260" },
	{ pais: "Zimbabue", lada: "+263" },
	{ pais: "Otro", lada: "" },
];

export const PAIS_POR_DEFECTO = "México";

export const ladaDePais = (pais) =>
	PAISES_LADA.find((entrada) => entrada.pais === pais)?.lada ?? "";

// Varios países comparten lada -+1 es Estados Unidos, Canadá y el Caribe; +7
// Rusia y Kazajistán-, así que una lada sola no dice de cuál es. Se resuelve al
// primero de la tabla, que por eso trae México, Estados Unidos y Canadá arriba:
// es el que más se captura.
const PAIS_DE_LADA = new Map();
for (const { pais, lada } of PAISES_LADA) {
	if (lada && !PAIS_DE_LADA.has(lada)) PAIS_DE_LADA.set(lada, pais);
}

// Un teléfono ya guardado sólo trae la lada, no el país.
export const paisDeLada = (lada) => PAIS_DE_LADA.get(lada) ?? "Otro";

// Separa lo capturado de la lada con la que se guardó. Sirve tanto para
// "+52 3221234567" como para "+1 2135551234" o un número pelón de 10 dígitos.
export const separarLada = (valor = "") => {
	const texto = String(valor ?? "").trim();
	const digitos = texto.replace(/\D/g, "");
	const numero = digitos.slice(-10);
	const prefijo = digitos.slice(0, digitos.length - 10);

	if (!texto.startsWith("+") || !prefijo) return { lada: "", numero };

	const lada = `+${prefijo}`;
	return { lada: PAIS_DE_LADA.has(lada) ? lada : "", numero };
};

// El país manda sobre la lada guardada: es lo que el usuario acaba de elegir en
// el select. Sin número no se guarda una lada sola, que no es un teléfono.
export const unirLada = (pais, numero = "") => {
	const digitos = String(numero ?? "").replace(/\D/g, "");
	if (!digitos) return "";
	const lada = ladaDePais(pais);
	return lada ? `${lada} ${digitos}` : digitos;
};

// Para las pantallas que ya reciben el teléfono completo y sólo lo muestran:
// deja "+1 2135551234" tal cual en vez de recortarlo a los diez dígitos.
export const normalizarTelefonoConLada = (valor = "") => {
	const { lada, numero } = separarLada(valor);
	if (!numero) return "";
	return lada ? `${lada} ${numero}` : numero;
};
