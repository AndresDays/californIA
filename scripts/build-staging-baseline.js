import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_PATTERNS = [
  /^(?:COPY|INSERT\s+INTO)\s+/imu,
  /^-- Data for Name:/imu,
];

const BLOCK_START = /(?=^--\n-- Name: )/mu;
const PUBLIC_BLOCK = /Type: [^;]+; Schema: public;/u;
const SCHEMA_BLOCK = /Type: SCHEMA; Schema: -;/u;

export function validateSchemaDump(source) {
  if (DATA_PATTERNS.some((pattern) => pattern.test(source))) {
    throw new Error('The schema dump must not contain table data');
  }
}

export function buildBaseline(source) {
  validateSchemaDump(source);

  const blocks = source.split(BLOCK_START);
  const publicBlocks = blocks.filter((block) => (
    PUBLIC_BLOCK.test(block) && !SCHEMA_BLOCK.test(block)
  ));

  const preamble = [
    'create extension if not exists pgcrypto;',
    'set check_function_bodies = false;',
    'set row_security = off;',
  ].join('\n');

  return `${preamble}\n\n${publicBlocks.join('\n').replace(/^\\.*$/gmu, '')}`.trimEnd() + '\n';
}

function isExecutedDirectly() {
  return process.argv[1]?.endsWith('/build-staging-baseline.js');
}

if (isExecutedDirectly()) {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/build-staging-baseline.js <schema-dump.sql>');
  }

  const source = readFileSync(process.argv[2], 'utf8');
  const output = buildBaseline(source);
  const outputPath = resolve('supabase/migrations/20260508000000_schema_baseline.sql');
  writeFileSync(outputPath, output);
}
