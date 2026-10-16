import i18nConfig from '../../i18n.json';

const COUNTRIES_BY_LOCALE: Readonly<Record<string, readonly string[]>> = {
  ar: [
    'AE',
    'BH',
    'DZ',
    'EG',
    'IQ',
    'JO',
    'KW',
    'LB',
    'LY',
    'MA',
    'MR',
    'OM',
    'PS',
    'QA',
    'SA',
    'SD',
    'SO',
    'SY',
    'TN',
    'YE',
  ],
  bn: ['BD'],
  fa: ['IR', 'AF'],
  fr: [
    'FR',
    'MC',
    'SN',
    'CI',
    'BF',
    'ML',
    'NE',
    'BJ',
    'TG',
    'GN',
    'CD',
    'CG',
    'GA',
    'CM',
    'TD',
    'MG',
    'DJ',
    'KM',
    'RE',
    'MQ',
    'GP',
    'GF',
    'NC',
    'PF',
  ],
  id: ['ID'],
  it: ['IT', 'SM', 'VA'],
  nl: ['NL', 'BE', 'SR', 'AW', 'CW', 'SX'],
  pt: ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'],
  ru: ['RU', 'BY', 'KZ', 'KG'],
  sq: ['AL', 'XK'],
  th: ['TH'],
  tr: ['TR'],
  ur: ['PK'],
  zh: ['CN', 'TW', 'HK', 'MO'],
  ms: ['MY', 'BN'],
  es: [
    'ES',
    'MX',
    'AR',
    'BO',
    'CL',
    'CO',
    'CR',
    'CU',
    'DO',
    'EC',
    'GQ',
    'GT',
    'HN',
    'NI',
    'PA',
    'PE',
    'PR',
    'PY',
    'SV',
    'UY',
    'VE',
  ],
  sw: ['TZ', 'KE'],
  vi: ['VN'],
};

const SKIPPED_PREFIXES = [
  '/api',
  '/_next',
  '/fonts',
  '/icons',
  '/images',
  '/tilawa',
  '/auth',
  '/logout',
  '/reset-password',
  '/embed',
  '/.well-known',
];

/**
 * Select a supported site locale, keeping the visitor's manual choice ahead of country defaults.
 * @returns {string} supported locale; English for unknown or untranslated countries
 */
export const getVisitorLocale = (country?: string, savedLocale?: string): string => {
  if (savedLocale && i18nConfig.locales.includes(savedLocale)) return savedLocale;
  const normalizedCountry = country?.trim().toUpperCase() ?? '';
  return (
    Object.entries(COUNTRIES_BY_LOCALE).find(([, countries]) =>
      countries.includes(normalizedCountry),
    )?.[0] ?? i18nConfig.defaultLocale
  );
};

/**
 * Redirect only unprefixed page visits. Explicit language links, APIs and static assets stay intact.
 * @returns {URL | null} localized page URL, or null when the existing URL should be served
 */
export const getVisitorLocaleRedirect = (request: Request, country?: string): URL | null => {
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  const { pathname } = url;
  const hasExplicitLocale = i18nConfig.locales.includes(pathname.split('/')[1]);
  const isSkipped = SKIPPED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (hasExplicitLocale || isSkipped || /\.[^/]+$/.test(pathname)) return null;

  const savedLocale = request.headers
    .get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('NEXT_LOCALE='))
    ?.slice('NEXT_LOCALE='.length);
  const locale = getVisitorLocale(country, savedLocale);
  if (locale === i18nConfig.defaultLocale) return null;
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return url;
};
