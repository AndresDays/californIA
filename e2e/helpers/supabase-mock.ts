import { Page, Route } from '@playwright/test';

const SUPABASE_URL = 'https://yufpytzzywcxkmuxhlxb.supabase.co';

export const EMPLEADOS = {
  admin: { nombre: 'Admin Test', rol: 'administrador', id_sucursal: 1, sucursal: 'Sucursal Central', auth_uuid: 'admin-uuid-001' },
  recepcionista: { nombre: 'Recep Test', rol: 'recepcionista', id_sucursal: 1, sucursal: 'Sucursal Central', auth_uuid: 'recep-uuid-001' },
  quimico: { nombre: 'Quimico Test', rol: 'quimico', id_sucursal: 1, sucursal: 'Sucursal Central', auth_uuid: 'quim-uuid-001' },
  radiologo: { nombre: 'Radiologo Test', rol: 'radiologo', id_sucursal: 1, sucursal: 'Sucursal Central', auth_uuid: 'rad-uuid-001' },
};

export const SUCURSALES = [
  { id_sucursal: 1, nombre: 'Sucursal Central' },
  { id_sucursal: 2, nombre: 'Sucursal Norte' },
];

export const PACIENTE_EJEMPLO = {
  id_paciente: 1,
  nombre: 'Juan Pérez García',
  telefono: '6641234567',
  fecha_nacimiento: '1985-03-15',
  sexo: 'M',
};

export const ESTUDIO_EJEMPLO = {
  id_tipo_estudio: 1,
  nombre: 'RADIOGRAFÍA DE TÓRAX',
  clave: 'RX-TORAX',
  area: 'Radiología',
  precio: 350,
};

export async function mockSupabaseSession(page: Page, rol: keyof typeof EMPLEADOS = 'admin') {
  const empleado = EMPLEADOS[rol];

  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.includes('/token') || url.includes('/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: empleado.auth_uuid,
            email: `${rol}@test.com`,
            role: 'authenticated',
            aud: 'authenticated',
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([empleado]),
    });
  });
}

export async function mockSupabaseTables(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/sucursales**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SUCURSALES) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/pacientes**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([PACIENTE_EJEMPLO]) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/tipos_estudio**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([ESTUDIO_EJEMPLO]) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/citas**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });
}

export async function injectAuthSession(page: Page, rol: keyof typeof EMPLEADOS = 'admin') {
  const empleado = EMPLEADOS[rol];
  await page.addInitScript((emp) => {
    const session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() / 1000 + 3600,
      user: {
        id: emp.auth_uuid,
        email: `${emp.rol}@test.com`,
        role: 'authenticated',
        aud: 'authenticated',
      },
    };
    const key = `sb-yufpytzzywcxkmuxhlxb-auth-token`;
    localStorage.setItem(key, JSON.stringify(session));
  }, empleado);
}
