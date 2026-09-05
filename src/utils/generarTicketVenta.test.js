// El ancho del texto se estima a partir del tamaño de letra, como lo haría
// jsPDF: sin eso no se puede probar que un nombre largo se acomode dentro del
// papel.
const ANCHO_POR_CARACTER = 0.18;
const anchoDeTexto = (texto, tamano) =>
	String(texto).length * tamano * ANCHO_POR_CARACTER;

const mockDoc = {
	addImage: jest.fn(),
	addPage: jest.fn(),
	line: jest.fn(),
	output: jest.fn(() => new Blob()),
	setDrawColor: jest.fn(),
	setFont: jest.fn(),
	setFontSize: jest.fn((tamano) => { mockDoc.__tamano = tamano; }),
	getFontSize: jest.fn(() => mockDoc.__tamano ?? 10),
	getTextWidth: jest.fn((texto) => anchoDeTexto(texto, mockDoc.__tamano ?? 10)),
	setLineWidth: jest.fn(),
	setProperties: jest.fn(),
	splitTextToSize: jest.fn((texto) => [texto]),
	text: jest.fn((texto) => {
		tamanoPorTexto.set(String(texto), mockDoc.__tamano ?? 10);
	}),
};

const tamanoPorTexto = new Map();
const tamanoUsadoEn = (texto) => tamanoPorTexto.get(String(texto)) ?? 10;

jest.mock('jspdf', () => jest.fn(() => mockDoc));
jest.mock('jsbarcode', () => jest.fn());
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('qr') }));
jest.mock('../assets/logoCDC.jpg', () => {
	throw new Error('El logo no forma parte de esta prueba');
});

import {
	generarTicketsVenta,
	resolverEncabezadoEmpresaTicket,
	generarTicketVenta,
	TIPO_TICKET_IMAGEN,
	resolverEmpresaTicketReimpresion,
	resolverRfcTicketEmpresa,
} from './generarTicketVenta';

describe('resolverRfcTicketEmpresa', () => {
	test.each([
		['CDC', 'CDC031217UMA'],
		['Centro Diagnostico California', 'CDC031217UMA'],
		['CDI', 'CDI200902A84'],
		['Centro de Diagnostico por Imagen PVR', 'CDI200902A84'],
	])('resuelve %s', (empresa, esperado) => {
		expect(resolverRfcTicketEmpresa(empresa)).toBe(esperado);
	});

	test.each(['', 'Empresa externa'])('rechaza empresa sin RFC: %s', (empresa) => {
		expect(() => resolverRfcTicketEmpresa(empresa)).toThrow(
			'No existe RFC configurado para la empresa seleccionada',
		);
	});
});

describe('resolverEmpresaTicketReimpresion', () => {
	test.each([
		['CENTRAL DIAGNOSTICA CALIFORNIA', 'CENTRAL DIAGNOSTICA CALIFORNIA'],
		['CENTRO DE DIAGNOSTICO POR IMAGEN PVR', 'CENTRO DE DIAGNOSTICO POR IMAGEN PVR'],
		[null, 'CDC'],
	])('conserva el emisor de una reimpresion o usa CDC para historicos', (empresa, esperado) => {
		expect(resolverEmpresaTicketReimpresion(empresa)).toBe(esperado);
	});
});

describe('generarTicketVenta', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'barcode');
		URL.createObjectURL = jest.fn(() => 'blob:ticket');
		window.open = jest.fn();
	});

	test('imprime el ticket aunque la empresa no tenga RFC configurado', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {});

		await generarTicketVenta({
			folio: 'V-002',
			fecha: new Date('2026-08-05T12:00:00'),
			paciente: 'Paciente',
			empresa: 'Veterinaria PVR',
			telefono: '3221234567',
			email: 'paciente@example.com',
			estudios: [],
		});

		const textos = mockDoc.text.mock.calls.map((llamada) => llamada[0]);
		expect(textos).toContain('Central Diagnóstica California');
		expect(textos.join(' ')).not.toMatch(/RFC:/);
		expect(mockDoc.output).toHaveBeenCalled();
	});

	test('escribe el RFC de CDI en el encabezado', async () => {
		await generarTicketVenta({
			folio: 'V-001',
			fecha: new Date('2026-08-05T12:00:00'),
			paciente: 'Paciente',
			empresa: 'CDI',
			telefono: '3221234567',
			email: 'paciente@example.com',
			estudios: [],
		});

		expect(mockDoc.text).toHaveBeenCalledWith(
			'RFC: CDI200902A84',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Email: paciente@example.com',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Telefono: 3221234567',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.setProperties).toHaveBeenCalledWith({ title: 'Ticket V-001' });
		expect(window.open).toHaveBeenCalledWith('blob:ticket', '_blank');
	});

	// El renglón del paciente va centrado, así que un nombre largo se salía del
	// papel por los dos lados. El del convenio comparte el mismo riesgo.
	test('acomoda un nombre largo dentro del ancho del ticket', async () => {
		await generarTicketVenta({
			folio: 'V-003',
			fecha: new Date('2026-08-26T18:17:00'),
			paciente: 'Muñoz Lomeli Maria Guadalupe del Refugio',
			doctor: 'Valencia Romano Luis Eduardo',
			cliente: 'Convenio Seguros Monterrey New York Life',
			empresa: 'CDC',
			telefono: '3223566142',
			email: '',
			estudios: [],
		});

		const ANCHO_UTIL = 70;
		const renglones = mockDoc.text.mock.calls.filter(([texto]) =>
			['Paciente:', 'Doctor:', 'Cliente:'].some((etiqueta) =>
				String(texto).startsWith(etiqueta),
			),
		);

		expect(renglones).toHaveLength(3);
		renglones.forEach(([texto]) => {
			const tamano = tamanoUsadoEn(texto);
			expect(anchoDeTexto(texto, tamano)).toBeLessThanOrEqual(ANCHO_UTIL);
		});
	});

	// El nombre del paciente salía rotulado como "Cliente", que en el sistema es
	// el convenio: en caja no se distinguía a quién correspondía cada dato.
	test('rotula el nombre del paciente como Paciente y no como Cliente', async () => {
		await generarTicketVenta({
			folio: 'V-004',
			fecha: new Date('2026-08-26T18:17:00'),
			paciente: 'Angelica Aguilar',
			cliente: 'IMSS Convenio',
			empresa: 'CDC',
			telefono: '3223566142',
			email: '',
			estudios: [],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => String(texto));

		expect(textos).toContain('Paciente: ANGELICA AGUILAR');
		expect(textos).not.toContain('Cliente: ANGELICA AGUILAR');
	});

	test('escribe el convenio del cliente debajo del doctor', async () => {
		await generarTicketVenta({
			folio: 'V-005',
			fecha: new Date('2026-08-26T18:17:00'),
			paciente: 'Angelica Aguilar',
			doctor: 'Avila Rodriguez, Pedro',
			cliente: 'IMSS Convenio',
			empresa: 'CDC',
			telefono: '3223566142',
			email: '',
			estudios: [],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => String(texto));
		const posicionDe = (inicio) => textos.findIndex((texto) => texto.startsWith(inicio));

		expect(posicionDe('Doctor:')).toBeGreaterThanOrEqual(0);
		expect(posicionDe('Cliente:')).toBeGreaterThan(posicionDe('Doctor:'));
		expect(posicionDe('Folio:')).toBeGreaterThan(posicionDe('Cliente:'));
		expect(textos).toContain('Cliente: IMSS Convenio');
	});

	// Una orden sin médico sigue necesitando el convenio para saber a quién se
	// le factura.
	test('escribe el convenio aunque la orden no traiga doctor', async () => {
		await generarTicketVenta({
			folio: 'V-006',
			fecha: new Date('2026-08-26T18:17:00'),
			paciente: 'Angelica Aguilar',
			cliente: 'Particular',
			empresa: 'CDC',
			telefono: '3223566142',
			email: '',
			estudios: [],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => String(texto));

		expect(textos).toContain('Cliente: Particular');
		expect(textos.some((texto) => texto.startsWith('Doctor:'))).toBe(false);
	});

	// Sin convenio no se imprime un renglón vacío ni un "undefined".
	test('omite el renglón del convenio cuando la orden no trae cliente', async () => {
		await generarTicketVenta({
			folio: 'V-007',
			fecha: new Date('2026-08-26T18:17:00'),
			paciente: 'Angelica Aguilar',
			empresa: 'CDC',
			telefono: '3223566142',
			email: '',
			estudios: [],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => String(texto));

		expect(textos.some((texto) => texto.startsWith('Cliente:'))).toBe(false);
	});
});

describe('ticket de imagen', () => {
	const ticketImagen = {
		tipo: TIPO_TICKET_IMAGEN,
		folio: 'A0001',
		fecha: new Date('2026-08-25T15:38:00'),
		paciente: 'Angelica Patricia Aguilar',
		fechaNacimiento: '1972-05-01',
		edad: '54 años',
		doctor: 'Avila Rodriguez, Pedro',
		cliente: 'Particular',
		sucursal: 'Matriz',
		empresa: 'CDI',
		telefono: '3227797595',
		estudios: [{ descripcion: 'Columna cervical (2 posiciones)', precio: 848, cantidad: 1 }],
		subtotal: 848,
		descuento: 0,
		total: 848,
		pagoRecibido: 1000,
		adeudo: 0,
		cambio: 152,
		formaPago: 'efectivo',
		vendedor: 'Aylin Santana',
	};

	const textosDelTicket = () => mockDoc.text.mock.calls.map(([texto]) => texto);

	beforeEach(() => jest.clearAllMocks());

	test('lista los datos de la orden en renglones', async () => {
		await generarTicketsVenta({ tickets: [ticketImagen] });
		const textos = textosDelTicket();

		expect(textos).toEqual(
			expect.arrayContaining([
				'No. orden: A0001',
				'Paciente: ANGELICA PATRICIA AGUILAR',
				'Teléfono: 3227797595',
				'Cliente: Particular',
				'Sucursal: Matriz',
				'Registra: AYLIN SANTANA',
				'Forma de pago: EFECTIVO',
				'Edad: 54 años',
			]),
		);
		expect(textos.some((texto) => texto.startsWith('Fecha nacimiento: 01/05/1972'))).toBe(true);
	});

	test('desglosa el concepto y los totales', async () => {
		await generarTicketsVenta({ tickets: [ticketImagen] });
		const textos = textosDelTicket();

		expect(textos).toEqual(
			expect.arrayContaining([
				'Concepto',
				'Importe',
				'1 x COLUMNA CERVICAL (2 POSICIONES)',
				'$848.00',
				'Subtotal:',
				'Descuentos:',
				'Total:',
				'Abono:',
				'Saldo:',
				'Cambio:',
				'Médico: AVILA RODRIGUEZ, PEDRO',
			]),
		);
	});

	test('conserva el QR y la liga del portal de resultados', async () => {
		await generarTicketsVenta({ tickets: [ticketImagen] });

		expect(mockDoc.addImage).toHaveBeenCalledWith('qr', 'PNG', expect.any(Number), expect.any(Number), 22, 22);
		expect(textosDelTicket()).toEqual(expect.arrayContaining(['Descarga tus Resultados']));
	});

	// El de laboratorio conserva su formato de siempre.
	test('el ticket de laboratorio sigue con su formato', async () => {
		await generarTicketVenta({
			...ticketImagen,
			tipo: 'laboratorio',
			folio: 'C0001',
		});
		const textos = textosDelTicket();

		expect(textos).toEqual(expect.arrayContaining(['Folio: C0001']));
		expect(textos).not.toEqual(expect.arrayContaining(['No. orden: C0001']));
	});
});

describe('resolverEncabezadoEmpresaTicket', () => {
	// El encabezado lleva el nombre de la clínica que cobra, no el de la persona
	// titular del negocio. CDI factura aparte, así que además usa su correo.
	test.each(['CDI', 'Centro Diagnóstico por Imagen'])('%s se identifica como CDI', (empresa) => {
		expect(resolverEncabezadoEmpresaTicket(empresa)).toEqual({
			razonSocial: 'Centro de Diagnóstico por Imagen PVR',
			correo: 'cdi.rx2020@outlook.com',
		});
	});

	// Veterinaria no case con ninguna de las dos y cobra por CDC: cae del lado
	// de California, igual que una empresa vacía.
	test.each(['CDC', 'Central Diagnostica California', 'Veterinaria PVR', ''])(
		'%s se identifica como California',
		(empresa) => {
			expect(resolverEncabezadoEmpresaTicket(empresa)).toEqual({
				razonSocial: 'Central Diagnóstica California',
				correo: 'labcalifornia01@gmail.com',
			});
		},
	);

	// El nombre de la titular estuvo años en el encabezado de los dos formatos:
	// que no vuelva a colarse por ninguno.
	test('ningún encabezado lleva ya el nombre de la titular', () => {
		for (const empresa of ['CDC', 'CDI', 'Veterinaria PVR', '']) {
			expect(resolverEncabezadoEmpresaTicket(empresa).razonSocial).not.toMatch(/Paulina/i);
		}
	});
});

describe('encabezado del ticket de imagen', () => {
	const ticketBase = {
		tipo: TIPO_TICKET_IMAGEN,
		folio: 'A0001',
		fecha: new Date('2026-08-25T15:38:00'),
		paciente: 'Angelica Aguilar',
		estudios: [{ descripcion: 'US RENAL', precio: 500, cantidad: 1 }],
		vendedor: 'Aylin Santana',
	};

	beforeEach(() => jest.clearAllMocks());

	test('el de CDI se anuncia como CDI y lleva su correo', async () => {
		await generarTicketsVenta({ tickets: [{ ...ticketBase, empresa: 'CDI' }] });
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);

		expect(textos).toEqual(
			expect.arrayContaining([
				'Centro de Diagnóstico por Imagen PVR',
				'Correo: cdi.rx2020@outlook.com',
			]),
		);
		expect(textos.join(' ')).not.toMatch(/Paulina/i);
		expect(textos).toEqual(expect.arrayContaining(['Registra: AYLIN SANTANA']));
	});

	test('el de CDC se anuncia como California', async () => {
		await generarTicketsVenta({ tickets: [{ ...ticketBase, empresa: 'CDC', folio: 'B0001' }] });
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);

		expect(textos).toEqual(
			expect.arrayContaining([
				'Central Diagnóstica California',
				'Correo: labcalifornia01@gmail.com',
			]),
		);
		expect(textos.join(' ')).not.toMatch(/Paulina/i);
	});
});

// El de laboratorio es el que traía el nombre escrito a mano: si el encabezado
// se hubiera cambiado sólo en el resolutor, este formato habría seguido igual.
describe('encabezado del ticket de laboratorio', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lleva la razón social de California y no el nombre de la titular', async () => {
		await generarTicketVenta({
			folio: 'C0007',
			fecha: new Date('2026-09-02T12:41:00'),
			paciente: 'De La Torre Flores Jennifer Xitlali',
			empresa: 'Central Diagnostica California',
			telefono: '3221220777',
			estudios: [{ descripcion: 'BIOMETRIA HEMATICA COMPLETA (BHC)', precio: 165 }],
		});
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);

		expect(textos).toEqual(
			expect.arrayContaining([
				'Central Diagnóstica California',
				'Correo: labcalifornia01@gmail.com',
			]),
		);
		expect(textos.join(' ')).not.toMatch(/Paulina/i);
	});
});

describe('ningún ticket lleva fecha de entrega por estudio', () => {
	const estudios = [{ descripcion: 'BIOMETRIA HEMATICA', precio: 300, cantidad: 1, diasProceso: 3 }];

	beforeEach(() => jest.clearAllMocks());

	test.each([
		['laboratorio', 'C0001'],
		[TIPO_TICKET_IMAGEN, 'A0001'],
	])('el ticket de %s no imprime la columna de entrega', async (tipo, folio) => {
		await generarTicketsVenta({
			tickets: [{ tipo, folio, fecha: new Date('2026-08-25T15:38:00'), paciente: 'Paciente', estudios, empresa: 'CDC' }],
		});
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);

		expect(textos).not.toEqual(expect.arrayContaining(['Entrega']));
		// La fecha de entrega salía como 28-08-26 al sumar los días de proceso.
		expect(textos.some((texto) => /^\d{2}-\d{2}-\d{2}$/.test(String(texto)))).toBe(false);
	});
});

describe('datos del paciente en el ticket de laboratorio', () => {
	const ticketLaboratorio = {
		folio: 'C0100',
		fecha: new Date('2026-09-05T10:00:00'),
		paciente: 'Juan Perez',
		empresa: 'CDC',
		estudios: [{ descripcion: 'BIOMETRIA HEMATICA', precio: 165 }],
	};
	const textos = () => mockDoc.text.mock.calls.map(([texto]) => texto);

	beforeEach(() => {
		jest.clearAllMocks();
		HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'barcode');
		URL.createObjectURL = jest.fn(() => 'blob:ticket');
		window.open = jest.fn();
	});

	test('imprime la fecha de nacimiento y saca la edad de ella', async () => {
		// La edad depende del día en que se imprime: sin fijar el reloj la prueba
		// se rompería sola en el siguiente cumpleaños.
		jest.useFakeTimers().setSystemTime(new Date('2026-09-05T10:00:00'));
		await generarTicketVenta({
			...ticketLaboratorio,
			fechaNacimiento: '1990-04-12',
			telefono: '3221234567',
		});

		expect(textos()).toEqual(
			expect.arrayContaining(['Nacimiento: 12/04/1990', 'Edad: 36 años']),
		);
		jest.useRealTimers();
	});

	test('respeta la edad que trae la orden', async () => {
		await generarTicketVenta({
			...ticketLaboratorio,
			fechaNacimiento: '1990-04-12',
			edad: '35 años',
		});

		expect(textos()).toContain('Edad: 35 años');
	});

	test('un teléfono de puros ceros no se imprime ni va en la liga del portal', async () => {
		await generarTicketVenta({ ...ticketLaboratorio, telefono: '0000000000' });

		const impresos = textos().join(' ');
		expect(impresos).not.toMatch(/Telefono:/);
		expect(impresos).not.toMatch(/telefono=0000000000/);
	});

	test('el correo que va bajo el folio es el del paciente', async () => {
		await generarTicketVenta({
			...ticketLaboratorio,
			email: 'juan@correo.com',
			telefono: '3221234567',
		});

		const impresos = textos();
		// El de la empresa sigue en el encabezado, y el del paciente bajo el folio.
		expect(impresos).toContain('Correo: labcalifornia01@gmail.com');
		expect(impresos).toContain('Email: juan@correo.com');
	});

	test('sin correo no se imprime el renglón vacío', async () => {
		await generarTicketVenta({ ...ticketLaboratorio, telefono: '3221234567' });

		expect(textos().join(' ')).not.toMatch(/Email:/);
	});

	test('imprime al doctor de la orden', async () => {
		await generarTicketVenta({ ...ticketLaboratorio, doctor: 'Dra. Lopez' });

		expect(textos()).toContain('Doctor: DRA. LOPEZ');
	});
});
