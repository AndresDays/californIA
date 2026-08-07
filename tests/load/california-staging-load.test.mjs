import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('define una carga escalonada de 5, 10 y 15 usuarios para staging', async () => {
  const script = await readFile(new URL('../../load-tests/california-staging.js', import.meta.url), 'utf8');

  assert.match(script, /vus:\s*5/);
  assert.match(script, /vus:\s*10/);
  assert.match(script, /vus:\s*15/);
  assert.match(script, /http_req_failed:\s*\['rate<0\.01'\]/);
  assert.match(script, /http_req_duration:\s*\['p\(95\)<2000'\]/);
});

test('requiere configuración explícita de staging antes de ejecutar solicitudes', async () => {
  const script = await readFile(new URL('../../load-tests/california-staging.js', import.meta.url), 'utf8');

  assert.match(script, /LOAD_TEST_BASE_URL/);
  assert.match(script, /LOAD_TEST_SUPABASE_URL/);
  assert.match(script, /LOAD_TEST_SUPABASE_ANON_KEY/);
  assert.match(script, /LOAD_TEST_ACCESS_TOKEN/);
  assert.match(script, /setup\(\)/);
});
