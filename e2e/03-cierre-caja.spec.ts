import { test, expect } from '@playwright/test';
import { injectAuthSession, mockSupabaseTables, EMPLEADOS, SUCURSALES } from './helpers/supabase-mock';

const SUPABASE_URL = 'https://yufpytzzywcxkmuxhlxb.supabase.co';

test.describe('Cierre de Caja', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, 'admin');

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/sucursales**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SUCURSALES) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/cierre-caja');
    await page.waitForLoadState('networkidle');
  });

  test('renderiza el título y los controles principales', async ({ page }) => {
    await expect(page.getByText(/cierre de caja/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /apertura caja/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /movimiento/i })).toBeVisible();
    await expect(page.locator('.btn-imprimir-detalle')).toBeVisible();
  });

  test('muestra las cuatro filas de forma de pago', async ({ page }) => {
    await expect(page.getByText(/efectivo/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/tarjeta/i).first()).toBeVisible();
    await expect(page.getByText(/transferencia/i).first()).toBeVisible();
    await expect(page.getByText(/crédito/i).first()).toBeVisible();
  });

  test('abre el modal de apertura de caja', async ({ page }) => {
    await page.getByRole('button', { name: /apertura caja/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/apertura de caja/i)).toBeVisible();
    await expect(modal.locator('input[type="number"]')).toBeVisible();
    await expect(modal.locator('input[type="text"]')).toBeVisible();
  });

  test('registra apertura de caja y actualiza el monto', async ({ page }) => {
    let capturedBody: string | null = null;

    await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postData();
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.getByRole('button', { name: /apertura caja/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.locator('input[type="number"]').fill('500');
    await modal.locator('input[type="text"]').fill('Fondo inicial turno mañana');
    await modal.getByRole('button', { name: /confirmar apertura/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cierre-toast.exito')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cierre-toast.exito')).toContainText('$500.00');

    expect(capturedBody).toContain('apertura_caja');
    expect(capturedBody).toContain('500');
  });

  test('cancela el modal de apertura sin guardar', async ({ page }) => {
    await page.getByRole('button', { name: /apertura caja/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.locator('input[type="number"]').fill('200');
    await modal.getByRole('button', { name: /cancelar/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('abre el modal de nuevo movimiento', async ({ page }) => {
    await page.getByRole('button', { name: /movimiento/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/nuevo movimiento/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: /\+ ingreso/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /− egreso/i })).toBeVisible();
  });

  test('registra un ingreso manual en efectivo', async ({ page }) => {
    let capturedBody: string | null = null;

    await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postData();
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.getByRole('button', { name: /movimiento/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.getByRole('button', { name: /\+ ingreso/i }).click();
    await modal.getByPlaceholder(/concepto|proveedor/i).fill('Depósito extra de efectivo');
    await modal.getByRole('combobox').selectOption('Efectivo');
    await modal.getByPlaceholder('0.00').fill('300');
    await modal.getByRole('button', { name: /registrar ingreso/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cierre-toast.exito')).toBeVisible({ timeout: 5000 });

    expect(capturedBody).toContain('movimiento_manual_ingreso');
    expect(capturedBody).toContain('300');
  });

  test('registra un egreso manual en tarjeta', async ({ page }) => {
    let capturedBody: string | null = null;

    await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postData();
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.getByRole('button', { name: /movimiento/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.getByRole('button', { name: /− egreso/i }).click();
    await modal.getByPlaceholder(/concepto|proveedor/i).fill('Pago a proveedor');
    await modal.getByRole('combobox').selectOption('Tarjeta');
    await modal.getByPlaceholder('0.00').fill('150');
    await modal.getByRole('button', { name: /registrar egreso/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });

    expect(capturedBody).toContain('movimiento_manual_egreso');
    expect(capturedBody).toContain('tarjeta');
  });

  test('valida que el concepto sea obligatorio en nuevo movimiento', async ({ page }) => {
    await page.getByRole('button', { name: /movimiento/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.getByPlaceholder('0.00').fill('100');
    await modal.getByRole('button', { name: /registrar ingreso/i }).click();

    await expect(modal.getByText(/concepto es obligatorio/i)).toBeVisible({ timeout: 3000 });
    await expect(modal).toBeVisible();
  });

  test('valida que el monto sea mayor a 0 en nuevo movimiento', async ({ page }) => {
    await page.getByRole('button', { name: /movimiento/i }).click();

    const modal = page.locator('.modal-cierre-box');
    await modal.getByPlaceholder(/concepto|proveedor/i).fill('Test');
    await modal.getByRole('button', { name: /registrar ingreso/i }).click();

    await expect(modal.getByText(/monto debe ser mayor/i)).toBeVisible({ timeout: 3000 });
    await expect(modal).toBeVisible();
  });

  test('el filtro de sucursal recarga el corte al cambiar', async ({ page }) => {
    const requests: string[] = [];

    await page.route(`${SUPABASE_URL}/rest/v1/movimientos_pago_venta**`, async (route) => {
      requests.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    const sucursalSelect = page.locator('.select-sucursal-cierre');
    await sucursalSelect.selectOption({ label: 'Sucursal Norte' });
    await page.waitForTimeout(500);

    const filtered = requests.filter((url) => url.includes('id_sucursal'));
    expect(filtered.length).toBeGreaterThan(0);
  });
});
