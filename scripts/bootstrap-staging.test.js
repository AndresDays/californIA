import {
  buildDbPushArgs,
  getLegacyVersions,
  validateStagingProject,
} from './bootstrap-staging.js';

describe('staging bootstrap', () => {
  test('selects only migrations represented by the baseline', () => {
    expect(getLegacyVersions([
      '20260508000000_schema_baseline.sql',
      '20260509000000_link_ventas_citas.sql',
      '20260712093000_portal_resultados_seguro.sql',
      '20260712094000_staging_reference_seed.sql',
      '20260713000000_future_change.sql',
    ])).toEqual(['20260509000000', '20260712093000']);
  });

  test('rejects the production Supabase reference', () => {
    expect(() => validateStagingProject('yufpytzzywcxkmuxhlxb'))
      .toThrow('Refusing to bootstrap the production project');
  });

  test('includes migrations inserted before repaired history', () => {
    expect(buildDbPushArgs()).toEqual(['db', 'push', '--include-all', '--yes']);
  });
});
