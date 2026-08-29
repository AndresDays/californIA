import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
import { resolverEmpresaOperativaCatalogo } from './cita-nuevo-paciente';
import { crearUrlPortalResultados } from './portal-resultados';
import { describirPagoTarjeta, esPagoConTarjeta } from './pago-tarjeta';

const RFC_POR_EMPRESA = {
	CDC: 'CDC031217UMA',
	CDI: 'CDI200902A84',
};

export const resolverRfcTicketEmpresa = (empresa) => {
	const empresaOperativa = resolverEmpresaOperativaCatalogo(empresa);
	const rfc = RFC_POR_EMPRESA[empresaOperativa];
	if (!rfc) {
		throw new Error('No existe RFC configurado para la empresa seleccionada');
	}
	return rfc;
};

export const resolverEmpresaTicketReimpresion = (empresa) => empresa || 'CDC';

// Cada empresa se identifica con su propio correo, y CDI no lleva la razón
// social de California en el encabezado: ahí el único nombre es el de quien
// registra la orden.
export const resolverEncabezadoEmpresaTicket = (empresa) => {
	const operativa = resolverEmpresaOperativaCatalogo(empresa);
	if (operativa === 'CDI') {
		return { razonSocial: '', correo: 'cdi.rx2020@outlook.com' };
	}
	return { razonSocial: 'Paulina Diaz Cortes', correo: 'labcalifornia01@gmail.com' };
};

const generarCodigo = (len = 6) => Math.random().toString(36).substring(2, 2 + len);

const ESPERA_MAXIMA_LOGO_MS = 4000;

// Nada de lo que tarde en cargar puede dejar el ticket a medias: un chunk que no
// baja o una imagen que nunca dispara onload ni onerror colgaban la promesa, y
// un cuelgue no lo atrapa ningún catch: la venta se quedaba sin comprobante,
// sin aviso y sin salir de la pantalla.
const conLimiteDeEspera = (promesa, ms = ESPERA_MAXIMA_LOGO_MS) =>
	Promise.race([
		promesa,
		new Promise((_, reject) => setTimeout(() => reject(new Error('Tardó demasiado en cargar')), ms)),
	]);

const getImageBase64 = (url) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		const rendirse = setTimeout(() => reject(new Error('La imagen tardó demasiado')), ESPERA_MAXIMA_LOGO_MS);
		const terminar = (accion) => (valor) => {
			clearTimeout(rendirse);
			accion(valor);
		};
		img.crossOrigin = 'Anonymous';
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			canvas.getContext('2d').drawImage(img, 0, 0);
			terminar(resolve)(canvas.toDataURL('image/jpeg'));
		};
		img.onerror = terminar(reject);
		img.src = url;
	});

const generarBarcode = (folio) => {
	const canvas = document.createElement('canvas');
	JsBarcode(canvas, folio, {
		format: 'CODE128',
		width: 5,
		height: 90,
		displayValue: true,
		fontSize: 22,
		margin: 6,
		background: '#ffffff',
		lineColor: '#000000',
	});
	return canvas.toDataURL('image/png');
};

const generarQR = async (folio) => {
	return await QRCode.toDataURL(folio, {
		width: 80,
		margin: 1,
		color: { dark: '#000000', light: '#ffffff' },
	});
};

// El ticket es de 80 mm y hay nombres que no caben en un renglón: los de
// paciente y doctor se salían del papel por los dos lados, al estar centrados.
// Primero se aprieta un poco la letra, que resuelve la mayoría de los casos sin
// gastar renglones, y si aun así no cabe se parte en varias líneas.
const escribirCentradoAjustado = (
	pdf,
	texto,
	y,
	{ ancho, centro, alto, tamanoMinimo = 7 } = {},
) => {
	const contenido = String(texto || '').trim();
	if (!contenido) return y;

	const tamanoOriginal = pdf.getFontSize();
	let tamano = tamanoOriginal;
	while (tamano > tamanoMinimo && pdf.getTextWidth(contenido) > ancho) {
		tamano -= 0.5;
		pdf.setFontSize(tamano);
	}

	// El alto del renglón sigue al tamaño de letra para que las líneas de un
	// nombre partido no se encimen.
	const altoLinea = alto * (tamano / tamanoOriginal);
	let siguiente = y;
	pdf.splitTextToSize(contenido, ancho).forEach((linea) => {
		pdf.text(linea, centro, siguiente, { align: 'center' });
		siguiente += altoLinea;
	});

	pdf.setFontSize(tamanoOriginal);
	return siguiente;
};

// Cada ticket se dibuja en la página actual del PDF: una orden que factura por
// las dos empresas sale como un solo PDF de dos páginas, con un ticket completo
// por empresa.
const dibujarTicketEnPdf = async (pdf, datosTicket) => {
	const {
		folio,
		fecha,
		paciente,
		edad,
		doctor,
		cliente,
		empresa,
		telefono,
		email,
		estudios,
		subtotal,
		descuento,
		total,
		abono1,
		abono2,
		adeudo,
		pagoRecibido,
		cambio,
		formaPago,
		tarjetaUltimos4,
		codigoAprobacion,
		vendedor,
		ventana,
	} = datosTicket;
	// Una empresa sin RFC configurado no puede dejar al paciente sin ticket: se
	// imprime igual, sin esa línea. El ticket no es comprobante fiscal.
	let rfcEmpresa = '';
	try {
		rfcEmpresa = resolverRfcTicketEmpresa(empresa);
	} catch (error) {
		console.warn(`Ticket sin RFC (${empresa || 'sin empresa'}):`, error.message);
	}
	const urlPortalResultados = crearUrlPortalResultados({ folio, telefono });

	const W = 80;
	const mg = 5;
	let y = 6;

	try {
		const logoMod = await conLimiteDeEspera(import('../assets/logoCDC.jpg'));
		const logoB64 = await getImageBase64(logoMod.default);
		pdf.addImage(logoB64, 'JPEG', mg, y, W - mg * 2, 22);
		y += 24;
	} catch {
		y += 4;
	}

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	const lineasEncabezado = [
		'Paulina Diaz Cortes',
		'Dirección: Av. Francisco Villa 880, C.P. 48328, Colonia',
		'Gaviotas, Puerto Vallarta, Jalisco, México.',
		...(rfcEmpresa ? [`RFC: ${rfcEmpresa}`] : []),
		'Correo: labcalifornia01@gmail.com',
	];
	lineasEncabezado.forEach((l) => {
		pdf.text(l, W / 2, y, { align: 'center' });
		y += 3.5;
	});
	y += 1;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	pdf.text('Teléfono: 3222256008', W / 2, y, { align: 'center' });
	y += 7;
	pdf.text('Descarga de Resultados:', W / 2, y, { align: 'center' });
	y += 4;
	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(8);
	const urlLines = pdf.splitTextToSize(
		urlPortalResultados.replace(/^https?:\/\//, ''),
		W - mg * 2,
	);
	urlLines.forEach((l) => { pdf.text(l, W / 2, y, { align: 'center' }); y += 4; });
	y += 4;

	const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
	const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	pdf.text(`Fecha: ${fechaStr} ${horaStr}`, W / 2, y, { align: 'center' });
	y += 4.5;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(10);
	// El nombre que va aquí es el del paciente: rotularlo como "Cliente" lo
	// confundía con el convenio, que ahora tiene su propio renglón bajo el médico.
	y = escribirCentradoAjustado(pdf, `Paciente: ${(paciente || '').toUpperCase()}`, y, {
		ancho: W - mg * 2,
		centro: W / 2,
		alto: 5,
	});

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	if (edad) { pdf.text(`Edad: ${edad}`, W / 2, y, { align: 'center' }); y += 4; }
	if (doctor) {
		y = escribirCentradoAjustado(pdf, `Doctor: ${doctor.toUpperCase()}`, y, {
			ancho: W - mg * 2,
			centro: W / 2,
			alto: 4,
		});
	}
	// El convenio se imprime debajo del médico —y también cuando la orden no
	// trae médico— con el mismo ajuste de ancho: los nombres de convenio son
	// largos y, centrados, se salían del papel de 80 mm.
	if (cliente) {
		y = escribirCentradoAjustado(pdf, `Cliente: ${cliente}`, y, {
			ancho: W - mg * 2,
			centro: W / 2,
			alto: 4,
		});
	}

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(11);
	pdf.text(`Folio: ${folio}`, W / 2, y, { align: 'center' }); y += 5.5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(10);
	pdf.text(`Email: ${email || ''}`, W / 2, y, { align: 'center' }); y += 5;
	pdf.text(`Telefono: ${telefono || ''}`, W / 2, y, { align: 'center' }); y += 5.5;

	try {
		const barcodeImg = generarBarcode(folio);
		pdf.addImage(barcodeImg, 'PNG', mg + 2, y, W - mg * 2 - 4, 18);
		y += 20;
	} catch { y += 2; }

	pdf.setLineWidth(0.3);
	pdf.line(mg, y, W - mg, y);
	y += 5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7.5);

	// El renglón del estudio ya no lleva fecha de entrega: la que salía era una
	// estimación por días de proceso y confundía al paciente.
	estudios.forEach((est) => {
		const desc = (est.descripcion || '').toUpperCase();
		const precio = `$ ${parseFloat(est.precio || 0).toFixed(0)}`;

		const maxW = 48;
		const lines = pdf.splitTextToSize(desc, maxW);
		lines.forEach((line, i) => {
			if (i === 0) {
				pdf.text(line, mg, y);
				pdf.text(precio, W - mg, y, { align: 'right' });
			} else {
				pdf.text(line, mg, y);
			}
			y += 3.8;
		});
		pdf.setLineWidth(0.1);
		pdf.setDrawColor(180, 180, 180);
		pdf.line(mg, y, W - mg, y);
		pdf.setDrawColor(0, 0, 0);
		y += 2;
	});

	y += 3;

	pdf.setLineWidth(0.3);
	pdf.line(mg, y, W - mg, y);
	y += 5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);

	const filaTotal = (label, valor) => {
		pdf.text(label, W - mg - 14, y, { align: 'right' });
		pdf.text(valor, W - mg, y, { align: 'right' });
		y += 4.5;
	};

	filaTotal('SubTotal', `$ ${parseFloat(subtotal || 0).toFixed(2)}`);
	filaTotal('Descuento', `$ ${parseFloat(descuento || 0).toFixed(2)}`);

	y += 1;
	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(12);
	pdf.text(`Total $ ${parseFloat(total || 0).toFixed(2)}`, W / 2, y, { align: 'center' });
	y += 6;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	filaTotal('Abono 1', `$ ${parseFloat(abono1 || pagoRecibido || 0).toFixed(2)}`);
	filaTotal('Abono 2', `$ ${parseFloat(abono2 || 0).toFixed(2)}`);
	filaTotal('Adeudo', `$ ${parseFloat(adeudo || 0).toFixed(2)}`);
	filaTotal('Paga con', `$ ${parseFloat(pagoRecibido || 0).toFixed(2)}`);
	filaTotal('Cambio', `$ ${parseFloat(cambio || 0).toFixed(2)}`);

	y += 2;
	const formaPagoTexto = (formaPago || 'Efectivo').charAt(0).toUpperCase() + (formaPago || 'efectivo').slice(1);
	pdf.text(`Forma de Pago: ${formaPagoTexto}`, mg, y);
	y += 5;

	// El cobro con tarjeta se aclara en el ticket para poder conciliarlo con el
	// voucher de la terminal.
	const datosTarjetaTexto = describirPagoTarjeta({
		ultimos4: tarjetaUltimos4,
		codigoAprobacion,
	});
	if (esPagoConTarjeta(formaPago) && datosTarjetaTexto) {
		pdf.text(`Tarjeta: ${datosTarjetaTexto}`, mg, y);
		y += 5;
	}

	if (vendedor) {
		pdf.text(`Vendedor: ${vendedor.toUpperCase()}.`, mg, y);
		y += 6;
	}

	try {
		const qrImg = await conLimiteDeEspera(generarQR(urlPortalResultados));
		const qrSize = 22;
		pdf.addImage(qrImg, 'PNG', (W - qrSize) / 2, y, qrSize, qrSize);
		y += qrSize + 4;
	} catch { y += 2; }

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(9);
	pdf.text('Descarga tus Resultados', W / 2, y, { align: 'center' });
	y += 5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(6.5);
	const pie = 'El presente ticket no es un comprobante fiscal. Si requiere factura deberá solicitarla durante el mismo mes de compra al 3227285354. No se facturan tickets de otros meses.';
	const pieLines = pdf.splitTextToSize(pie, W - mg * 2);
	pieLines.forEach((l) => { pdf.text(l, mg, y); y += 3.2; });

};


// El ticket de imagen sigue el formato de CDI: los datos de la orden en
// renglones, el desglose de conceptos y los totales al pie. El membrete, los
// datos de la empresa y el QR al portal se conservan del ticket de laboratorio.
const dibujarTicketImagenEnPdf = async (pdf, datosTicket) => {
	const {
		folio,
		fecha,
		paciente,
		fechaNacimiento,
		edad,
		doctor,
		cliente,
		sucursal,
		empresa,
		telefono,
		estudios = [],
		subtotal,
		descuento,
		total,
		pagoRecibido,
		adeudo,
		cambio,
		formaPago,
		tarjetaUltimos4,
		codigoAprobacion,
		vendedor,
	} = datosTicket;

	let rfcEmpresa = '';
	try {
		rfcEmpresa = resolverRfcTicketEmpresa(empresa);
	} catch (error) {
		console.warn(`Ticket sin RFC (${empresa || 'sin empresa'}):`, error.message);
	}
	const urlPortalResultados = crearUrlPortalResultados({ folio, telefono });

	const W = 80;
	const mg = 5;
	let y = 6;

	try {
		const logoMod = await conLimiteDeEspera(import('../assets/logoCDC.jpg'));
		const logoB64 = await getImageBase64(logoMod.default);
		pdf.addImage(logoB64, 'JPEG', mg, y, W - mg * 2, 22);
		y += 24;
	} catch {
		y += 4;
	}

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	const encabezadoEmpresa = resolverEncabezadoEmpresaTicket(empresa);
	[
		...(encabezadoEmpresa.razonSocial ? [encabezadoEmpresa.razonSocial] : []),
		'Dirección: Av. Francisco Villa 880, C.P. 48328, Colonia',
		'Gaviotas, Puerto Vallarta, Jalisco, México.',
		...(rfcEmpresa ? [`RFC: ${rfcEmpresa}`] : []),
		`Correo: ${encabezadoEmpresa.correo}`,
		'Teléfono: 3222256008',
	].forEach((linea) => {
		pdf.text(linea, W / 2, y, { align: 'center' });
		y += 3.5;
	});
	y += 3;

	const separador = () => {
		pdf.setLineWidth(0.3);
		pdf.line(mg, y, W - mg, y);
		y += 4;
	};

	separador();

	const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha || new Date();
	const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
	const fechaNacimientoStr = fechaNacimiento
		? new Date(fechaNacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
		: '';

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8.5);

	const renglon = (etiqueta, valor) => {
		if (!valor) return;
		const lineas = pdf.splitTextToSize(`${etiqueta}: ${valor}`, W - mg * 2);
		lineas.forEach((linea) => {
			pdf.text(linea, mg, y);
			y += 4;
		});
	};

	renglon('Fecha', `${fechaStr} ${horaStr}`);
	renglon('No. orden', folio);
	renglon('Paciente', (paciente || '').toUpperCase());
	renglon('Fecha nacimiento', fechaNacimientoStr);
	renglon('Teléfono', telefono);
	renglon('Cliente', cliente);
	renglon('Sucursal', sucursal);
	renglon('Registra', (vendedor || '').toUpperCase());
	renglon('Forma de pago', (formaPago || 'efectivo').replace(/_/g, ' ').toUpperCase());
	renglon('Edad', edad);

	y += 1;
	separador();

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8.5);
	pdf.text('Concepto', mg, y);
	pdf.text('Importe', W - mg, y, { align: 'right' });
	y += 3;
	separador();

	estudios.forEach((estudio) => {
		const descripcion = String(estudio.descripcion || estudio.descripcion_estudio || '').toUpperCase();
		const cantidad = Number(estudio.cantidad) || 1;
		const importe = `$${parseFloat(estudio.precio || 0).toFixed(2)}`;
		const lineas = pdf.splitTextToSize(`${cantidad} x ${descripcion}`, W - mg * 2 - 20);
		lineas.forEach((linea, indice) => {
			pdf.text(linea, mg, y);
			if (indice === lineas.length - 1) {
				pdf.text(importe, W - mg, y, { align: 'right' });
			}
			y += 4;
		});
	});

	y += 1;
	pdf.setLineWidth(0.3);
	pdf.line(W - mg - 25, y, W - mg, y);
	y += 4;

	const filaTotal = (etiqueta, valor, negritas = false) => {
		pdf.setFont('helvetica', negritas ? 'bold' : 'normal');
		pdf.text(etiqueta, mg, y);
		pdf.text(`$${parseFloat(valor || 0).toFixed(2)}`, W - mg, y, { align: 'right' });
		y += 4.5;
	};

	filaTotal('Subtotal:', subtotal);
	filaTotal('Descuentos:', descuento);

	pdf.setLineWidth(0.3);
	pdf.line(W - mg - 25, y - 1, W - mg, y - 1);
	y += 2;

	filaTotal('Total:', total, true);
	filaTotal('Abono:', pagoRecibido);
	filaTotal('Saldo:', adeudo);
	filaTotal('Cambio:', cambio);

	pdf.setFont('helvetica', 'normal');
	const datosTarjetaTexto = describirPagoTarjeta({
		ultimos4: tarjetaUltimos4,
		codigoAprobacion,
	});
	if (esPagoConTarjeta(formaPago) && datosTarjetaTexto) {
		y += 1;
		pdf.text(`Tarjeta: ${datosTarjetaTexto}`, mg, y);
		y += 4.5;
	}

	y += 1;
	separador();

	if (doctor) {
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(8.5);
		const lineasMedico = pdf.splitTextToSize(`Médico: ${doctor.toUpperCase()}`, W - mg * 2);
		lineasMedico.forEach((linea) => {
			pdf.text(linea, mg, y);
			y += 4;
		});
		y += 2;
	}

	try {
		const qrImg = await conLimiteDeEspera(generarQR(urlPortalResultados));
		const qrSize = 22;
		pdf.addImage(qrImg, 'PNG', (W - qrSize) / 2, y, qrSize, qrSize);
		y += qrSize + 4;
	} catch {
		y += 2;
	}

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(9);
	pdf.text('Descarga tus Resultados', W / 2, y, { align: 'center' });
	y += 4;
	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	pdf.splitTextToSize(urlPortalResultados.replace(/^https?:\/\//, ''), W - mg * 2).forEach((linea) => {
		pdf.text(linea, W / 2, y, { align: 'center' });
		y += 3.5;
	});
	y += 2;

	pdf.setFontSize(6.5);
	const pie = 'El presente ticket no es un comprobante fiscal. Si requiere factura deberá solicitarla durante el mismo mes de compra al 3227285354. No se facturan tickets de otros meses.';
	pdf.splitTextToSize(pie, W - mg * 2).forEach((linea) => {
		pdf.text(linea, mg, y);
		y += 3.2;
	});
};

export const TIPO_TICKET_IMAGEN = 'imagen';
export const TIPO_TICKET_LABORATORIO = 'laboratorio';

// Armar el documento se separa de abrirlo: al guardar una orden los
// comprobantes se preparan primero y se abren desde el clic del usuario, que es
// lo que evita que el navegador bloquee las pestañas.
export const crearDocumentoTicketsVenta = async ({ tickets = [] } = {}) => {
	const lista = tickets.filter(Boolean);
	if (lista.length === 0) return null;

	const pdf = new jsPDF({ unit: 'mm', format: [80, 297] });
	const folios = lista.map((ticket) => ticket.folio).filter(Boolean).join(' · ');
	const titulo = `Ticket ${folios}`;
	pdf.setProperties({ title: titulo });

	for (const [indice, ticket] of lista.entries()) {
		if (indice > 0) pdf.addPage([80, 297]);
		// El ticket de imagen tiene su propio formato; el de laboratorio conserva
		// el de siempre.
		if (ticket.tipo === TIPO_TICKET_IMAGEN) {
			await dibujarTicketImagenEnPdf(pdf, ticket);
		} else {
			await dibujarTicketEnPdf(pdf, ticket);
		}
	}

	return { url: URL.createObjectURL(pdf.output('blob')), titulo };
};

export const generarTicketsVenta = async ({ tickets = [], ventana } = {}) => {
	const documento = await crearDocumentoTicketsVenta({ tickets });
	if (!documento) return;

	abrirPdfEnPestana({ ...documento, ventana });
};

export const generarTicketVenta = async (datosTicket = {}) =>
	generarTicketsVenta({ tickets: [datosTicket], ventana: datosTicket.ventana });
