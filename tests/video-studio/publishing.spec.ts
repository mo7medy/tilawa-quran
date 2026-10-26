import { expect, test } from '@playwright/test';

test('Buffer connection requires explicit account selection and publishing enablement', async ({
  page,
}) => {
  let connection: { channelName: string; enabled: boolean } | null = null;
  const tiktok = page.getByRole('region', { name: 'Publish to TikTok', exact: true });
  const fakeKey = 'browser-test-key-only';
  await page.route('**/fonts/**', (route) => route.abort());
  await page.route('**/api/video-studio/**', async (route) => {
    const request = route.request();
    const parsed = new URL(request.url());
    const endpoint = parsed.pathname.split('/api/video-studio/')[1];
    if (parsed.searchParams.get('platform') === 'instagram') {
      await route.fulfill({ json: { connection: null, publications: [], canReuseToken: true } });
      return;
    }
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
      await route.fulfill({ json: { connection, publications: [], canReuseToken: false } });
    } else if (endpoint === 'publishing') {
      if (request.method() === 'PUT') connection.enabled = request.postDataJSON().enabled;
      if (request.method() === 'DELETE') connection = null;
      await route.fulfill({ json: { connection, publications: [], canReuseToken: false } });
    } else await route.fulfill({ status: 404, json: {} });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/video-studio/automation');
  await tiktok.getByLabel('Buffer API key', { exact: true }).fill(fakeKey);
  await expect(tiktok.getByLabel('Buffer API key', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await tiktok.getByRole('button', { name: 'Check accounts' }).click();
  await expect(page.getByLabel('TikTok account', { exact: true })).toHaveValue('eligible');
  await expect(page.getByRole('option', { name: /Reminders only/ })).toHaveAttribute(
    'disabled',
    '',
  );
  await tiktok.getByRole('button', { name: 'Save connection' }).click();
  expect(connection.enabled).toBe(false);
  await expect(tiktok.getByLabel('Buffer API key', { exact: true })).toHaveCount(0);
  await tiktok.getByRole('button', { name: 'Enable automatic TikTok publishing' }).click();
  await expect(
    page.getByText('Automatic publishing enabled: My TikTok', { exact: true }),
  ).toBeVisible();
  await tiktok.getByRole('button', { name: 'Pause publishing', exact: true }).click();
  await expect(
    page.getByText('Connected, publishing paused: My TikTok', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/ar/video-studio/automation');
  await expect(page.getByRole('heading', { name: 'النشر إلى TikTok', exact: true })).toBeVisible();
  await page
    .getByRole('region', { name: 'النشر إلى TikTok', exact: true })
    .getByRole('button', { name: 'فصل Buffer', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'النشر إلى TikTok', exact: true })
      .getByLabel('مفتاح Buffer API', { exact: true }),
  ).toHaveValue('');
});

test('Instagram reuses the saved Buffer connection and pauses independently of TikTok', async ({
  page,
}) => {
  const connections = {
    tiktok: { channelName: 'My TikTok', enabled: true },
    instagram: null as { channelName: string; enabled: boolean } | null,
  };
  await page.route('**/fonts/**', (route) => route.abort());
  await page.route('**/api/video-studio/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const endpoint = url.pathname.split('/api/video-studio/')[1];
    const platform = url.searchParams.get('platform') === 'instagram' ? 'instagram' : 'tiktok';
    if (endpoint === 'session')
      return route.fulfill({
        json: { scope: 'user:test', registered: true, canAutomate: true, quota: {} },
      });
    if (endpoint === 'automation')
      return route.fulfill({
        json: { configured: true, settings: { enabled: true }, runs: [], aiCallsToday: 0 },
      });
    if (endpoint === 'publishing/probe') {
      expect(platform).toBe('instagram');
      expect(req.postDataJSON()).toEqual({});
      return route.fulfill({
        json: {
          channels: [
            { id: 'ig1', name: 'My Instagram', platform: 'instagram', eligible: true },
            { id: 'personal', name: 'Personal reminders', platform: 'instagram', eligible: false },
          ],
        },
      });
    }
    if (endpoint === 'publishing/connect') {
      expect(req.postDataJSON()).toEqual({ channelId: 'ig1' });
      connections.instagram = { channelName: 'My Instagram', enabled: false };
    } else if (endpoint === 'publishing') {
      if (req.method() === 'PUT') connections[platform].enabled = req.postDataJSON().enabled;
      if (req.method() === 'DELETE') connections[platform] = null;
    } else return route.fulfill({ status: 404, json: {} });
    return route.fulfill({
      json: { connection: connections[platform], canReuseToken: true, publications: [] },
    });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/video-studio/automation');
  const instagram = page.getByRole('region', { name: 'Publish to Instagram Reels', exact: true });
  const tiktok = page.getByRole('region', { name: 'Publish to TikTok', exact: true });
  await expect(instagram.getByLabel('Buffer API key', { exact: true })).toHaveCount(0);
  await instagram.getByRole('button', { name: 'Check accounts' }).click();
  await expect(instagram.getByLabel('Instagram account', { exact: true })).toHaveValue('ig1');
  await expect(instagram.getByRole('option', { name: /Personal reminders/ })).toHaveAttribute(
    'disabled',
    '',
  );
  await instagram.getByRole('button', { name: 'Save connection' }).click();
  await expect(instagram.getByText('Connected, publishing paused: My Instagram')).toBeVisible();
  await instagram.getByRole('button', { name: 'Enable automatic Instagram publishing' }).click();
  await expect(instagram.getByText('Automatic publishing enabled: My Instagram')).toBeVisible();
  await instagram.getByRole('button', { name: 'Pause publishing', exact: true }).click();
  await expect(tiktok.getByText('Automatic publishing enabled: My TikTok')).toBeVisible();
  expect(connections.tiktok.enabled).toBe(true);
  expect(connections.instagram.enabled).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/ar/video-studio/automation');
  await expect(
    page.getByRole('heading', { name: 'النشر إلى Instagram Reels', exact: true }),
  ).toBeVisible();
});
