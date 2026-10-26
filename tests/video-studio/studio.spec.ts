import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, Page, Route, test } from '@playwright/test';
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

test('guest exports require a ready preview and library links preserve Arabic', async ({
  page,
}) => {
  await setup(page, false);
  await page.goto('/ar/video-studio');
  await expect(page.getByText('متبقٍ 2 من 2 فيديوهات يومية')).toBeVisible();
  await expect(page.getByRole('button', { name: 'توليد الفيديو', exact: true })).toBeDisabled();
  await page.getByLabel('إلى الآية', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'تحضير المعاينة', exact: true }).click();
  await expect(page.getByRole('button', { name: 'توليد الفيديو', exact: true })).toBeEnabled();
  await expect(page.locator('script[src*="challenges.cloudflare.com/turnstile"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'مكتبة الفيديو الخاصة بي', exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/video-studio\/library/);
});

test('focus refresh failures preserve unsaved settings and the prepared preview', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/video-studio');
  await page.getByLabel('Project title', { exact: true }).fill('Keep my video settings');
  await page.getByLabel('Last ayah', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
  const failRefresh = async (route: Route): Promise<void> => {
    await route.fulfill({ status: 503, json: { error: { code: 'NETWORK_ERROR' } } });
  };
  await page.route('**/api/video-studio/session', failRefresh);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const refreshError = page.getByRole('alert').filter({ hasText: 'Connection interrupted.' });
  await expect(refreshError).toBeVisible();
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue(
    'Keep my video settings',
  );
  await expect(page.getByLabel('Last ayah', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
  await page.unroute('**/api/video-studio/session', failRefresh);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(refreshError).toHaveCount(0);
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue(
    'Keep my video settings',
  );
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
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

for (const [ratio, width, height] of [
  ['portrait', 1080, 1920],
  ['square', 1080, 1080],
  ['landscape', 1920, 1080],
] as const) {
  test(`translation template keeps the text group centered for ${ratio}`, async ({ page }) => {
    await setup(page);
    await page.goto('/video-studio');
    await page.route('**/api/video-studio/resolve', async (route) => {
      const manifest = structuredClone(baseline);
      Object.assign(manifest, { width, height });
      Object.assign(manifest.spec, {
        ...route.request().postDataJSON().spec,
        template: 'translation',
        ratio,
      });
      await route.fulfill({ json: { manifest, hash: `centered-${ratio}` } });
    });
    await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
    const scene = await page.locator('[data-studio-scene]').boundingBox();
    const text = await page.locator('[data-studio-text]').first().boundingBox();
    expect(Math.abs(text.y + text.height / 2 - scene.y - scene.height / 2)).toBeLessThan(2);
    expect(Math.abs(text.x + text.width / 2 - scene.x - scene.width / 2)).toBeLessThan(2);
    const quran = await page.locator('[data-studio-quran]').first().boundingBox();
    const translation = await page.locator('[data-studio-translation]').first().boundingBox();
    expect(quran.y).toBeGreaterThan(scene.y + scene.height * 0.2);
    expect(translation.y + translation.height).toBeLessThan(scene.y + scene.height * 0.8);
    await page
      .locator('[data-studio-scene]')
      .screenshot({ path: `.local-runtime/centered-${ratio}.png` });
  });
}

test('the preview crossfades on seek and refuses a missing future background', async ({ page }) => {
  await setup(page);
  await page.goto('/video-studio');
  let missing = false;
  const image = (color: string): string =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="200"><rect width="120" height="200" fill="${color}"/></svg>`,
    )}`;
  await page.route('**/api/video-studio/resolve', async (route) => {
    const manifest = structuredClone(baseline);
    manifest.spec = {
      ...route.request().postDataJSON().spec,
      background: { ...baseline.spec.background, animate: true },
    };
    manifest.durationMs = 20000;
    manifest.background = {
      type: 'image',
      url: image('#24504d'),
      slides: [
        { url: image('#24504d') },
        { url: missing ? 'data:image/png,invalid' : image('#28446d') },
      ],
    };
    await route.fulfill({ json: { manifest, hash: missing ? 'missing-image' : 'crossfade' } });
  });
  await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeEnabled();
  const scene = page.locator('[data-studio-scene]');
  await scene.hover();
  const box = await scene.boundingBox();
  await page.mouse.click(box.x + box.width * 0.53, box.y + box.height - 16);
  await expect(page.locator('[data-studio-background]')).toHaveCount(2);
  const incoming = page.locator('[data-studio-background="1"]');
  const opacity = await incoming.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await scene.screenshot({ path: '.local-runtime/soft-background-crossfade.png' });
  missing = true;
  await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert')).toBeVisible();
});
