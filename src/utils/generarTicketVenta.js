import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { resolverEmpresaOperativaCatalogo } from './cita-nuevo-paciente';
import { crearUrlPortalResultados } from './portal-resultados';

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

const generarCodigo = (len = 6) => Math.random().toString(36).substring(2, 2 + len);

const getImageBase64 = (url) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			canvas.getContext('2d').drawImage(img, 0, 0);
			resolve(canvas.toDataURL('image/jpeg'));
		};
		img.onerror = reject;
		img.src = url;
	});

const generarBarcode = (folio) => {
	const canvas = document.createElement('canvas');
	JsBarcode(canvas, folio, {
		format: 'CODE128',
		width: 2,
		height: 40,
		displayValue: true,
		fontSize: 10,
		margin: 4,
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

export const generarTicketVenta = async (datosTicket) => {
	const {
		folio,
		fecha,
		paciente,
		edad,
		doctor,
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
		vendedor,
	} = datosTicket;
	const rfcEmpresa = resolverRfcTicketEmpresa(empresa);
	const urlPortalResultados = crearUrlPortalResultados({ folio, telefono });

	const pdf = new jsPDF({ unit: 'mm', format: [80, 297] });
	const W = 80;
	const mg = 5;
	let y = 6;

	try {
		const logoMod = await import('../assets/logoCDC.jpg');
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
		`RFC: ${rfcEmpresa}`,
		'Correo: labcalifornia01@gmail.com',
	];
	lineasEncabezado.forEach((l) => {
		pdf.text(l, W / 2, y, { align: 'center' });
		y += 3.5;
	});
	y += 2;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	pdf.text('Descarga de Resultados:', W / 2, y, { align: 'center' });
	y += 4;
	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(8);
	const urlLines = pdf.splitTextToSize(
		urlPortalResultados.replace(/^https?:\/\//, ''),
		W - mg * 2,
	);
	urlLines.forEach((l) => { pdf.text(l, W / 2, y, { align: 'center' }); y += 4; });
	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7);
	pdf.text('Teléfono: 3222256008', W / 2, y, { align: 'center' });
	y += 5;

	const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
	const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	pdf.text(`Fecha: ${fechaStr} ${horaStr}`, W / 2, y, { align: 'center' });
	y += 4.5;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(8);
	pdf.text(`Cliente: ${(paciente || '').toUpperCase()}`, W / 2, y, { align: 'center' });
	y += 4.5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	if (edad) { pdf.text(`Edad: ${edad}`, W / 2, y, { align: 'center' }); y += 4; }
	if (doctor) { pdf.text(`Doctor: ${doctor.toUpperCase()}`, W / 2, y, { align: 'center' }); y += 4; }
	pdf.text(`Empresa: ${(empresa || 'PARTICULAR').toUpperCase()}`, W / 2, y, { align: 'center' });
	y += 4;

	const usuario = generarCodigo(6);
	const contrasena = generarCodigo(6);
	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(9);
	pdf.text(`Usuario: ${usuario}`, W / 2, y, { align: 'center' }); y += 5;
	pdf.text(`Contraseña: ${contrasena}`, W / 2, y, { align: 'center' }); y += 5;
	pdf.setFontSize(11);
	pdf.text(`Folio: ${folio}`, W / 2, y, { align: 'center' }); y += 5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);
	pdf.text(`Email: ${email || ''}`, W / 2, y, { align: 'center' }); y += 4;
	pdf.text(`Telefono: ${telefono || ''}`, W / 2, y, { align: 'center' }); y += 5;

	try {
		const barcodeImg = generarBarcode(folio);
		pdf.addImage(barcodeImg, 'PNG', mg + 2, y, W - mg * 2 - 4, 14);
		y += 16;
	} catch { y += 2; }

	pdf.setLineWidth(0.3);
	pdf.line(mg, y, W - mg, y);
	y += 5;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(7.5);
	pdf.text('', W - mg, y, { align: 'right' });
	pdf.text('Entrega', W - mg, y, { align: 'right' });
	y += 4;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(7.5);

	estudios.forEach((est) => {
		const desc = (est.descripcion || '').toUpperCase();
		const precio = `$ ${parseFloat(est.precio || 0).toFixed(0)}`;

		const diasProceso = est.diasProceso || 1;
		const fechaEntrega = new Date(fechaObj);
		fechaEntrega.setDate(fechaEntrega.getDate() + diasProceso);
		const feStr = fechaEntrega.toLocaleDateString('es-MX', {
			day: '2-digit', month: '2-digit', year: '2-digit',
		}).replace(/\//g, '-');

		const maxW = 38;
		const lines = pdf.splitTextToSize(desc, maxW);
		lines.forEach((line, i) => {
			if (i === 0) {
				pdf.text(line, mg, y);
				pdf.text(precio, W - mg - 14, y);
				pdf.text(feStr, W - mg, y, { align: 'right' });
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
		pdf.text(label, W / 2, y, { align: 'right' });
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

	if (vendedor) {
		pdf.text(`Vendedor: ${vendedor.toUpperCase()}.`, mg, y);
		y += 6;
	}

	try {
		const qrImg = await generarQR(urlPortalResultados);
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

	const blob = pdf.output('blob');
	window.open(URL.createObjectURL(blob), '_blank');
};
