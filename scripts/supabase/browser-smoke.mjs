import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

/** Real cookies, local website, and temporary real database users; no saved credentials. */
export const browserSmoke = async ({ student, teacher, owner, assert }) => {
  const base = 'http://127.0.0.1:3000';
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const contexts = [];
  const login = async (person) => {
    const context = await browser.newContext({ locale: 'en-US' });
    contexts.push(context);
    await context.route(/\.(?:woff2?|ttf)(?:\?|$)/, (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(`${base}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"]').fill(person.email);
    await page.locator('input[name="password"]').fill(person.password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/profile(?:\?|$)/, { timeout: 60000 });
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    return { context, page };
  };
  try {
    const anon = await browser.newContext();
    contexts.push(anon);
    const response = await anon.request.get(`${base}/profile`, { maxRedirects: 0 });
    assert(
      response.status() === 307 && response.headers().location.includes('sign-in'),
      'server redirects unauthenticated private pages',
    );
    const learner = await login(student);
    assert(
      (await learner.context.request.get(`${base}/api/tilawa/v1/account`)).status() === 200,
      'email login establishes server-readable session cookies',
    );
    assert(
      (await learner.context.request.get(`${base}/api/tilawa/v1/admin`)).status() === 403,
      'student admin API denied',
    );
    assert(
      (
        await learner.context.request.post(`${base}/api/tilawa/v1/command`, {
          data: { action: 'student', payload: {}, requestKey: crypto.randomUUID() },
        })
      ).status() === 403,
      'mutation without same-site Origin denied',
    );
    await learner.page.locator('input[name="name"]').fill('[TEST] Browser learner');
    await learner.page.locator('input[name="country"]').fill('Canada');
    await learner.page.locator('input[name="birthDate"]').fill('2012-01-01');
    await learner.page.locator('input[name="schedule"]').fill('Evenings');
    await learner.page.locator('textarea[name="goal"]').fill('Arabic reading');
    await learner.page
      .locator('form')
      .filter({ has: learner.page.locator('input[name="name"]') })
      .locator('button[type="submit"]')
      .click();
    await learner.page.getByRole('status').filter({ hasText: 'saved successfully' }).waitFor();
    const saved = await (await learner.context.request.get(`${base}/api/tilawa/v1/account`)).json();
    assert(
      saved.data.profile.display_name === '[TEST] Browser learner',
      'profile form persists real data',
    );
    const mismatch = await learner.context.request.get(`${base}/api/tilawa/v1/account`, {
      headers: { 'X-Tilawa-User': teacher.id },
    });
    assert(mismatch.status() === 409, 'stale requests cannot switch to another account');
    const pins = await (
      await learner.context.request.get(`${base}/api/tilawa/v1/quran/pinned-items?targetType=ayah`)
    ).json();
    assert(Array.isArray(pins.data?.data), 'pinned items match reader response contract');
    const marks = await (
      await learner.context.request.get(
        `${base}/api/tilawa/v1/quran/bookmarks/ayahs-range?mushafId=1&chapterNumber=22&verseNumber=1&perPage=20`,
      )
    ).json();
    assert(marks['22:1']?.key === 22, 'reader range returns verse-key bookmark map');
    const count = await (
      await learner.context.request.get(
        `${base}/api/tilawa/v1/quran/notes/count-within-range?from=22:1&to=22:3`,
      )
    ).json();
    assert(
      count['22:1'] === 1 && count['22:3'] === 1,
      'private note counts match per-verse reader contract',
    );
    const collections = await (
      await learner.context.request.get(`${base}/api/tilawa/v1/quran/collections/all?mushafId=1`)
    ).json();
    assert(
      Array.isArray(collections.data?.bookmarks) && collections.data.isOwner === true,
      'collections match nested reader pagination contract',
    );
    const week = await (
      await learner.context.request.get(
        `${base}/api/tilawa/v1/quran/goal/estimate?type=QURAN_TIME&amount=600&duration=5`,
      )
    ).json();
    assert(
      week.data.week.length === 5 && week.data.week[0].amount === 120,
      'goal week uses actual requested target and duration',
    );
    for (const path of [
      '/profile/learning',
      '/profile/lessons',
      '/profile/teachers',
      '/profile/packages',
      '/profile/messages',
      '/profile/notifications',
    ]) {
      const result = await learner.page.goto(base + path, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
      await learner.page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
      assert(
        result.status() === 200 &&
          !(await learner.page
            .locator('nextjs-portal')
            .getByText(/Runtime Error|Build Error/)
            .count()),
        `student page ${path}`,
      );
    }
    const tutor = await login(teacher);
    for (const path of [
      '/profile/teacher',
      '/profile/teacher/preview',
      '/dashboard/teacher',
      '/dashboard/teacher/requests',
      '/dashboard/teacher/lessons',
      '/dashboard/teacher/availability',
      '/dashboard/teacher/students',
      '/dashboard/teacher/reviews',
      '/dashboard/teacher/coupons',
      '/dashboard/teacher/earnings',
      '/dashboard/teacher/withdrawals',
    ]) {
      const result = await tutor.page.goto(base + path, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
      await tutor.page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
      assert(
        result.status() === 200 &&
          !(await tutor.page
            .locator('nextjs-portal')
            .getByText(/Runtime Error|Build Error/)
            .count()),
        `teacher page ${path}`,
      );
    }
    await mkdir('.local-runtime/backend-screens', { recursive: true });
    for (const locale of ['en', 'ar']) {
      await learner.page.goto(base + (locale === 'ar' ? '/ar' : '') + '/profile', {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
      await learner.page.locator('input[name="name"]').waitFor();
      for (const theme of ['light', 'dark']) {
        await learner.page.evaluate(
          (value) =>
            window.dispatchEvent(new CustomEvent('tilawa-theme-change', { detail: value })),
          theme,
        );
        for (const width of [360, 390, 768, 1024, 1440]) {
          await learner.page.setViewportSize({ width, height: 900 });
          assert(
            await learner.page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${locale} ${theme} layout fits ${width}px`,
          );
        }
        await learner.page.setViewportSize({ width: 390, height: 900 });
        await learner.page.screenshot({
          path: `.local-runtime/backend-screens/student-${locale}-${theme}.png`,
          fullPage: true,
        });
      }
    }
    const administrator = await login(owner);
    const adminPage = await administrator.page.goto(`${base}/admin/teachers`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    assert(
      adminPage.status() === 200,
      'admin teacher approval page available to trusted membership',
    );
    await learner.page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
    await learner.page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await learner.page.waitForURL(/sign-in/);
    assert(
      (await learner.context.request.get(`${base}/api/tilawa/v1/account`)).status() === 401,
      'logout invalidates private API access',
    );
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
};
