import { test, expect } from '@playwright/test';
import { injectAuthSession, mockSupabaseTables, EMPLEADOS } from './helpers/supabase-mock';

const SUPABASE_URL = 'https://yufpytzzywcxkmuxhlxb.supabase.co';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, 'admin');

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/pacientes**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id_paciente: 1 }, { id_paciente: 2 }]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/citas**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/ventas**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/estudios_venta**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/estudios_radiologia**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(`${SUPABASE_URL}/rest/v1/sucursales**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id_sucursal: 1, nombre: 'Sucursal Central' }]) });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('muestra el saludo de bienvenida con el nombre del empleado', async ({ page }) => {
    await expect(page.getByText(/bienvenido/i)).toBeVisible({ timeout: 8000 });
  });

  test('muestra las 4 tarjetas de estadísticas', async ({ page }) => {
    const grid = page.locator('.stats-grid');
    await expect(grid).toBeVisible({ timeout: 8000 });
    const cards = grid.locator('.stat-card');
    await expect(cards).toHaveCount(4);
  });

  test('la tarjeta de ingresos arranca mostrando ingresos del mes para admin', async ({ page }) => {
    const cards = page.locator('.stat-card');
    const lastCard = cards.last();
    await expect(lastCard.getByText(/ingresos del mes/i)).toBeVisible({ timeout: 8000 });
  });

  test('al hacer clic en la tarjeta de ingresos cambia a pacientes de hoy', async ({ page }) => {
    const cards = page.locator('.stat-card');
    const lastCard = cards.last();

    await expect(lastCard.getByText(/ingresos del mes/i)).toBeVisible({ timeout: 8000 });
    await lastCard.click();
    await expect(lastCard.getByText(/pacientes de hoy/i)).toBeVisible({ timeout: 5000 });
  });

  test('muestra el centro de trabajo con las bandejas', async ({ page }) => {
    await expect(page.getByText(/centro de trabajo/i)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.workbench-section')).toBeVisible();
  });

  test('el botón Nueva Cita abre el modal', async ({ page }) => {
    const btn = page.locator('.btn-new-appointment');
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.locator('[class*="modal"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('la gráfica cambia al seleccionar vista Mes', async ({ page }) => {
    const mesBtn = page.getByRole('button', { name: /^mes$/i });
    await expect(mesBtn).toBeVisible({ timeout: 8000 });
    await mesBtn.click();
    await expect(mesBtn).toHaveClass(/active/, { timeout: 3000 });
  });

  test('la tabla de próximas citas muestra mensaje vacío cuando no hay citas', async ({ page }) => {
    await expect(page.getByText(/no hay citas próximas/i)).toBeVisible({ timeout: 8000 });
  });
});
