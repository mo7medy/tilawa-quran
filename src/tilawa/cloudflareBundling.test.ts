// @vitest-environment node
import { createRequire } from 'module';

import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { makeExternalHandler } from 'next/dist/build/handle-externals';
import loadConfig from 'next/dist/server/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const resolveModule = createRequire(import.meta.url);
const getResolve =
  () =>
  async (context: string, request: string): Promise<[string, boolean]> =>
    [resolveModule.resolve(request, { paths: [context] }), false];

describe('Cloudflare Pages Router translation bundling', () => {
  let config: Awaited<ReturnType<typeof loadConfig>>;

  beforeAll(async () => {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_TARGET', 'cloudflare');
    config = await loadConfig(PHASE_PRODUCTION_BUILD, process.cwd(), { silent: true });
  });

  afterAll(() => vi.unstubAllEnvs());

  it.each(['appWithI18n', 'I18nProvider', 'useTranslation', 'context'])(
    'bundles next-translate/%s with the page instead of a second router runtime',
    async (entry) => {
      const options = { config, optOutBundlingPackageRegex: /^$/, dir: process.cwd() };
      const withoutFix = makeExternalHandler({ ...options, transpiledPackages: [] });
      const withFix = makeExternalHandler({
        ...options,
        transpiledPackages: config.transpilePackages ?? [],
      });
      const request = `next-translate/${entry}`;
      expect(await withoutFix(process.cwd(), request, 'commonjs', null, getResolve)).toBe(
        `commonjs ${request}`,
      );
      expect(await withFix(process.cwd(), request, 'commonjs', null, getResolve)).toBeUndefined();
    },
  );
});
