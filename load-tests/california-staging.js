import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const requiredEnvironment = [
  'LOAD_TEST_BASE_URL',
  'LOAD_TEST_SUPABASE_URL',
  'LOAD_TEST_SUPABASE_ANON_KEY',
  'LOAD_TEST_ACCESS_TOKEN',
];

const requestHeaders = {
  apikey: __ENV.LOAD_TEST_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${__ENV.LOAD_TEST_ACCESS_TOKEN}`,
};

export const options = {
  scenarios: {
    five_users: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      tags: { load_level: '5' },
    },
    ten_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      startTime: '3m30s',
      tags: { load_level: '10' },
    },
    fifteen_users: {
      executor: 'constant-vus',
      vus: 15,
      duration: '3m',
      startTime: '7m',
      tags: { load_level: '15' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const requireEnvironment = (name) => {
  const value = __ENV[name];
  if (!value) fail(`Falta la variable requerida: ${name}`);
  return value;
};

export function setup() {
  if (__ENV.LOAD_TEST_ENV !== 'staging') {
    fail('Esta prueba solo se puede ejecutar con LOAD_TEST_ENV=staging.');
  }

  const configuration = Object.fromEntries(
    requiredEnvironment.map((name) => [name, requireEnvironment(name)]),
  );
  const applicationUrl = new URL(configuration.LOAD_TEST_BASE_URL);

  if (applicationUrl.hostname === 'app.californiadiagnostica.com') {
    fail('No ejecutes la prueba contra producción. Usa el dominio de staging.');
  }

  return {
    baseUrl: applicationUrl.origin,
    supabaseUrl: configuration.LOAD_TEST_SUPABASE_URL.replace(/\/$/, ''),
  };
}

const isSuccess = (response) => response.status >= 200 && response.status < 300;

export default function ({ baseUrl, supabaseUrl }) {
  const loginPage = http.get(`${baseUrl}/login`, { tags: { operation: 'login_page' } });
  check(loginPage, { 'la pantalla de acceso responde': isSuccess });

  const responses = http.batch([
    ['GET', `${supabaseUrl}/rest/v1/pacientes?select=id_paciente&limit=10`, null, { headers: requestHeaders, tags: { operation: 'patients_read' } }],
    ['GET', `${supabaseUrl}/rest/v1/citas?select=id_cita&limit=10`, null, { headers: requestHeaders, tags: { operation: 'appointments_read' } }],
    ['GET', `${supabaseUrl}/rest/v1/ventas?select=id_venta&limit=10`, null, { headers: requestHeaders, tags: { operation: 'sales_read' } }],
  ]);

  check(responses[0], { 'la consulta de pacientes responde': isSuccess });
  check(responses[1], { 'la consulta de citas responde': isSuccess });
  check(responses[2], { 'la consulta de ventas responde': isSuccess });

  sleep(1);
}
