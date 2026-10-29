/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/naming-convention, no-restricted-syntax, no-await-in-loop, no-loop-func -- Browser-only fixture uses the existing esbuild toolchain and sequential viewport assertions. */
import path from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import * as sass from 'sass';

import type { StudioAdminState } from '../../src/features/video-studio/multiPublishing';

let script = '';
let css = '';
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});
// Browser component fixture only: no test route or authentication bypass is added to the website.
test.beforeAll(async () => {
  const root = process.cwd();
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Admin from './src/features/video-studio/components/AdminVideoStudio';createRoot(document.getElementById('root')).render(<Admin/>);`,
      resolveDir: root,
      loader: 'tsx',
    },
    outfile: 'admin-fixture.js',
    jsx: 'automatic',
    bundle: true,
    write: false,
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [
      {
        name: 'isolated-admin-fixture',
        setup(builder) {
          builder.onResolve({ filter: /^@\/components\/Account\/useAccountUi$/ }, () => ({
            path: 'account',
            namespace: 'fixture',
          }));
          builder.onResolve({ filter: /^next-translate\/useTranslation$/ }, () => ({
            path: 'translations',
            namespace: 'fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            resolveDir: root,
            contents:
              args.path === 'account'
                ? "export const useAccountUi=()=>({userId:'browser-admin'});"
                : `import en from ${JSON.stringify(
                    path.join(root, 'locales/en/video-studio.json'),
                  )};import ar from ${JSON.stringify(
                    path.join(root, 'locales/ar/video-studio.json'),
                  )};export default ()=>{const lang=document.documentElement.lang;const data=lang==='ar'?ar:en;return {lang,t:(key,values={},options={})=>{const value=key.split('.').reduce((v,k)=>v?.[k],data);return String(value??options.fallback??key).replace(/{{(.*?)}}/g,(_,k)=>values[k]??'');}}};`,
            loader: 'js',
          }));
          builder.onLoad({ filter: /\.module\.scss$/ }, (args) => ({
            contents: sass.compile(args.path).css,
            loader: 'local-css',
          }));
        },
      },
    ],
  });
  script = result.outputFiles.find((file) => file.path.endsWith('.js')).text;
  css = result.outputFiles.find((file) => file.path.endsWith('.css')).text;
});

const fixture = (): StudioAdminState => ({
  active: true,
  maintenance: false,
  enabled: true,
  day: '2026-10-29',
  mode: 'independent',
  nextMode: 'independent',
  effectiveDay: '2026-10-30',
  connections: [
    {
      id: 'connection',
      name: 'Primary Buffer',
      accountId: 'buffer-account',
      disconnected: false,
      cooldownUntil: 0,
      callsToday: 5,
    },
  ],
  destinations: [
    {
      id: 'destination',
      connectionId: 'connection',
      channelId: 'channel',
      platform: 'tiktok',
      name: 'Tilawa TikTok',
      eligible: true,
      paused: false,
      disconnected: false,
      dailyCount: 3,
      nextCount: 3,
      effectiveDay: '2026-10-30',
      nextAt: Date.parse('2026-10-30T07:00:00Z'),
      required: 3,
      generated: 2,
      pending: 1,
      published: 1,
      failed: 0,
    },
  ],
  publications: [],
  runs: [],
  usage: {
    renders: 2,
    renderLimit: 30,
    storageBytes: 20000,
    storageLimit: 10737418240,
    aiCalls: 2,
    aiLimit: 60,
  },
  audit: [],
});

for (const locale of ['en', 'ar']) {
  test(`administrator can save each account count and stop immediately (${locale})`, async ({
    page,
  }) => {
    const state = fixture();
    const mutations: unknown[] = [];
    await page.route('**/api/video-studio/**', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        mutations.push(body);
        state.destinations[0].nextCount = body.dailyCount;
        if (body.dailyCount === 0) {
          state.destinations[0].paused = true;
          state.destinations[0].dailyCount = 0;
        }
        await route.fulfill({ json: { ok: true } });
        return;
      }
      await route.fulfill({ json: state });
    });
    await page.route('**/__studio-admin-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="${locale}" dir="${
          locale === 'ar' ? 'rtl' : 'ltr'
        }"><head><style>body{margin:16px;font-family:Arial;--tilawa-bg:#0c111a;--tilawa-card:#151c28;--tilawa-border:#607286;--tilawa-ink:#eef3f8;--tilawa-link:#77ded2;--tilawa-error:#ffb4ab;background:var(--tilawa-bg)}*{box-sizing:border-box}${css}</style></head><body><main id="root"></main></body></html>`,
      }),
    );
    await page.goto('https://studio.example.test/__studio-admin-fixture');
    await page.addScriptTag({ content: script });
    const count = page.locator('#count-destination');
    await expect(count).toHaveValue('3');
    await count.selectOption('2');
    await count.press('Tab');
    await page.keyboard.press('Enter');
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: locale === 'ar' ? 'حُفظ العدد الجديد' : 'Saved. The new daily count' }),
    ).toBeVisible();
    expect(mutations).toContainEqual({ dailyCount: 2 });
    await page
      .getByRole('button', {
        name: locale === 'ar' ? 'إيقاف هذا الحساب فورًا' : 'Stop this account now',
        exact: true,
      })
      .click();
    await expect(count).toHaveValue('0');
    expect(mutations).toContainEqual({ dailyCount: 0 });
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 768, height: 900 });
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await expect(count).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('connection form hides and clears the API key and reports duplicate Buffer identity', async ({
  page,
}) => {
  const state = fixture();
  let writes = 0;
  await page.route('**/api/video-studio/**', async (route) => {
    if (route.request().method() === 'POST') {
      writes += 1;
      await route.fulfill({ status: 409, json: { error: { code: 'BUFFER_DUPLICATE' } } });
      return;
    }
    await route.fulfill({ json: state });
  });
  await page.route('**/__studio-admin-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html lang="en"><head><style>${css}</style></head><body><main id="root"></main></body></html>`,
    }),
  );
  await page.goto('https://studio.example.test/__studio-admin-fixture');
  await page.addScriptTag({ content: script });
  await page.locator('#buffer-name').fill('Second Buffer');
  await page.locator('#buffer-token').fill('fake-test-key-not-a-secret');
  await expect(page.locator('#buffer-token')).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Verify and save' }).click();
  await expect(page.getByRole('alert')).toContainText('already connected');
  await expect(page.locator('#buffer-token')).toHaveValue('');
  expect(writes).toBe(1);
});
