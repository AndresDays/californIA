import { test, expect } from '@playwright/test';
import { injectAuthSession, EMPLEADOS } from './helpers/supabase-mock';
import path from 'path';

const SUPABASE_URL = 'https://yufpytzzywcxkmuxhlxb.supabase.co';

const VENTAS_MOCK = [
  {
    id_venta: 1,
    folio: 'F-001',
    fecha_venta: '2026-06-01T10:00:00',
    estado: 'activo',
    total: 700,
    pago_recibido: 700,
    forma_pago: 'efectivo',
    nombre_paciente: 'Ana Torres',
    id_sucursal: 1,
    sucursal: 'Sucursal Central',
    estudios_venta: [{ descripcion_estudio: 'BIOMETRÍA', precio: 350, area: 'Laboratorio' }],
  },
  {
    id_venta: 2,
    folio: 'F-002',
    fecha_venta: '2026-06-01T11:00:00',
    estado: 'activo',
    total: 350,
    pago_recibido: 350,
    forma_pago: 'tarjeta',
    nombre_paciente: 'Carlos Ruiz',
    id_sucursal: 1,
    sucursal: 'Sucursal Central',
    estudios_venta: [{ descripcion_estudio: 'RADIOGRAFÍA TÓRAX', precio: 350, area: 'Radiología' }],
  },
];

test.describe('Reporte de Ventas', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, 'admin');

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VENTAS_MOCK) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/sucursales**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id_sucursal: 1, nombre: 'Sucursal Central' }]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/doctores**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/clientes**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/reporte-ventas');
    await page.waitForLoadState('networkidle');
  });

  test('renderiza el título y controles del reporte', async ({ page }) => {
    await expect(page.getByText(/reporte de ventas/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
  });

  test('muestra las métricas calculadas', async ({ page }) => {
    await expect(page.locator('.rv-metrics')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.rv-metric').first()).toBeVisible();
  });

  test('muestra las ventas en la tabla', async ({ page }) => {
    await expect(page.getByText(/F-001/i).or(page.getByText(/Ana Torres/i))).toBeVisible({ timeout: 8000 });
  });

  test('filtra ventas por forma de pago', async ({ page }) => {
    const formaPagoSelect = page.getByRole('combobox').filter({ hasText: /forma|pago/i }).first();
    if (await formaPagoSelect.isVisible({ timeout: 3000 })) {
      await formaPagoSelect.selectOption('efectivo');
      await page.waitForTimeout(300);
      await expect(page.getByText(/F-001/i)).toBeVisible();
    }
  });

  test('descarga el reporte en Excel', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: /excel/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/reporte-ventas.*\.xlsx/);
  });

  test('descarga el reporte en PDF', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: /pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/reporte-ventas.*\.pdf/);
  });

  test('cambia el rango de fechas y recarga', async ({ page }) => {
    const requests: string[] = [];
    await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
      requests.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VENTAS_MOCK) });
    });

    const semBtn = page.getByRole('button', { name: /semana/i });
    if (await semBtn.isVisible({ timeout: 3000 })) {
      await semBtn.click();
      await page.waitForTimeout(500);
      expect(requests.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Reporte Administrativo', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, 'admin');

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VENTAS_MOCK) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/sucursales**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id_sucursal: 1, nombre: 'Sucursal Central' }]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/estudios_radiologia**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/doctores**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/clientes**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/reporte-administrativo');
    await page.waitForLoadState('networkidle');
  });

  test('renderiza el reporte administrativo', async ({ page }) => {
    await expect(page.getByText(/reporte administrativo/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /actualizar/i })).toBeVisible();
  });

  test('descarga el reporte administrativo en Excel', async ({ page }) => {
    await page.getByRole('button', { name: /actualizar/i }).click();
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: /excel/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/reporte-administrativo.*\.xlsx/);
  });

  test('descarga el reporte administrativo en PDF', async ({ page }) => {
    await page.getByRole('button', { name: /actualizar/i }).click();
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: /pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/reporte-administrativo.*\.pdf/);
  });
});
