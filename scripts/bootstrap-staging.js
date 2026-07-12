import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const BASELINE_VERSION = '20260508000000';
export const LEGACY_VERSION_MAX = '20260712093000';
export const PRODUCTION_PROJECT_REF = 'yufpytzzywcxkmuxhlxb';

export function validateStagingProject(projectRef) {
  if (!/^[a-z]{20}$/u.test(projectRef)) {
    throw new Error('A valid staging project reference is required');
  }

  if (projectRef === PRODUCTION_PROJECT_REF) {
    throw new Error('Refusing to bootstrap the production project');
  }
}

export function getLegacyVersions(files) {
  return files
    .map((file) => file.match(/^(\d+)_/u)?.[1])
    .filter((version) => version && version > BASELINE_VERSION && version <= LEGACY_VERSION_MAX)
    .sort();
}

export function buildDbPushArgs() {
  return ['db', 'push', '--include-all', '--yes'];
}

export function bootstrapStaging(projectRef) {
  validateStagingProject(projectRef);

  const migrationsPath = resolve('supabase/migrations');
  const legacyVersions = getLegacyVersions(readdirSync(migrationsPath));

  execFileSync('supabase', ['link', '--project-ref', projectRef], { stdio: 'inherit' });
  execFileSync(
    'supabase',
    ['migration', 'repair', ...legacyVersions, '--status', 'applied', '--yes'],
    { stdio: 'inherit' },
  );
  execFileSync('supabase', buildDbPushArgs(), { stdio: 'inherit' });
}

if (process.argv[1]?.endsWith('/bootstrap-staging.js')) {
  bootstrapStaging(process.env.SUPABASE_STAGING_PROJECT_REF);
}
