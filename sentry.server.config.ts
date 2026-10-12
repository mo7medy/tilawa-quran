// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENABLED = process.env.NEXT_PUBLIC_SERVER_SENTRY_ENABLED === 'true';
const isDev = process.env.NODE_ENV === 'development';
const version = `quran.com-frontend-next@${process.env.NEXT_PUBLIC_APP_VERSION}`;
const integrations = [];

// Keep the native addon out of the dependency graph emitted for Workers.
if (process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET !== 'cloudflare') {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { nodeProfilingIntegration } =
    require('@sentry/profiling-node') as typeof import('@sentry/profiling-node');
  integrations.push(nodeProfilingIntegration());
}

Sentry.init({
  enabled: SENTRY_ENABLED,
  dsn: SENTRY_ENABLED ? SENTRY_DSN : null,
  sendDefaultPii: true,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: isDev ? 1 : 0.1,
  profileSessionSampleRate: isDev ? 1 : 0.001,
  profileLifecycle: 'trace',
  replaysOnErrorSampleRate: isDev ? 1 : 0.1,
  debug: isDev,
  release: version,
  integrations,
});
