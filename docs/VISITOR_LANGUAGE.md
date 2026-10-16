# Visitor language

Cloudflare uses the incoming Worker's `request.cf.country` to select the language of an unprefixed
page URL. No GPS prompt, external geolocation service, additional package, or account secret is
used.

Order of precedence:

1. An explicit language URL such as `/ar/quran` or `/en/teachers`.
2. The visitor's supported `NEXT_LOCALE` cookie, saved by the shared language picker.
3. The country mapping in `src/tilawa/visitorLocale.ts`.
4. English when the country is unavailable or its language is not supported.

Academy copy is currently available in Arabic and English; other selected languages retain the
reader's translations and use English academy copy.

The `cloudflare-worker.js` entry point wraps the generated OpenNext Worker and preserves its
exports. Geo redirects use temporary 307 responses with `Cache-Control: private, no-store`. They do
not change API, asset, authentication callback or non-GET/HEAD requests. Next.js browser-language
auto detection is disabled to avoid conflicting redirects.

Local `next dev` has no Cloudflare country metadata. Country behavior is covered by local request
tests; the complete Worker deployment should be validated on Cloudflare. Do not add fake country
headers in production or infer physical location from browser geolocation.
