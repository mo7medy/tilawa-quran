import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, Page, test } from '@playwright/test';
import baseline from './fixtures/qpc_uthmani_hafs.json';
import assetPaths from './fixtures/asset-paths.json';

const setup = async (page: Page, registered = true): Promise<void> => {
  let saved: Record<string, unknown>[] = [];
  // Sparse local checkouts omit interface fonts. Serve available tracked proof bytes without
  // triggering Next's catch-all 404 compilation and development reloads during scene assertions.
  await page.route('**/fonts/**', async (route) => {
    const source = new URL(route.request().url()).pathname;
    const hash = Object.keys(assetPaths).find((key) => assetPaths[key] === source);
    if (!hash) {
      await route.abort();
      return;
    }
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(path.join('public', source));
    } catch {
      bytes = await fs.readFile(path.join('.local-runtime/studio-proof-assets/blobs', hash));
    }
    await route.fulfill({
      body: bytes,
      contentType: source.endsWith('.ttf') ? 'font/ttf' : 'font/woff2',
    });
  });
  await page.route('**/api/video-studio/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.split('/api/video-studio/')[1];
    if (endpoint.startsWith('assets/')) {
      const hash = endpoint.split('/')[1];
      const source = assetPaths[hash];
      if (!source) {
        await route.fulfill({ status: 404 });
        return;
      }
      let bytes: Buffer;
      try {
        bytes = await fs.readFile(path.join('public', source));
      } catch {
        bytes = await fs.readFile(path.join('.local-runtime/studio-proof-assets/blobs', hash));
      }
      await route.fulfill({
        body: bytes,
        contentType: source.endsWith('.ttf') ? 'font/ttf' : 'font/woff2',
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
      return;
    }
    let body: unknown = {};
    if (endpoint === 'session')
      body = {
        scope: registered ? 'user:test-account' : 'guest:test-browser',
        registered,
        quota: {
          remaining: registered ? 10 : 2,
          limit: registered ? 10 : 2,
          maxDurationMs: registered ? 180000 : 60000,
          storageBytes: 0,
          storageLimit: registered ? 1073741824 : 104857600,
          resetAt: Date.now() + 3600000,
          available: true,
        },
      };
    else if (endpoint.startsWith('catalog'))
      body = {
        enabled: true,
        turnstileSiteKey: '',
        chapters: [
          { id: 1, name: 'Al-Fatihah', count: 7 },
          { id: 2, name: 'Al-Baqarah', count: 286 },
        ],
        reciters: [{ id: 7, name: 'Mishary Rashid Alafasy' }],
        translations: [{ id: 20, name: 'Saheeh International', language: 'English' }],
        backgrounds: [{ id: 'sea', url: '' }],
      };
    else if (endpoint === 'resolve') {
      const { spec } = request.postDataJSON();
      const manifest = JSON.parse(
        await fs.readFile(`tests/video-studio/fixtures/${spec.font}.json`, 'utf8'),
      );
      manifest.spec = spec;
      body = { manifest, hash: `preview-${spec.font}-${spec.fontSize}-${spec.template}` };
    } else if (endpoint === 'projects' && request.method() === 'POST') {
      const project = {
        id: crypto.randomUUID(),
        spec: request.postDataJSON().spec,
        revision: 1,
        expiresAt: Date.now() + 86400000,
        updatedAt: Date.now(),
      };
      saved.push(project);
      body = project;
    } else if (endpoint === 'projects') body = saved;
    else if (endpoint === 'jobs') body = [];
    else {
      await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
      return;
    }
    await route.fulfill({ json: body });
  });
};

for (const lang of ['en', 'ar'])
  for (const width of [375, 768, 1024, 1440]) {
    test(`${lang} studio at ${width}px supports keyboard labels and fits the viewport`, async ({
      page,
    }) => {
      await setup(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: width === 375 || width === 1024 ? 'dark' : 'light' });
      await page.goto(`${lang === 'ar' ? '/ar' : ''}/video-studio`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: lang === 'ar' ? 'أنشئ فيديو قرآنيًا' : 'Create a Quran video',
        }),
      ).toBeVisible();
      await expect(
        page.getByLabel(lang === 'ar' ? 'عنوان المشروع' : 'Project title', { exact: true }),
      ).toBeVisible();
      await page
        .getByLabel(lang === 'ar' ? 'عنوان المشروع' : 'Project title', { exact: true })
        .fill('My saved recitation');
      await page
        .getByRole('button', { name: lang === 'ar' ? 'حفظ المشروع' : 'Save project', exact: true })
        .click();
      await expect(
        page.getByRole('button', {
          name: lang === 'ar' ? 'تم حفظ المشروع' : 'Project saved',
          exact: true,
        }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow).toBe(false);
      await page.screenshot({ path: `.local-runtime/studio-${lang}-${width}.png`, fullPage: true });
    });
  }

test('the actual QPC scene loads its verified font bytes and invalidates on editing', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/video-studio');
  await page.getByLabel('Last ayah', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
  await expect(page.locator('[data-studio-text]').first()).toContainText(
    baseline.verses[0].words[0].text,
  );
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
  await page.getByLabel('Project title', { exact: true }).fill('Changed specification');
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
});

test('guest exports stay gated without a valid challenge and library links preserve Arabic', async ({
  page,
}) => {
  await setup(page, false);
  await page.goto('/ar/video-studio');
  await expect(page.getByText('متبقٍ 2 من 2 فيديوهات يومية')).toBeVisible();
  await expect(page.getByRole('button', { name: 'توليد الفيديو', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'مكتبة الفيديو الخاصة بي', exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/video-studio\/library/);
});

test('200 percent zoom keeps the content controls operable', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/ar/video-studio');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expect(page.getByLabel('عنوان المشروع', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
});

for (const font of ['code_v1', 'code_v2', 'text_indopak', 'tajweed_v4']) {
  test(`the shared scene loads ${font} without a font fallback`, async ({ page }) => {
    await setup(page);
    await page.goto('/video-studio');
    await page.locator('summary').filter({ hasText: 'Quran font' }).click();
    await page.getByLabel('Script and font').selectOption(font);
    await page.getByLabel('Last ayah', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
    await expect(page.locator('[data-studio-text]').first()).toBeVisible();
  });
}

test('overflow in any ayah prevents generation', async ({ page }) => {
  await setup(page);
  await page.goto('/video-studio');
  await page.route('**/api/video-studio/resolve', async (route) => {
    const manifest = structuredClone(baseline);
    manifest.verses[1].translation = 'A translation that cannot fit. '.repeat(600);
    await route.fulfill({ json: { manifest, hash: 'overflow-fixture' } });
  });
  await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'An ayah or translation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
});
