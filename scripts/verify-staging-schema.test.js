import {
  REQUIRED_TABLES,
  buildVerificationQuery,
  verifySchemaOutput,
} from './verify-staging-schema.js';

describe('staging schema verification', () => {
  test('checks every operational base table in one query', () => {
    expect(REQUIRED_TABLES).toEqual(expect.arrayContaining([
      'pacientes',
      'citas',
      'ventas',
      'estudios_venta',
      'empleados',
      'doctores',
      'sucursales',
    ]));
    expect(buildVerificationQuery()).toContain("to_regclass('public.pacientes')");
  });

  test('rejects an output with a missing table', () => {
    expect(() => verifySchemaOutput('public.analitos||public.clientes'))
      .toThrow('Staging schema is missing required tables');
  });
});
