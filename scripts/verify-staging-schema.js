import { execFileSync } from 'node:child_process';

export const REQUIRED_TABLES = [
  'analitos',
  'citas',
  'clientes',
  'doctores',
  'empleados',
  'empresas',
  'estudio_analitos',
  'estudios_radiologia',
  'estudios_venta',
  'pacientes',
  'precios_estudios',
  'sucursales',
  'ventas',
];

export function buildVerificationQuery() {
  return `select ${REQUIRED_TABLES
    .map((table) => `to_regclass('public.${table}') as ${table}`)
    .join(', ')};`;
}

export function verifySchemaOutput(output) {
  const values = output.trim().split('|');
  const missingTables = REQUIRED_TABLES.filter((table, index) => !values[index]?.trim());

  if (values.length !== REQUIRED_TABLES.length || missingTables.length > 0) {
    throw new Error(`Staging schema is missing required tables: ${missingTables.join(', ')}`);
  }
}

export function verifyStagingSchema(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const output = execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-e',
      'DATABASE_URL',
      '-e',
      'VERIFY_QUERY',
      'public.ecr.aws/supabase/postgres:17.6.1.044',
      'sh',
      '-c',
      'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$VERIFY_QUERY"',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        VERIFY_QUERY: buildVerificationQuery(),
      },
    },
  );

  verifySchemaOutput(output);
}

if (process.argv[1]?.endsWith('/verify-staging-schema.js')) {
  verifyStagingSchema(process.env.DATABASE_URL);
}
