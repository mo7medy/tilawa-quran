import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  webServer: process.env.CI
    ? {
        command: 'yarn dev --port 3001',
        url: 'http://localhost:3001/video-studio',
        timeout: 180000,
        reuseExistingServer: false,
      }
    : undefined,
  use: {
    baseURL: process.env.STUDIO_TEST_URL ?? 'http://localhost:3001',
    headless: true,
    channel: process.env.CI ? undefined : 'chrome',
    screenshot: 'only-on-failure',
  },
});
