import { estadoPromocion, promocionesVisibles, rutaParaPromocion, tituloDesdeArchivo } from './promociones-sala';

describe('estadoPromocion', () => {
	const hoy = '2026-11-15';

	test('activa sin fechas se muestra siempre', () => {
		expect(estadoPromocion({ activa: true }, hoy)).toBe('visible');
	});

	test('desactivada no se muestra aunque esté en fechas', () => {
		expect(estadoPromocion({ activa: false, vigente_desde: '2026-11-01' }, hoy)).toBe('inactiva');
	});

	test('respeta el primer y el último día, incluidos', () => {
		expect(estadoPromocion({ activa: true, vigente_desde: '2026-12-01' }, hoy)).toBe('programada');
		expect(estadoPromocion({ activa: true, vigente_hasta: '2026-11-14' }, hoy)).toBe('vencida');
		expect(estadoPromocion({ activa: true, vigente_desde: hoy, vigente_hasta: hoy }, hoy)).toBe('visible');
	});
});

test('promocionesVisibles deja sólo las vigentes, en su orden', () => {
	const lista = [
		{ id_promocion: 3, orden: 2, activa: true },
		{ id_promocion: 1, orden: 1, activa: true },
		{ id_promocion: 2, orden: 1, activa: false },
		{ id_promocion: 4, orden: 0, activa: true, vigente_hasta: '2020-01-01' },
	];
	expect(promocionesVisibles(lista, '2026-11-15').map((promo) => promo.id_promocion)).toEqual([1, 3]);
});

test('rutaParaPromocion limpia el nombre del archivo', () => {
	expect(rutaParaPromocion('WhatsApp Image 2026-11-09 at 10.15.32.JPEG', 123)).toMatch(
		/^123-[a-z0-9]+-whatsapp-image-2026-11-09-at-10-15-32\.jpeg$/,
	);
	expect(rutaParaPromocion('Promoción Mamá.png', 1)).toMatch(/^1-[a-z0-9]+-promocion-mama\.png$/);
});

test('tituloDesdeArchivo quita la extensión', () => {
	expect(tituloDesdeArchivo('Mes del hombre.png')).toBe('Mes del hombre');
});
