const config = require('./i18n.json');

const isDictionary = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Keep translated reader copy while filling new Tilawa keys from English.
const mergeMessages = (fallback, translated) => {
  const result = { ...fallback };
  Object.entries(translated).forEach(([key, value]) => {
    result[key] =
      isDictionary(value) && isDictionary(result[key]) ? mergeMessages(result[key], value) : value;
  });
  return result;
};

module.exports = {
  ...config,
  loadLocaleFrom: async (locale, namespace) => {
    // Academy copy exists in English and Arabic. Reader locales stay intact.
    const contentLocale =
      ['academy', 'account'].includes(namespace) && locale !== 'ar' ? 'en' : locale;
    const translated = await import(`./locales/${contentLocale}/${namespace}.json`).then(
      (module) => module.default,
    );
    if (namespace !== 'common' || contentLocale === config.defaultLocale) return translated;
    const fallback = await import('./locales/en/common.json').then((module) => module.default);
    return mergeMessages(fallback, translated);
  },
};
