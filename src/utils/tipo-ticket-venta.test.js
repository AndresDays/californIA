import {
	TIPO_TICKET_IMAGEN,
	TIPO_TICKET_LABORATORIO,
	resolverTipoTicketVenta,
} from "./tipo-ticket-venta";

// Al cobrar, el formato lo decide la serie que se le asignó a cada parte de la
// orden. Al reimprimir desde editar solicitud sólo se tiene la orden guardada,
// y sin resolverlo el ticket de una orden de imagen salía con el del
// laboratorio.
describe('resolverTipoTicketVenta', () => {
	test.each([
		['A0001', TIPO_TICKET_IMAGEN],
		['B0123', TIPO_TICKET_IMAGEN],
		['C0001', TIPO_TICKET_LABORATORIO],
		['c-0001', TIPO_TICKET_LABORATORIO],
	])('la serie del folio manda: %s', (folio, esperado) => {
		expect(resolverTipoTicketVenta({ folio })).toBe(esperado);
	});

	// Los folios anteriores al cambio de series no traen letra: ahí decide la
	// empresa que cobra, y CDI sólo hace imagen.
	test.each([
		['2609260001', 'CDI', TIPO_TICKET_IMAGEN],
		['2609260001', 'Centro de Diagnostico por Imagen PVR', TIPO_TICKET_IMAGEN],
		['2609260001', 'CDC', TIPO_TICKET_LABORATORIO],
		['2609260001', '', TIPO_TICKET_LABORATORIO],
	])('un folio histórico se resuelve por empresa: %s / %s', (folio, empresa, esperado) => {
		expect(resolverTipoTicketVenta({ folio, empresa })).toBe(esperado);
	});

	test('sin datos cae en el ticket de laboratorio, que es el de siempre', () => {
		expect(resolverTipoTicketVenta()).toBe(TIPO_TICKET_LABORATORIO);
	});
});
