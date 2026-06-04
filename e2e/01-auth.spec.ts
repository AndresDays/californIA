import { test, expect } from '@playwright/test';
import { injectAuthSession, mockSupabaseSession, mockSupabaseTables, EMPLEADOS } from './helpers/supabase-mock';

const SUPABASE_URL = 'https://yufpytzzywcxkmuxhlxb.supabase.co';

test.describe('Autenticación', () => {
  test('muestra la pantalla de login al entrar sin sesión', async ({ page }) => {
    await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
      if (route.request().url().includes('/session')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: null, user: null }) });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible({ timeout: 8000 });
  });

  test('redirige al dashboard tras login exitoso', async ({ page }) => {
    await mockSupabaseSession(page, 'admin');
    await mockSupabaseTables(page);

    await page.route(`${SUPABASE_URL}/auth/v1/token**`, async (route) => {
      const empleado = EMPLEADOS.admin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: { id: empleado.auth_uuid, email: 'admin@test.com', role: 'authenticated', aud: 'authenticated' },
        }),
      });
    });

    await page.goto('/login');
    await page.locator('#email').fill('admin@test.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('el sidebar de administrador muestra todos los módulos', async ({ page }) => {
    await injectAuthSession(page, 'admin');
    await mockSupabaseTables(page);

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('.sidebar-home');
    await expect(sidebar).toBeVisible({ timeout: 8000 });

    await expect(sidebar.getByRole('button', { name: /inicio/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /nuevo paciente/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /recepción/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /administración/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /reportes/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /configuración/i })).toBeVisible();
  });

  test('el sidebar de recepcionista solo muestra módulos permitidos', async ({ page }) => {
    await injectAuthSession(page, 'recepcionista');
    await mockSupabaseTables(page);

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.recepcionista]) });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('.sidebar-home');
    await expect(sidebar).toBeVisible({ timeout: 8000 });

    await expect(sidebar.getByRole('button', { name: /inicio/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /nuevo paciente/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /recepción/i })).toBeVisible();

    await expect(sidebar.getByRole('button', { name: /reportes/i })).not.toBeVisible();
    await expect(sidebar.getByRole('button', { name: /configuración/i })).not.toBeVisible();
    await expect(sidebar.getByRole('button', { name: /captura/i })).not.toBeVisible();
  });

  test('recepcionista no puede acceder a rutas bloqueadas', async ({ page }) => {
    await injectAuthSession(page, 'recepcionista');
    await mockSupabaseTables(page);

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.recepcionista]) });
    });

    await page.goto('/reporte-ventas');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
  });

  test('refresh en una ruta protegida mantiene la sesión activa', async ({ page }) => {
    await injectAuthSession(page, 'admin');
    await mockSupabaseTables(page);

    await page.route(`${SUPABASE_URL}/rest/v1/empleados**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EMPLEADOS.admin]) });
    });

    await page.goto('/cierre-caja');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/cierre-caja/, { timeout: 8000 });
    await expect(page.getByText(/cierre de caja/i)).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/cierre-caja/, { timeout: 8000 });
    await expect(page.getByText(/cierre de caja/i)).toBeVisible();
  });
});
