const path = require("path");

function resolverRutaLector({ empaquetada, recursos, directorio, unir = path.join }) {
	return empaquetada
		? unir(recursos, "app.asar.unpacked", "read-swelab.ps1")
		: unir(directorio, "read-swelab.ps1");
}

module.exports = { resolverRutaLector };
