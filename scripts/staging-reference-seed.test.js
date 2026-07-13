import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const seedPath = resolve('supabase/migrations/20260712094000_staging_reference_seed.sql');

describe('staging reference seed', () => {
  test('seeds only staging reference records', () => {
    const seed = readFileSync(seedPath, 'utf8');

    expect(seed).toContain("'STAGING - NO PRODUCCION'");
    expect(seed).toContain("'STAGING-DX-PRUEBA'");
    expect(seed).not.toMatch(/insert into public\.(pacientes|citas|ventas|empleados|doctores)/i);
  });
});
