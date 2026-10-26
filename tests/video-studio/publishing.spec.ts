import { expect, test } from '@playwright/test';

test('Buffer connection requires explicit account selection and publishing enablement', async ({
  page,
}) => {
  let connection: { channelName: string; enabled: boolean } | null = null;
  const fakeKey = 'browser-test-key-only';
  await page.route('**/fonts/**', (route) => route.abort());
  await page.route('**/api/video-studio/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname.split('/api/video-studio/')[1];
    if (endpoint === 'session') {
      await route.fulfill({
        json: { scope: 'user:test', registered: true, canAutomate: true, quota: {} },
      });
    } else if (endpoint === 'automation') {
      await route.fulfill({
        json: {
          configured: true,
          settings: { enabled: true, optionalThird: true },
          runs: [],
          aiCallsToday: 0,
        },
      });
    } else if (endpoint === 'publishing/probe') {
      expect(request.postDataJSON().token).toBe(fakeKey);
      await route.fulfill({
        json: {
          channels: [
            { id: 'eligible', name: 'My TikTok', organizationId: 'org', eligible: true },
            { id: 'reminder', name: 'Reminders only', organizationId: 'org', eligible: false },
          ],
        },
      });
    } else if (endpoint === 'publishing/connect') {
      expect(request.postDataJSON().channelId).toBe('eligible');
      connection = { channelName: 'My TikTok', enabled: false };
      await route.fulfill({ json: { connection, publications: [] } });
    } else if (endpoint === 'publishing') {
      if (request.method() === 'PUT') connection.enabled = request.postDataJSON().enabled;
      if (request.method() === 'DELETE') connection = null;
      await route.fulfill({ json: { connection, publications: [] } });
    } else await route.fulfill({ status: 404, json: {} });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/video-studio/automation');
  await page.getByLabel('Buffer API key', { exact: true }).fill(fakeKey);
  await expect(page.getByLabel('Buffer API key', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await page.getByRole('button', { name: 'Check accounts' }).click();
  await expect(page.getByLabel('TikTok account', { exact: true })).toHaveValue('eligible');
  await expect(page.getByRole('option', { name: /Reminders only/ })).toHaveAttribute(
    'disabled',
    '',
  );
  await page.getByRole('button', { name: 'Save connection' }).click();
  expect(connection.enabled).toBe(false);
  await expect(page.getByLabel('Buffer API key', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Enable automatic TikTok publishing' }).click();
  await expect(
    page.getByText('Automatic publishing enabled: My TikTok', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause publishing', exact: true }).click();
  await expect(
    page.getByText('Connected, publishing paused: My TikTok', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/ar/video-studio/automation');
  await expect(page.getByRole('heading', { name: 'النشر إلى TikTok', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'فصل Buffer', exact: true }).click();
  await expect(page.getByLabel('مفتاح Buffer API', { exact: true })).toHaveValue('');
});
