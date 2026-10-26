import { expect, test } from '@playwright/test';

test('automation controls preserve owner scope, acknowledge pause, and show errors', async ({
  page,
}) => {
  let enabled = false;
  await page.route('**/fonts/**', (route) => route.abort());
  await page.route('**/api/video-studio/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split('/api/video-studio/')[1];
    if (endpoint === 'session') {
      await route.fulfill({
        json: {
          scope: 'user:automation-test',
          registered: true,
          canAutomate: true,
          quota: {
            remaining: 10,
            limit: 10,
            maxDurationMs: 180000,
            storageBytes: 0,
            storageLimit: 1073741824,
            resetAt: Date.now() + 86400000,
            available: true,
          },
        },
      });
      return;
    }
    if (endpoint === 'automation/run') {
      await route.fulfill({ status: 409, json: { error: { code: 'AUTOMATION_INTERVAL' } } });
      return;
    }
    if (endpoint === 'automation') {
      if (route.request().method() === 'PUT') enabled = route.request().postDataJSON().enabled;
      await route.fulfill({
        json: {
          configured: true,
          settings: {
            owner: 'user:automation-test',
            enabled,
            optionalThird: true,
            activatedAt: Date.now(),
          },
          runs: [],
          aiCallsToday: 0,
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
  });
  await page.goto('/video-studio/automation');
  await expect(page.getByRole('heading', { name: 'Automatic generation is paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Enable automatic generation' }).click();
  await expect(page.getByRole('heading', { name: 'Automatic generation is on' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate next video now' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Wait five hours' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause new videos' }).click();
  await expect(page.getByRole('heading', { name: 'Automatic generation is paused' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate next video now' })).toBeDisabled();
  await page.goto('/ar/video-studio/automation');
  await expect(
    page.getByRole('heading', { name: 'فيديوهات القرآن التلقائية', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'تفعيل التوليد التلقائي' })).toBeVisible();
});

test('automation page does not fetch private history for a guest', async ({ page }) => {
  let reads = 0;
  await page.route('**/fonts/**', (route) => route.abort());
  await page.route('**/api/video-studio/**', async (route) => {
    if (route.request().url().endsWith('/automation')) reads += 1;
    await route.fulfill({
      json: { scope: 'guest:test', registered: false, canAutomate: false, quota: {} },
    });
  });
  await page.goto('/video-studio/automation');
  await expect(
    page.getByText(
      'This page is available only to the configured Tilawa account. Sign in with that account.',
    ),
  ).toBeVisible();
  expect(reads).toBe(0);
  await expect(page.getByRole('button', { name: 'Enable automatic generation' })).toHaveCount(0);
});
