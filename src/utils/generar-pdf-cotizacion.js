import jsPDF from 'jspdf';

const getImageBase64 = async (imagePath) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			resolve(canvas.toDataURL('image/jpeg'));
		};
		img.onerror = reject;
		img.src = imagePath;
	});
};

const convertToGrayscale = (imageBase64) => {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');

			ctx.drawImage(img, 0, 0);

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			for (let i = 0; i < data.length; i += 4) {
				const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
				data[i] = gray;
				data[i + 1] = gray;
				data[i + 2] = gray;
			}

			ctx.putImageData(imageData, 0, 0);
			resolve(canvas.toDataURL('image/jpeg'));
		};
		img.src = imageBase64;
	});
};

export const generarPDFCotizacion = async (datosTicket) => {
	const {
		numeroCotizacion,
		fecha,
		cliente,
		estudios,
		subtotal,
		descuento,
		total
	} = datosTicket;

	const pdf = new jsPDF({
		unit: 'mm',
		format: [80, 297],
	});

	let y = 8;

	try {
		const logoCDC = await import('../assets/logoCDC.jpg');
		const logoBase64 = await getImageBase64(logoCDC.default);
		const logoGrayscale = await convertToGrayscale(logoBase64);

		pdf.addImage(logoGrayscale, 'JPEG', 10, y, 60, 20);
		y += 35;
	} catch (error) {
		console.error('Error cargando logo:', error);
		y += 8;
	}

	pdf.setLineWidth(0.3);
	pdf.setDrawColor(0, 0, 0);
	pdf.line(5, y, 75, y);
	y += 6;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(9);
	pdf.text('Descarga de Resultados:', 40, y, { align: 'center' });
	y += 5;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(9);
	pdf.text('sistema.centraldiagnostica', 40, y, { align: 'center' });
	y += 4;
	pdf.text('california.com/resultados/', 40, y, { align: 'center' });
	y += 5;

	pdf.setFontSize(9);
	pdf.text('Teléfono: 3222230008', 40, y, { align: 'center' });
	y += 7;

	pdf.line(5, y, 75, y);
	y += 6;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(9);
	pdf.text(`Fecha: ${fecha}`, 10, y);
	y += 5.5;
	pdf.text(`Cliente: ${cliente}`, 10, y);
	y += 8;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(11);
	pdf.text(`Cotización # ${numeroCotizacion}`, 40, y, { align: 'center' });
	y += 7;

	pdf.setLineWidth(0.5);
	pdf.line(5, y, 75, y);
	y += 6;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(8);

	estudios.forEach((estudio) => {
		const descripcion = estudio.descripcion.toUpperCase();
		const precio = `$ ${estudio.precio.toFixed(2)}`;

		const maxWidth = 50;
		const lines = pdf.splitTextToSize(descripcion, maxWidth);

		lines.forEach((line, index) => {
			if (index === 0) {
				pdf.text(line, 10, y);
				pdf.text(precio, 70, y, { align: 'right' });
			} else {
				pdf.text(line, 10, y);
			}
			y += 4.5;
		});

		y += 1.5;
	});

	y += 2.5;

	pdf.setLineWidth(0.5);
	pdf.line(5, y, 75, y);
	y += 6;

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(10);
	pdf.text('Total', 10, y);
	pdf.text(`$ ${subtotal.toFixed(2)}`, 70, y, { align: 'right' });
	y += 7;

	if (descuento > 0) {
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(9);
		const textoDescuento = `Ha Recibido Descuento de $ ${descuento.toFixed(2)}`;
		pdf.text(textoDescuento, 40, y, { align: 'center' });
		y += 7;
	}

	pdf.setLineWidth(0.3);
	pdf.line(5, y, 75, y);
	y += 6;

	pdf.setFont('helvetica', 'italic');
	pdf.setFontSize(7);
	const nota = 'Cotización válida por 15 días, precios sujetos a cambio sin previo aviso';
	const notaLines = pdf.splitTextToSize(nota, 70);
	notaLines.forEach(line => {
		pdf.text(line, 40, y, { align: 'center' });
		y += 3.5;
	});

	const pdfBlob = pdf.output('blob');
	const pdfUrl = URL.createObjectURL(pdfBlob);
	window.open(pdfUrl, '_blank');
};
