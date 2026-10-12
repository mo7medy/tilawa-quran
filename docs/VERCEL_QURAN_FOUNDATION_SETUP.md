# Deploy this fork with Quran Foundation credentials

The original proxy initializes with `target: process.env.API_GATEWAY_URL`. Without that private
gateway configuration it crashes with `[HPM] Missing "target" option`. Successful builds do not test
this runtime connection. Reader pages can consequently return 404 when their on-demand data request
fails.

This fork can instead use the public Quran Foundation OAuth2 Content/Search APIs. It keeps
credentials on the server, caches tokens, retries a rejected token once, and uses the same client
for build-time and runtime reader data. No private gateway or original Quran.com signing credentials
are required for these read-only services.

## Exact Vercel settings

In **Project → Settings → Environment Variables**, add:

| Key                      | Value                                      | Type   |
| ------------------------ | ------------------------------------------ | ------ |
| `QURAN_CLIENT_ID`        | Your Quran Foundation Production Client ID | Config |
| `QURAN_CLIENT_SECRET`    | Your new Production Client Secret          | Secret |
| `QURAN_API_ENV`          | `production`                               | Config |
| `NEXT_PUBLIC_VERCEL_ENV` | `production`                               | Config |
| `NEXT_PUBLIC_VERCEL_URL` | `tilawa-quran.vercel.app` (no protocol)    | Config |

Select the **Production** environment for each. To test a Preview deployment, add the variables to
**Preview** too. `NEXT_PUBLIC_VERCEL_URL` can be omitted if you prefer Vercel's automatic hostname;
browser requests always use the current site's origin. Do not prefix credentials with
`NEXT_PUBLIC_`, commit them, or paste them in chat. Rotate any Client Secret that appeared in a
screenshot before using it.

In the Quran Foundation Developer Console, approve/request the `content` permission. Search also
requires `search`; its token is requested separately so a missing Search permission does not prevent
Quran reading. Production access must be approved for the Production credentials. For Prelive
testing, set `QURAN_API_ENV=prelive` and use Prelive credentials together; that dataset currently
only contains surahs 1 and 2.

Merge the fix into `production` and allow Vercel to build a new deployment. Changing environment
variables does not update an already deployed version.

## Verify after deployment

1. Open `/api/proxy/content/api/qdc/chapters?language=ar`: expect JSON with chapters.
2. Open `/api/proxy/content/api/qdc/pages/lookup?chapter_number=2&mushaf=19`.
3. Open `/1`, `/2`, `/ar/2`, `/page/2`, and `/juz/1`; switch Mushaf reading mode.
4. Open `/reciters` and test chapter audio.
5. Test search only after `search` permission is approved.

503 means configuration is missing. A token error means credentials, environment or scope approval
need correction. An upstream 401/403 indicates API authorization. Upstream errors and credentials
are not echoed to the browser.

## Scope and remaining services

This change adapts the reader's QDC paths to public `/content/api/v4` endpoints, including page
lookup, verse ranges, all-page pagination, chapter reciters and audio. An API feature's availability
still depends on the public endpoint and app permissions; this change is not proof that every
Quran.com feature is available to third-party apps. Accounts, personal bookmarks/collections,
learning programs, media generation and Quran Reflect require their own integrations and
permissions. Client Credentials does not sign a user in. Those routes return a configuration error
if no legacy gateway is configured, rather than crashing all content requests.

Deployments using the original signed gateway may keep `API_GATEWAY_URL` and its signing settings.
The legacy handler is loaded only when the gateway is configured.

References:

- https://api-docs.quran.com/docs/quickstart/
- https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/get-pages-lookup/
- https://vercel.com/docs/environment-variables
